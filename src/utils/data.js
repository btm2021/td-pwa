/**
 * Utility to fetch OHLCV data from various exchanges
 */

const BINANCE_BASE = 'https://fapi.binance.com/fapi/v1';
const BYBIT_BASE = 'https://api.bybit.com/v5/market';
const OKX_BASE = 'https://www.okx.com/api/v5/market';

export async function fetchOHLCV(symbol, interval = '15m', limit = 1500) {
    const upperSymbol = symbol.toUpperCase();
    let exchange = 'BINANCE';
    let rawSymbol = upperSymbol;

    if (upperSymbol.includes(':')) {
        [exchange, rawSymbol] = upperSymbol.split(':');
    }

    try {
        if (exchange === 'BINANCE' || exchange === 'BINANCE_FUTURES') {
            const url = `${BINANCE_BASE}/klines?symbol=${rawSymbol}&interval=${interval}&limit=${limit}`;
            const resp = await fetch(url);
            const data = await resp.json();
            return data.map(d => ({
                time: Math.floor(d[0] / 1000),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            }));
        }

        if (exchange === 'BYBIT' || exchange === 'BYBIT_FUTURES') {
            // Bybit uses minutes for interval
            const bybitInterval = interval.replace('m', '');
            const url = `${BYBIT_BASE}/kline?category=linear&symbol=${rawSymbol}&interval=${bybitInterval}&limit=1000`;
            const resp = await fetch(url);
            const data = await resp.json();
            if (data.retCode !== 0) throw new Error(data.retMsg);
            return data.result.list.map(d => ({
                time: Math.floor(parseInt(d[0]) / 1000),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            })).reverse(); // Bybit returns newest first
        }

        if (exchange === 'OKX') {
            // OKX Format: BTC-USDT-SWAP
            // rawSymbol "BTCUSDT" needs to be "BTC-USDT"
            let instId = rawSymbol;
            if (!instId.includes('-')) {
                instId = instId.replace('USDT', '-USDT');
            }
            if (!instId.endsWith('-SWAP')) {
                instId = `${instId}-SWAP`;
            }

            const okxInterval = interval === '1h' ? '1H' : interval === '1d' ? '1D' : interval;
            const urlCandles = `${OKX_BASE}/candles?instId=${instId}&bar=${okxInterval}&limit=300`;

            const resp = await fetch(urlCandles);
            const data = await resp.json();

            if (data.code !== '0') {
                console.error('OKX Error:', data.msg, 'url:', urlCandles);
                throw new Error(data.msg);
            }

            return data.data.map(d => ({
                time: Math.floor(parseInt(d[0]) / 1000),
                open: parseFloat(d[1]),
                high: parseFloat(d[2]),
                low: parseFloat(d[3]),
                close: parseFloat(d[4]),
                volume: parseFloat(d[5])
            })).reverse();
        }

        if (exchange === 'OANDA') {
            const OANDA_API_KEY = '7a53c4eeff879ba6118ddc416c2d2085-4a766a7d07af7bd629c07b451fe92984';
            const OANDA_API_URL = 'https://api-fxpractice.oanda.com/v3';

            // Format: EUR_USD using rawSymbol (e.g. EURUSD -> EUR_USD)
            let instrument = rawSymbol;
            if (!instrument.includes('_')) {
                // Simple heuristic: First 3 chars vs Last 3 chars (e.g. EURUSD)
                if (instrument.length === 6) {
                    instrument = `${instrument.substring(0, 3)}_${instrument.substring(3)}`;
                }
            }

            // Map interval to OANDA granularity
            const granularityMap = {
                '1m': 'M1',
                '5m': 'M5',
                '15m': 'M15',
                '30m': 'M30',
                '1h': 'H1',
                '4h': 'H4',
                '1d': 'D',
                '1w': 'W'
            };
            const granite = granularityMap[interval] || 'M15';

            const url = `${OANDA_API_URL}/instruments/${instrument}/candles?count=${limit > 5000 ? 5000 : limit}&granularity=${granite}&price=M`;

            const resp = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${OANDA_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!resp.ok) {
                const txt = await resp.text();
                throw new Error(`OANDA Error: ${txt}`);
            }

            const data = await resp.json();
            return data.candles.map(c => ({
                time: Math.floor(new Date(c.time).getTime() / 1000),
                open: parseFloat(c.mid.o),
                high: parseFloat(c.mid.h),
                low: parseFloat(c.mid.l),
                close: parseFloat(c.mid.c),
                volume: c.volume
            }));
        }

        return [];
    } catch (error) {
        console.error(`Error fetching OHLCV for ${symbol}:`, error);
        return [];
    }
}
