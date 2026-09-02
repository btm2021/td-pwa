/**
 * OANDA Datasource Config
 */
const OANDA_CONFIG = {
    id: 'OANDA',
    name: 'OANDA',
    description: 'OANDA Forex',
    exchange: 'OANDA',
    logo: 'image/iconexchange/oanda.svg',
    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
    type: 'forex',
    baseUrl: 'https://api-fxpractice.oanda.com/v3',
    streamUrl: 'https://stream-fxpractice.oanda.com/v3',
    logPrefix: '[OANDA]',
    blacklistPatterns: [],
    maxSearchResults: 400,
    searchSuffixes: ['.OA', '.OANDA'],
    // Common forex pairs
    forexPairs: [
        'XAU_USD', 'XAU_EUR', 'XAU_AUD', 'XAU_CAD', 'XAU_CHF', 'XAU_NZD', 'XAU_GBP', 'XAU_JPY',
        'EUR_USD', 'GBP_USD', 'USD_JPY', 'USD_CHF', 'AUD_USD', 'USD_CAD', 'NZD_USD',
        'EUR_GBP', 'EUR_JPY', 'GBP_JPY', 'EUR_CHF', 'AUD_JPY', 'GBP_CHF', 'EUR_AUD',
        'EUR_CAD', 'GBP_CAD', 'AUD_CAD', 'AUD_NZD', 'CAD_JPY', 'CHF_JPY', 'NZD_JPY',
        'GBP_AUD', 'GBP_NZD', 'EUR_NZD', 'AUD_CHF', 'NZD_CHF', 'CAD_CHF', 'NZD_CAD'
    ],
    // Common stock indices
    indexInstruments: []
};

/**
 * OANDA Datasource
 * Implementation cho OANDA Forex API
 * Xử lý gap ngày nghỉ (weekend, holidays)
 */
class OANDADatasource extends BaseDatasource {
    constructor(config = {}) {
        super(config);
        this.baseUrl = OANDA_CONFIG.baseUrl;
        this.streamUrl = OANDA_CONFIG.streamUrl;
        this.accountId = `101-004-27015242-001`; // Demo account
        this.apiKey = `7a53c4eeff879ba6118ddc416c2d2085-4a766a7d07af7bd629c07b451fe92984`; // API key nếu có
        this.barsCache = {}; // Cache để lưu bars
        this.inFlightRequests = new Map();
    }

    getInfo() {
        return OANDA_CONFIG;
    }

    canHandle(symbolName) {
        const upper = symbolName.toUpperCase();

        // Check prefix
        if (upper.startsWith('OANDA:') || upper.startsWith('OA:')) {
            return true;
        }

        // Check if it's a forex pair (6 characters, all letters)
        // Examples: EURUSD, GBPJPY, AUDUSD
        const cleanSymbol = upper.replace('OANDA:', '').replace('OA:', '');

        // Manual check against lists
        const allOandaSymbols = [...OANDA_CONFIG.forexPairs, ...OANDA_CONFIG.indexInstruments];

        // Try direct match with underscore
        if (allOandaSymbols.includes(cleanSymbol)) return true;

        // Try match without underscore
        const searchPair = cleanSymbol.includes('_') ? cleanSymbol : (cleanSymbol.length === 6 ? cleanSymbol.substring(0, 3) + '_' + cleanSymbol.substring(3) : cleanSymbol);
        if (allOandaSymbols.some(s => s.replace('_', '') === cleanSymbol)) return true;

        return false;
    }

    async fetchExchangeInfo() {
        try {
            const allInstruments = [...OANDA_CONFIG.forexPairs, ...OANDA_CONFIG.indexInstruments];
            return allInstruments
                .filter(pair => {
                    for (const pattern of OANDA_CONFIG.blacklistPatterns) {
                        if (pair.includes(pattern)) return false;
                    }
                    return true;
                })
                .map(pair => {
                    const parts = pair.split('_');
                    const base = parts[0];
                    const quote = parts[1] || '';
                    return {
                        symbol: pair.replace('_', ''),
                        oandaSymbol: pair,
                        baseCurrency: base,
                        quoteCurrency: quote
                    };
                });
        } catch (error) {
            console.error(`${OANDA_CONFIG.logPrefix} Error fetching instruments:`, error);
            return [];
        }
    }

    searchSymbols(userInput) {
        const allInstruments = [...OANDA_CONFIG.forexPairs, ...OANDA_CONFIG.indexInstruments];
        const symbols = allInstruments.map(pair => {
            const parts = pair.split('_');
            const base = parts[0];
            const quote = parts[1] || '';
            const type = OANDA_CONFIG.indexInstruments.includes(pair) ? 'index' : 'forex';

            return {
                symbol: pair.replace('_', ''),
                full_name: `OANDA:${pair.replace('_', '')}`,
                description: type === 'index' ? `${base} Index` : `${base} / ${quote}`,
                exchange: OANDA_CONFIG.exchange,
                type: type,
                baseCurrency: base,
                quoteCurrency: quote,
                logo_urls: [OANDA_CONFIG.logo]
            };
        });

        let filtered = symbols;
        if (userInput && userInput.trim() !== '') {
            const searchTerm = userInput.toUpperCase().replace('_', '');
            filtered = symbols.filter(s =>
                s.symbol.includes(searchTerm) ||
                s.baseCurrency.includes(searchTerm) ||
                s.quoteCurrency.includes(searchTerm)
            );
        }

        const results = filtered.map(s => {
            const searchUpper = userInput.toUpperCase();
            let score = 0;

            if (s.symbol === searchUpper) score += 1000;
            else if (s.symbol.startsWith(searchUpper)) score += 500;
            else if (s.baseCurrency === searchUpper) score += 300;
            else if (s.baseCurrency.startsWith(searchUpper)) score += 200;

            // Major pairs bonus
            if (['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF'].includes(s.symbol)) score += 100;

            return {
                symbol: s.symbol,
                full_name: `OANDA:${s.symbol}`,
                description: `${s.baseCurrency}/${s.quoteCurrency}`,
                exchange: OANDA_CONFIG.exchange,
                type: OANDA_CONFIG.type,
                exchange_logo: OANDA_CONFIG.logo,
                logo_urls: [
                    // `https://huobicfg.s3.amazonaws.com/currency_icon/${baseAsset}.png`,
                    OANDA_CONFIG.logo
                ],
                score: score
            };
        });

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, OANDA_CONFIG.maxSearchResults)
            .map(r => {
                delete r.score;
                return r;
            });
    }

    async resolveSymbol(symbolName) {
        const symbol = this.parseSymbolName(symbolName);

        // Determine precision
        let pricescale = 100000; // Default 5 decimals for forex
        if (symbol.includes('JPY')) {
            pricescale = 1000; // 3 decimals
        } else if (symbol.includes('XAU')) {
            pricescale = 100; // 2 decimals
        } else if (symbol.includes('XAG')) {
            pricescale = 10000; // 4 decimals
        }

        try {
            return {
                name: symbol,
                description: symbol,
                type: OANDA_CONFIG.type,
                session: '0000-2400:1234567',
                timezone: 'Etc/UTC',
                ticker: symbol,
                exchange: OANDA_CONFIG.exchange,
                minmov: 1,
                pricescale: pricescale,
                has_intraday: true,
                has_daily: true,
                has_weekly_and_monthly: true,
                supported_resolutions: OANDA_CONFIG.supported_resolutions,
                volume_precision: 0,
                data_status: 'streaming',
                full_name: `OANDA:${symbol}`,
                logo_urls: [
                    OANDA_CONFIG.logo
                ],
                has_no_volume: true
            };
        } catch (error) {
            console.error(`${OANDA_CONFIG.logPrefix} Error resolving symbol:`, error);
            throw new Error('Symbol not found');
        }
    }


    /**
     * Fetch up to 5000 bars from OANDA API ending at toTimeSec
     */
    async fetchBatch(oandaSymbol, granularity, toTimeSec) {
        const toISO = new Date(toTimeSec * 1000).toISOString();
        const url = `${this.baseUrl}/instruments/${oandaSymbol}/candles?granularity=${granularity}&to=${encodeURIComponent(toISO)}&count=5000&price=M`;

        const headers = {};
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const response = await fetch(url, { headers });
        if (!response.ok) {
            console.warn(`${OANDA_CONFIG.logPrefix} HTTP error ${response.status} fetching historical batch`);
            return [];
        }

        const data = await response.json();

        if (data.errorMessage) {
            console.warn(`${OANDA_CONFIG.logPrefix} API error:`, data.errorMessage);
            return [];
        }

        if (!data.candles || data.candles.length === 0) {
            return [];
        }

        return data.candles
            .map(candle => ({
                time: new Date(candle.time).getTime(),
                open: parseFloat(candle.mid.o),
                high: parseFloat(candle.mid.h),
                low: parseFloat(candle.mid.l),
                close: parseFloat(candle.mid.c),
                volume: candle.volume || 0
            }))
            .filter(b => [b.time, b.open, b.high, b.low, b.close].every(Number.isFinite))
            .sort((a, b) => a.time - b.time);
    }

    async getBars(symbolInfo, resolution, periodParams) {
        const { from, to, firstDataRequest } = periodParams;
        const symbol = symbolInfo.name;

        // Map symbol to OANDA format (e.g. EURUSD -> EUR_USD)
        const cleanSymbol = symbol.toUpperCase().replace('OANDA:', '').replace('OA:', '');
        const allInstruments = [...OANDA_CONFIG.forexPairs, ...OANDA_CONFIG.indexInstruments];
        const match = allInstruments.find(s => s.replace('_', '') === cleanSymbol || s === cleanSymbol);
        const oandaSymbol = match || (cleanSymbol.includes('_') ? cleanSymbol : (cleanSymbol.length === 6 ? cleanSymbol.substring(0, 3) + '_' + cleanSymbol.substring(3) : cleanSymbol));

        const intervalMap = {
            '1': 'M1',
            '5': 'M5',
            '15': 'M15',
            '30': 'M30',
            '60': 'H1',
            '240': 'H4',
            '1D': 'D',
            'D': 'D',
            '1W': 'W',
            'W': 'W',
            '1M': 'M',
            'M': 'M'
        };
        const granularity = intervalMap[resolution] || (resolution.endsWith('D') ? 'D' : resolution.endsWith('W') ? 'W' : resolution.endsWith('M') ? 'M' : 'H1');
        const cacheKey = `${cleanSymbol}_${resolution}`;

        const nowSec = Math.floor(Date.now() / 1000);
        const adjustedToSec = Math.min(to, nowSec);
        const fromMs = from * 1000;
        const toMs = adjustedToSec * 1000;

        if (from > adjustedToSec) {
            return { bars: [], meta: { noData: true } };
        }

        // Support up to 30,000 bars for deep historical analysis (matching Crypto)
        const MAX_BARS = 30000;

        try {
            let cache = this.barsCache[cacheKey];

            // Initialize cache on first request or if cache expired (> 5 min)
            if (!cache || (firstDataRequest && Date.now() - cache.timestamp > 300000)) {
                if (this.inFlightRequests.has(cacheKey)) {
                    await this.inFlightRequests.get(cacheKey);
                    cache = this.barsCache[cacheKey];
                } else {
                    const initPromise = (async () => {
                        console.log(`${OANDA_CONFIG.logPrefix} Fetching initial 5000 bars for ${cleanSymbol} (${resolution})...`);
                        const initialBars = await this.fetchBatch(oandaSymbol, granularity, nowSec);
                        this.barsCache[cacheKey] = {
                            bars: initialBars,
                            noMoreHistoricalData: initialBars.length < 5000,
                            timestamp: Date.now()
                        };
                        console.log(`${OANDA_CONFIG.logPrefix} Loaded ${initialBars.length} initial bars for ${cleanSymbol}`);
                    })();
                    this.inFlightRequests.set(cacheKey, initPromise);
                    try {
                        await initPromise;
                    } finally {
                        this.inFlightRequests.delete(cacheKey);
                    }
                    cache = this.barsCache[cacheKey];
                }
            }

            if (!cache || !cache.bars || cache.bars.length === 0) {
                console.log(`${OANDA_CONFIG.logPrefix} No bars available for ${cleanSymbol}`);
                return { bars: [], meta: { noData: true } };
            }

            // If TradingView requests historical data older than our earliest cached bar,
            // fetch older batches (up to MAX_BARS = 30000 bars, matching Crypto)
            let oldestBar = cache.bars[0];
            while (fromMs < oldestBar.time && !cache.noMoreHistoricalData && cache.bars.length < MAX_BARS) {
                const olderToSec = Math.floor(oldestBar.time / 1000);
                const inFlightKey = `${cacheKey}_older_${olderToSec}`;

                let olderBatch;
                if (this.inFlightRequests.has(inFlightKey)) {
                    olderBatch = await this.inFlightRequests.get(inFlightKey);
                } else {
                    const olderPromise = (async () => {
                        console.log(`${OANDA_CONFIG.logPrefix} Fetching older batch before ${new Date(oldestBar.time).toISOString()} (current total: ${cache.bars.length})...`);
                        return await this.fetchBatch(oandaSymbol, granularity, olderToSec);
                    })();
                    this.inFlightRequests.set(inFlightKey, olderPromise);
                    try {
                        olderBatch = await olderPromise;
                    } finally {
                        this.inFlightRequests.delete(inFlightKey);
                    }
                }

                if (!olderBatch || olderBatch.length === 0) {
                    console.log(`${OANDA_CONFIG.logPrefix} Reached earliest history from API for ${cleanSymbol}`);
                    cache.noMoreHistoricalData = true;
                    break;
                }

                // Filter out any bars that overlap with already cached bars (time >= oldestBar.time)
                const newOlderBars = olderBatch.filter(b => b.time < oldestBar.time);
                if (newOlderBars.length === 0) {
                    cache.noMoreHistoricalData = true;
                    break;
                }

                // Prepend new older bars to cache
                cache.bars = newOlderBars.concat(cache.bars);
                oldestBar = cache.bars[0];
                console.log(`${OANDA_CONFIG.logPrefix} Extended history to ${cache.bars.length} bars (oldest: ${new Date(oldestBar.time).toISOString()})`);

                if (olderBatch.length < 5000) {
                    cache.noMoreHistoricalData = true;
                    break;
                }

                // If oldest bar is already <= requested fromMs, we have enough bars for this request
                if (oldestBar.time <= fromMs) {
                    break;
                }
            }

            // Filter bars in requested range [fromMs, toMs]
            const bars = cache.bars.filter(bar => bar.time >= fromMs && bar.time <= toMs);

            if (bars.length > 0) {
                return { bars, meta: { noData: false } };
            }

            // CRITICAL FIX:
            // When no bars are in range (e.g. scrolled past available data or weekend gap),
            // ALWAYS return meta: { noData: true } so TradingView stops querying.
            // NEVER return future bars with noData: false, which causes the infinite loop and crash!
            const meta = { noData: true };
            if (cache.bars.length > 0 && fromMs < cache.bars[0].time) {
                meta.nextTime = Math.floor(cache.bars[0].time / 1000);
            }

            return { bars: [], meta };

        } catch (error) {
            console.error(`${OANDA_CONFIG.logPrefix} Error in getBars:`, error);
            return { bars: [], meta: { noData: true } };
        }
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID) {
        const symbol = symbolInfo.name;
        const allInstruments = [...OANDA_CONFIG.forexPairs, ...OANDA_CONFIG.indexInstruments];
        const match = allInstruments.find(s => s.replace('_', '') === symbol);
        const oandaSymbol = match || symbol;

        console.log(`${OANDA_CONFIG.logPrefix} Subscribing to ${oandaSymbol} (${resolution})`);

        const intervalMap = {
            '1': 60000,
            '5': 300000,
            '15': 900000,
            '30': 1800000,
            '60': 3600000,
            '240': 14400000,
            '1D': 86400000,
            '1W': 604800000,
            '1M': 2592000000
        };
        const interval = intervalMap[resolution] || 3600000;

        let lastBar = null;
        let abortController = new AbortController();
        let reconnectAttempts = 0;
        const maxReconnectAttempts = 5;

        const connectStream = () => {
            const streamUrl = `${this.streamUrl}/accounts/${this.accountId}/pricing/stream?instruments=${oandaSymbol}`;
            const headers = { 'Accept': 'application/json' };
            if (this.apiKey) {
                headers['Authorization'] = `Bearer ${this.apiKey}`;
            }

            fetch(streamUrl, {
                headers: headers,
                signal: abortController.signal
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    reconnectAttempts = 0;
                    console.log(`${OANDA_CONFIG.logPrefix} Stream connected for ${oandaSymbol}`);

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    const processStream = () => {
                        reader.read().then(({ done, value }) => {
                            if (done) {
                                console.log(`${OANDA_CONFIG.logPrefix} Stream ended for ${oandaSymbol}`);
                                if (reconnectAttempts < maxReconnectAttempts) {
                                    reconnectAttempts++;
                                    console.log(`${OANDA_CONFIG.logPrefix} Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
                                    setTimeout(connectStream, 2000 * reconnectAttempts);
                                }
                                return;
                            }

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                if (line.trim() === '') continue;

                                try {
                                    const data = JSON.parse(line);

                                    if (data.type === 'PRICE') {
                                        const bidPrice = parseFloat(data.bids?.[0]?.price || data.closeoutBid);
                                        const askPrice = parseFloat(data.asks?.[0]?.price || data.closeoutAsk);

                                        if (!bidPrice || !askPrice) continue;

                                        const price = (bidPrice + askPrice) / 2;
                                        const timestamp = new Date(data.time).getTime();
                                        const barTime = Math.floor(timestamp / interval) * interval;

                                        if (!lastBar || lastBar.time !== barTime) {
                                            if (lastBar) {
                                                console.log(`${OANDA_CONFIG.logPrefix} New bar: ${new Date(barTime).toISOString()} O:${lastBar.open} H:${lastBar.high} L:${lastBar.low} C:${lastBar.close}`);
                                                onRealtimeCallback(lastBar);
                                            }
                                            lastBar = {
                                                time: barTime,
                                                open: price,
                                                high: price,
                                                low: price,
                                                close: price,
                                                volume: 0
                                            };
                                        } else {
                                            lastBar.high = Math.max(lastBar.high, price);
                                            lastBar.low = Math.min(lastBar.low, price);
                                            lastBar.close = price;
                                            onRealtimeCallback(lastBar);
                                        }
                                    } else if (data.type === 'HEARTBEAT') {
                                        console.log(`${OANDA_CONFIG.logPrefix} Heartbeat received`);
                                    }
                                } catch (error) {
                                    console.error(`${OANDA_CONFIG.logPrefix} Parse error:`, error.message);
                                }
                            }

                            processStream();
                        }).catch(error => {
                            if (error.name !== 'AbortError') {
                                console.error(`${OANDA_CONFIG.logPrefix} Read error:`, error);
                                if (reconnectAttempts < maxReconnectAttempts) {
                                    reconnectAttempts++;
                                    setTimeout(connectStream, 2000 * reconnectAttempts);
                                }
                            }
                        });
                    };

                    processStream();
                })
                .catch(error => {
                    if (error.name !== 'AbortError') {
                        console.error(`${OANDA_CONFIG.logPrefix} Connection error:`, error);
                        if (reconnectAttempts < maxReconnectAttempts) {
                            reconnectAttempts++;
                            setTimeout(connectStream, 2000 * reconnectAttempts);
                        }
                    }
                });
        };

        connectStream();

        this.subscribers[subscriberUID] = {
            close: () => {
                abortController.abort();
                console.log(`${OANDA_CONFIG.logPrefix} Unsubscribed ${subscriberUID}`);
            }
        };
    }

    unsubscribeBars(subscriberUID) {
        const subscriber = this.subscribers[subscriberUID];
        if (subscriber && subscriber.close) {
            subscriber.close();
            delete this.subscribers[subscriberUID];
        }
    }
}
