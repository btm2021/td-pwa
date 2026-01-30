import { signal, computed } from '@preact/signals';

// ============================================
// EXCHANGE CONFIGURATION
// ============================================

// Định nghĩa các exchange được hỗ trợ (Perpetual/Futures only)
export const EXCHANGES = {
    BINANCE: {
        id: 'BINANCE',
        datafeedId: 'BINANCE_FUTURES',  // ID tương ứng trong datafeed
        name: 'Binance Perpetual',
        type: 'crypto',
        prefixes: ['BINANCE:', 'BINANCE_FUTURES:'],
        tickerPrefix: 'BINANCE'
    },
    BYBIT: {
        id: 'BYBIT',
        datafeedId: 'BYBIT_FUTURES',
        name: 'Bybit Perpetual',
        type: 'crypto',
        prefixes: ['BYBIT:', 'BYBIT_FUTURES:', 'BYBITF:'],
        tickerPrefix: 'BYBIT'
    },
    OKX: {
        id: 'OKX',
        datafeedId: 'OKX_FUTURES',
        name: 'OKX Perpetual',
        type: 'crypto',
        prefixes: ['OKX:', 'OKX_FUTURES:', 'OKXF:'],
        tickerPrefix: 'OKX'
    },
    OANDA: {
        id: 'OANDA',
        datafeedId: 'OANDA',
        name: 'OANDA Forex',
        type: 'forex',
        prefixes: ['OANDA:'],
        tickerPrefix: 'OANDA'
    }
};

// ============================================
// SYMBOL UTILITIES
// ============================================

/**
 * Parse symbol string để lấy thông tin exchange và symbol
 * @param {string} fullSymbol - Symbol với prefix (VD: BINANCE:BTCUSDT, BYBIT:ETHUSDT)
 * @returns {Object} - { exchange, symbol, rawSymbol, datafeedSymbol }
 */
export function parseSymbol(fullSymbol) {
    if (!fullSymbol) {
        return { exchange: null, symbol: '', rawSymbol: '', datafeedSymbol: '' };
    }

    const upper = fullSymbol.toUpperCase();

    // Kiểm tra từng exchange
    for (const [key, config] of Object.entries(EXCHANGES)) {
        for (const prefix of config.prefixes) {
            if (upper.startsWith(prefix)) {
                const rawSymbol = upper.substring(prefix.length);
                return {
                    exchange: config,
                    exchangeId: config.id,
                    symbol: rawSymbol,
                    rawSymbol: rawSymbol,
                    // Symbol dùng cho datafeed (với prefix chuẩn)
                    datafeedSymbol: `${config.datafeedId}:${rawSymbol}`,
                    // Symbol dùng cho ticker lookup
                    tickerKey: `${config.tickerPrefix}:${rawSymbol}`,
                    // Full symbol với prefix chuẩn
                    fullSymbol: `${config.id}:${rawSymbol}`
                };
            }
        }
    }

    // Không tìm thấy prefix - thử detect exchange từ symbol
    // Nếu có USDT/BUSD/USDC suffix -> mặc định Binance
    if (upper.endsWith('USDT') || upper.endsWith('BUSD') || upper.endsWith('USDC')) {
        const config = EXCHANGES.BINANCE;
        return {
            exchange: config,
            exchangeId: config.id,
            symbol: upper,
            rawSymbol: upper,
            datafeedSymbol: `${config.datafeedId}:${upper}`,
            tickerKey: `${config.tickerPrefix}:${upper}`,
            fullSymbol: `${config.id}:${upper}`
        };
    }

    // Kiểm tra nếu là forex (6 chars không có crypto suffix)
    if (upper.length === 6 || upper === 'XAUUSD' || upper === 'XAGUSD') {
        const config = EXCHANGES.OANDA;
        return {
            exchange: config,
            exchangeId: config.id,
            symbol: upper,
            rawSymbol: upper,
            datafeedSymbol: `${config.datafeedId}:${upper}`,
            tickerKey: `${config.tickerPrefix}:${upper}`,
            fullSymbol: `${config.id}:${upper}`
        };
    }

    // Fallback về Binance
    const defaultConfig = EXCHANGES.BINANCE;
    return {
        exchange: defaultConfig,
        exchangeId: defaultConfig.id,
        symbol: upper,
        rawSymbol: upper,
        datafeedSymbol: `${defaultConfig.datafeedId}:${upper}`,
        tickerKey: `${defaultConfig.tickerPrefix}:${upper}`,
        fullSymbol: `${defaultConfig.id}:${upper}`
    };
}

/**
 * Normalize symbol thành format chuẩn EXCHANGE:SYMBOL
 * @param {string} symbol - Raw symbol hoặc symbol với prefix
 * @param {string} defaultExchange - Exchange mặc định nếu không có prefix
 * @returns {string} - Normalized symbol (VD: BINANCE:BTCUSDT)
 */
export function normalizeSymbol(symbol, defaultExchange = 'BINANCE') {
    const parsed = parseSymbol(symbol);
    return parsed.fullSymbol;
}

// ============================================
// STATE SIGNALS
// ============================================

export const activeTab = signal('watchlist');
export const selectedSymbolName = signal('BINANCE:BTCUSDT');  // Full symbol với prefix
export const selectedTimeframe = signal('15m');
export const isFullscreen = signal(false);
export const isChartReady = signal(false);

// ============================================
// COMPUTED VALUES
// ============================================

// Computed symbol object for Chart screen
export const selectedSymbol = computed(() => {
    const sym = selectedSymbolName.value;
    const parsed = parseSymbol(sym);

    if (!parsed.exchange) {
        // Fallback mặc định
        return {
            id: 'binance:btcusdt',
            symbol: 'BTCUSDT',
            fullSymbol: 'BINANCE:BTCUSDT',
            datafeedSymbol: 'BINANCE_FUTURES:BTCUSDT',
            tickerKey: 'BINANCE:BTCUSDT',
            name: 'BTC',
            description: 'BTC / USDT Perpetual',
            exchange: 'BINANCE',
            exchangeInfo: EXCHANGES.BINANCE,
        };
    }

    // Xác định base và quote asset
    let baseAsset = parsed.symbol;
    let quoteAsset = '';
    let description = '';

    if (parsed.exchange.type === 'forex') {
        // Forex: EURUSD -> EUR/USD
        if (parsed.symbol.length >= 6) {
            baseAsset = parsed.symbol.substring(0, 3);
            quoteAsset = parsed.symbol.substring(3);
            description = `${baseAsset} / ${quoteAsset}`;
        } else {
            description = parsed.symbol;
        }
    } else {
        // Crypto: BTCUSDT -> BTC/USDT Perpetual
        baseAsset = parsed.symbol.replace(/USDT$|USDC$|BUSD$|PERP$/i, '');
        quoteAsset = parsed.symbol.replace(baseAsset, '');
        description = `${baseAsset} / ${quoteAsset} Perpetual`;
    }

    return {
        id: sym.toLowerCase(),
        symbol: parsed.symbol,           // Raw symbol (BTCUSDT)
        fullSymbol: parsed.fullSymbol,   // BINANCE:BTCUSDT
        datafeedSymbol: parsed.datafeedSymbol,  // BINANCE_FUTURES:BTCUSDT
        tickerKey: parsed.tickerKey,     // BINANCE:BTCUSDT (for ticker lookup)
        name: baseAsset,
        description: description,
        exchange: parsed.exchangeId,
        exchangeInfo: parsed.exchange,
    };
});

// ============================================
// ACTIONS
// ============================================

export function setActiveTab(tab) {
    activeTab.value = tab;
}

/**
 * Set symbol cho chart
 * @param {string} symbolName - Có thể là raw symbol hoặc có prefix
 */
export function setSelectedSymbol(symbolName) {
    // Parse và normalize symbol
    const parsed = parseSymbol(symbolName);
    const normalizedSymbol = parsed.fullSymbol;

    console.log('[Store] Setting symbol:', symbolName, '->', normalizedSymbol);

    selectedSymbolName.value = normalizedSymbol;

    // Default timeframe to 15m when selecting a symbol from watchlist/search
    selectedTimeframe.value = '15m';

    // When symbol changes, switch to chart tab
    activeTab.value = 'chart';

    // Reset chart ready state
    isChartReady.value = false;
}

export function setSelectedTimeframe(tf) {
    selectedTimeframe.value = tf;
}

export function toggleFullscreen() {
    isFullscreen.value = !isFullscreen.value;
}

export function setChartReady(ready) {
    isChartReady.value = ready;
}

// ============================================
// NAVIGATION HELPERS
// ============================================

export function navigateToChart(symbol) {
    setSelectedSymbol(symbol);
}

export function navigateToFutures(symbol) {
    setSelectedSymbol(symbol);
    setActiveTab('futures');
}

export function navigateToTab(tab) {
    setActiveTab(tab);
}
