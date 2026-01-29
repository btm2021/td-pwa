import { signal, computed } from '@preact/signals';

// Timeframes for chart
export const timeframes = [
    { id: '1m', label: '1m' },
    { id: '5m', label: '5m' },
    { id: '15m', label: '15m' },
    { id: '30m', label: '30m' },
    { id: '1h', label: '1H' },
    { id: '4h', label: '4H' },
    { id: '1d', label: '1D' },
    { id: '1w', label: '1W' },
];

// Initial static categories
const defaultCategories = [
    {
        id: 'favorites',
        label: 'Favorites',
        color: '#FFD600',
        symbols: ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'],
        type: 'user'
    }
];

// Symbols provided by datafeeds (cached)
const exchangeSymbolMap = signal({});


// Watchlist categories
export const categories = signal([...defaultCategories]);

// Active category
export const activeCategory = signal('favorites');

// Loading state
export const isWatchlistLoading = signal(true);

// Get symbols for active category
export const activeCategorySymbols = computed(() => {
    const cat = categories.value.find(c => c.id === activeCategory.value);
    return cat ? cat.symbols : [];
});

// Ticker data from WebSocket (symbol -> ticker data)
export const tickerData = signal({});

// WebSocket connection
let ws = null;
let reconnectTimeout = null;

// ============================================
// FIREBASE HELPERS
// ============================================
const FIREBASE_USER_ID = 'anonymous'; // Can be changed for multi-user

// Firebase config (same as save-load-adapter)
const firebaseConfig = {
    apiKey: "AIzaSyCX5ICsjsD0fJFm1jxfUEitBwZ2Ru00fm0",
    authDomain: "papertrading-6332a.firebaseapp.com",
    projectId: "papertrading-6332a",
    storageBucket: "papertrading-6332a.firebasestorage.app",
    messagingSenderId: "11611248436",
    appId: "1:11611248436:web:cfe3c2caad6fa9ae3d3761"
};

let db = null;
let firebaseInitialized = false;

// Initialize Firebase
function initializeFirebase() {
    if (firebaseInitialized) return true;

    if (typeof window === 'undefined' || !window.firebase) {
        console.warn('[Watchlist] Firebase SDK not loaded');
        return false;
    }

    try {
        // Check if already initialized
        if (!window.firebase.apps.length) {
            window.firebase.initializeApp(firebaseConfig);
            console.log('[Watchlist] Firebase initialized');
        }

        db = window.firebase.firestore();
        firebaseInitialized = true;
        return true;
    } catch (error) {
        console.error('[Watchlist] Firebase init error:', error);
        return false;
    }
}

function getFirestoreDb() {
    if (!firebaseInitialized) {
        initializeFirebase();
    }
    return db;
}

function getWatchlistCollection() {
    const firestore = getFirestoreDb();
    if (!firestore) return null;
    return firestore.collection('users').doc(FIREBASE_USER_ID).collection('watchlist');
}

// ============================================
// FIREBASE SAVE/LOAD
// ============================================

// Save categories to Firebase
async function saveCategoriesToFirebase() {
    try {
        const watchlistRef = getWatchlistCollection();
        if (!watchlistRef) {
            console.warn('[Watchlist] Firebase not available, saving to localStorage');
            saveCategoriesToLocalStorage();
            return;
        }

        // Save categories document
        await watchlistRef.doc('categories').set({
            categories: categories.value,
            activeCategory: activeCategory.value,
            updatedAt: Date.now()
        });

        console.log('[Watchlist] Saved to Firebase:', categories.value.length, 'categories');
    } catch (error) {
        console.error('[Watchlist] Error saving to Firebase:', error);
        // Fallback to localStorage
        saveCategoriesToLocalStorage();
    }
}

// Load categories from Firebase
async function loadCategoriesFromFirebase() {
    try {
        const watchlistRef = getWatchlistCollection();
        if (!watchlistRef) {
            console.warn('[Watchlist] Firebase not available, loading from localStorage');
            loadCategoriesFromLocalStorage();
            return;
        }

        const doc = await watchlistRef.doc('categories').get();

        if (doc.exists) {
            const data = doc.data();

            if (data.categories && Array.isArray(data.categories)) {
                // We only load user categories from Firebase
                const userCategories = data.categories.filter(c => c.type === 'user' || c.id === 'favorites');

                // Merge with current categories (which include exchange ones)
                const currentCats = categories.value;
                const otherCats = currentCats.filter(c => c.type === 'system');

                categories.value = [...userCategories, ...otherCats];
                console.log('[Watchlist] Loaded user categories from Firebase:', userCategories.length);
            }

            if (data.activeCategory && categories.value.some(c => c.id === data.activeCategory)) {
                activeCategory.value = data.activeCategory;
            }
        } else {
            console.log('[Watchlist] No data in Firebase, using defaults');
            // Try to migrate from localStorage if exists
            const localSaved = localStorage.getItem('watchlist_categories');
            if (localSaved) {
                console.log('[Watchlist] Migrating data from localStorage to Firebase');
                loadCategoriesFromLocalStorage();
                await saveCategoriesToFirebase();
            }
        }
    } catch (error) {
        console.error('[Watchlist] Error loading from Firebase:', error);
        // Fallback to localStorage
        loadCategoriesFromLocalStorage();
    } finally {
        isWatchlistLoading.value = false;
    }

}


function loadCategoriesFromLocalStorage() {
    try {
        // Try new key first
        let saved = localStorage.getItem('watchlist_user_categories');

        // Fallback to old key for migration
        if (!saved) {
            saved = localStorage.getItem('watchlist_categories');
        }

        const savedActive = localStorage.getItem('watchlist_active_category');

        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) {
                // Ensure they are marked as user/favorites
                const userCats = parsed.map(c => ({
                    ...c,
                    type: (c.id === 'favorites' || c.type === 'user') ? 'user' : 'system'
                }));

                // Merge with current (which has exchange cats from sync)
                const currentCats = categories.value;
                const systemCats = currentCats.filter(c => c.type === 'system');

                // Filter out any system cats from the saved list to avoid duplicates
                const finalUserCats = userCats.filter(c => c.type === 'user');

                categories.value = [...finalUserCats, ...systemCats];
            }
        }

        if (savedActive && categories.value.some(c => c.id === savedActive)) {
            activeCategory.value = savedActive;
        }
    } catch (e) {
        console.warn('[Watchlist] Could not load from localStorage:', e);
    } finally {
        isWatchlistLoading.value = false;
    }
}

// Public save function (debounced)
let saveTimeout = null;
function saveCategoriesToStorage() {
    // Only save USER categories to persistence
    const userCategories = categories.value.filter(c => c.type === 'user' || c.id === 'favorites');

    // Update local immediately for responsiveness
    saveCategoriesToLocalStorage(userCategories);

    // Debounce Firebase saves
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        try {
            const watchlistRef = getWatchlistCollection();
            if (watchlistRef) {
                await watchlistRef.doc('categories').set({
                    categories: userCategories,
                    activeCategory: activeCategory.value,
                    updatedAt: Date.now()
                });
            }
        } catch (e) {
            console.error('[Watchlist] Firebase save failed:', e);
        }
    }, 1000);
}

// LocalStorage fallback for USER categories
function saveCategoriesToLocalStorage(userCategories) {
    try {
        localStorage.setItem('watchlist_user_categories', JSON.stringify(userCategories));
        localStorage.setItem('watchlist_active_category', activeCategory.value);
    } catch (e) {
        console.warn('[Watchlist] Could not save to localStorage:', e);
    }
}

// Public load function
export function loadCategoriesFromStorage() {
    isWatchlistLoading.value = true;

    // Wait for Firebase to be ready
    const checkFirebase = () => {
        if (typeof window !== 'undefined' && window.firebase && window.firebase.firestore) {
            loadCategoriesFromFirebase();
        } else {
            // Retry after a short delay
            setTimeout(checkFirebase, 100);
        }
    };

    // Start checking after DOM is ready
    if (document.readyState === 'complete') {
        checkFirebase();
    } else {
        window.addEventListener('load', checkFirebase);
    }
}

// ============================================
// WEBSOCKET SUBSCRIPTIONS
// ============================================

// OANDA Streaming State
let oandaAbortController = null;
const OANDA_ACCOUNT_ID = '101-004-27015242-001';
const OANDA_API_KEY = '7a53c4eeff879ba6118ddc416c2d2085-4a766a7d07af7bd629c07b451fe92984';
const OANDA_API_URL = 'https://api-fxpractice.oanda.com/v3';
const OANDA_STREAM_URL = 'https://stream-fxpractice.oanda.com/v3';

// Bybit WebSocket
let bybitWs = null;
let bybitReconnectTimeout = null;
let bybitPingInterval = null;

// OKX WebSocket
let okxWs = null;
let okxReconnectTimeout = null;
let okxPingInterval = null;

// Ticker update batching
let tickerUpdateBuffer = {};
let tickerUpdateTimer = null;

function queueTickerUpdate(key, data) {
    tickerUpdateBuffer[key] = data;
    if (!tickerUpdateTimer) {
        tickerUpdateTimer = setTimeout(() => {
            tickerData.value = {
                ...tickerData.value,
                ...tickerUpdateBuffer
            };
            tickerUpdateBuffer = {};
            tickerUpdateTimer = null;
        }, 100);
    }
}


// Subscribe to all exchange ticker streams
export function subscribeToTickers() {
    subscribeToBinance();
    subscribeToBybit();
    subscribeToOKX();
    subscribeToOANDA();
}


function subscribeToBinance() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        return;
    }

    const connect = () => {
        console.log('[WebSocket] Connecting to Binance Futures ticker stream...');
        ws = new WebSocket('wss://fstream.binance.com/ws/!ticker@arr');

        ws.onopen = () => {
            console.log('[WebSocket] Connected to ticker stream');
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (Array.isArray(data)) {
                    data.forEach(ticker => {
                        const symbol = ticker.s;
                        const key = `BINANCE:${symbol}`;
                        queueTickerUpdate(key, {
                            symbol: symbol,
                            exchange: 'BINANCE',
                            price: parseFloat(ticker.c),
                            priceChange: parseFloat(ticker.p),
                            priceChangePercent: parseFloat(ticker.P),
                            high: parseFloat(ticker.h),
                            low: parseFloat(ticker.l),
                            volume: parseFloat(ticker.v),
                            quoteVolume: parseFloat(ticker.q),
                            lastUpdate: Date.now(),
                        });
                    });
                }
            } catch (error) {
                console.error('[WebSocket] Parse error:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };

        ws.onclose = () => {
            console.log('[WebSocket] Disconnected, reconnecting in 3s...');
            reconnectTimeout = setTimeout(connect, 3000);
        };
    };

    connect();
}

// Subscribe to Bybit Futures ticker stream
async function subscribeToBybit() {
    if (bybitWs && bybitWs.readyState === WebSocket.OPEN) {
        return;
    }

    // Clear existing
    if (bybitPingInterval) clearInterval(bybitPingInterval);

    const connect = async () => {
        console.log('[Bybit WebSocket] Connecting to ticker stream...');
        bybitWs = new WebSocket('wss://stream.bybit.com/v5/public/linear');

        bybitWs.onopen = async () => {
            console.log('[Bybit WebSocket] Connected');

            // Heartbeat
            bybitPingInterval = setInterval(() => {
                if (bybitWs.readyState === WebSocket.OPEN) {
                    bybitWs.send(JSON.stringify({ op: "ping" }));
                }
            }, 20000);

            // Fetch symbols if not in window.symbolConfig
            let symbols = [];
            if (window.symbolConfig?.['BYBIT_FUTURES']) {
                symbols = window.symbolConfig['BYBIT_FUTURES'].map(s => s.symbol);
            } else {
                try {
                    const response = await fetch('https://api.bybit.com/v5/market/instruments-info?category=linear');
                    const data = await response.json();
                    if (data.retCode === 0 && data.result?.list) {
                        symbols = data.result.list
                            .filter(s => s.status === 'Trading' && s.symbol.endsWith('USDT'))
                            .map(s => s.symbol);
                    }
                } catch (e) {
                    console.warn('[Bybit WebSocket] Failed to fetch symbols, using defaults');
                    symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT'];
                }
            }

            // Subscribe in batches (max 10 per message is recommended by Bybit for reliability, though more is possible)
            if (symbols.length > 0) {
                const topics = symbols.map(s => `tickers.${s}`);
                for (let i = 0; i < topics.length; i += 10) {
                    const batch = topics.slice(i, i + 10);
                    bybitWs.send(JSON.stringify({
                        op: 'subscribe',
                        args: batch
                    }));
                }
                console.log(`[Bybit WebSocket] Subscribed to ${symbols.length} tickers`);
            }
        };

        bybitWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.topic && data.topic.startsWith('tickers.') && data.data) {
                    const ticker = data.data;
                    const symbol = ticker.symbol;
                    const key = `BYBIT:${symbol}`;

                    // Get current state to merge with delta
                    const currentTicker = tickerData.value[key] || {};

                    // Helper to get value or keep current
                    const getVal = (field, oldField) => {
                        const val = parseFloat(ticker[field]);
                        if (!isNaN(val)) return val;
                        return currentTicker[oldField] || 0;
                    };

                    const lastPrice = getVal('lastPrice', 'price');

                    if (lastPrice === 0 && !currentTicker.price) {
                        // Skip if we don't have a valid price yet
                        return;
                    }

                    queueTickerUpdate(key, {
                        symbol: symbol,
                        exchange: 'BYBIT',
                        price: lastPrice,
                        priceChange: parseFloat(ticker.price24hPcnt) ? (parseFloat(ticker.price24hPcnt) * lastPrice) : (currentTicker.priceChange || 0),
                        priceChangePercent: parseFloat(ticker.price24hPcnt) ? (parseFloat(ticker.price24hPcnt) * 100) : (currentTicker.priceChangePercent || 0),
                        high: getVal('highPrice24h', 'high'),
                        low: getVal('lowPrice24h', 'low'),
                        volume: getVal('volume24h', 'volume'),
                        quoteVolume: getVal('turnover24h', 'quoteVolume'),
                        lastUpdate: Date.now(),
                    });
                }
            } catch (error) {
                // Ignore
            }
        };

        bybitWs.onerror = (error) => {
            console.error('[Bybit WebSocket] Error:', error);
        };

        bybitWs.onclose = () => {
            console.log('[Bybit WebSocket] Disconnected, reconnecting in 5s...');
            if (bybitPingInterval) clearInterval(bybitPingInterval);
            bybitReconnectTimeout = setTimeout(connect, 5000);
        };
    };

    connect();
}

// Subscribe to OKX ticker stream
function subscribeToOKX() {
    if (okxWs && okxWs.readyState === WebSocket.OPEN) {
        return;
    }

    if (okxPingInterval) clearInterval(okxPingInterval);

    const connect = () => {
        console.log('[OKX WebSocket] Connecting to ticker stream...');
        okxWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

        okxWs.onopen = () => {
            console.log('[OKX WebSocket] Connected');

            // Heartbeat
            okxPingInterval = setInterval(() => {
                if (okxWs.readyState === WebSocket.OPEN) {
                    okxWs.send("ping");
                }
            }, 25000);

            // Subscribe to all USDT SWAP tickers
            okxWs.send(JSON.stringify({
                op: 'subscribe',
                args: [
                    { channel: 'tickers', instType: 'SWAP' }
                ]
            }));
            console.log('[OKX WebSocket] Subscribed to all SWAP tickers');
        };

        okxWs.onmessage = (event) => {
            if (event.data === "pong") return;

            try {
                const data = JSON.parse(event.data);
                if (data.data && data.data.length > 0) {
                    data.data.forEach(ticker => {
                        const symbol = ticker.instId.replace(/-SWAP$/, '').replace(/-/g, '');
                        if (!symbol.endsWith('USDT')) return;

                        const key = `OKX:${symbol}`;
                        const openPrice = parseFloat(ticker.open24h);
                        const lastPrice = parseFloat(ticker.last);

                        queueTickerUpdate(key, {
                            symbol: symbol,
                            exchange: 'OKX',
                            price: lastPrice,
                            priceChange: lastPrice - openPrice,
                            priceChangePercent: openPrice !== 0 ? ((lastPrice - openPrice) / openPrice) * 100 : 0,
                            high: parseFloat(ticker.high24h),
                            low: parseFloat(ticker.low24h),
                            volume: parseFloat(ticker.vol24h),
                            quoteVolume: parseFloat(ticker.volCcy24h),
                            lastUpdate: Date.now(),
                        });
                    });
                }
            } catch (error) {
                // Ignore
            }
        };

        okxWs.onerror = (error) => {
            console.error('[OKX WebSocket] Error:', error);
        };

        okxWs.onclose = () => {
            console.log('[OKX WebSocket] Disconnected, reconnecting in 5s...');
            if (okxPingInterval) clearInterval(okxPingInterval);
            okxReconnectTimeout = setTimeout(connect, 5000);
        };
    };

    connect();
}


async function subscribeToOANDA() {
    if (oandaAbortController) return;

    let lastInstruments = '';

    const startStream = async () => {
        if (oandaAbortController) {
            oandaAbortController.abort();
        }
        oandaAbortController = new AbortController();

        try {
            const allSymbols = activeCategorySymbols.value;
            const forexSymbols = allSymbols.filter(s => {
                const upper = s.toUpperCase();
                // Explicitly check for OANDA prefix
                if (upper.startsWith('OANDA:')) return true;
                // Explicitly exclude BINANCE prefix
                if (upper.startsWith('BINANCE:')) return false;

                // Fallback for symbols without prefix
                return !upper.endsWith('USDT') &&
                    !upper.endsWith('BUSD') &&
                    !upper.endsWith('USDC') &&
                    !upper.endsWith('PERP') &&
                    !upper.includes('BTC') && // Avoid crypto pairs like ETHBTC
                    !upper.includes('ETH');
            });

            if (forexSymbols.length === 0) {
                if (lastInstruments !== '') {
                    console.log('[OANDA] No OANDA symbols to stream, stopping stream.');
                    if (oandaAbortController) oandaAbortController.abort();
                    oandaAbortController = null;
                    lastInstruments = '';
                }
                return;
            }

            const instruments = forexSymbols.map(s => {
                let clean = s.toUpperCase().replace('OANDA:', '').replace('BINANCE:', '');
                if (clean.includes('_')) return clean;
                if (clean === 'XAUUSD') return 'XAU_USD';
                if (clean === 'XAGUSD') return 'XAG_USD';
                if (clean.length === 6) {
                    return `${clean.substring(0, 3)}_${clean.substring(3)}`;
                }
                return clean;
            }).join(',');

            if (!instruments || instruments === lastInstruments) return;
            lastInstruments = instruments;

            console.log(`[OANDA] Starting stream for: ${instruments}`);

            const response = await fetch(`${OANDA_STREAM_URL}/accounts/${OANDA_ACCOUNT_ID}/pricing/stream?instruments=${instruments}`, {
                headers: {
                    'Authorization': `Bearer ${OANDA_API_KEY}`
                },
                signal: oandaAbortController.signal
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data = JSON.parse(line);
                            if (data.type === 'PRICE') {
                                const symbol = data.instrument.replace('_', '');
                                const bid = parseFloat(data.bids[0].price);
                                const ask = parseFloat(data.asks[0].price);
                                const currentPrice = (bid + ask) / 2;

                                // Store with exchange prefix for separation
                                const key = `OANDA:${symbol}`;
                                queueTickerUpdate(key, {
                                    symbol: symbol,
                                    exchange: 'OANDA',
                                    price: currentPrice,
                                    priceChange: 0,
                                    priceChangePercent: 0,
                                    high: currentPrice,
                                    low: currentPrice,
                                    volume: 0,
                                    quoteVolume: 0,
                                    lastUpdate: Date.now(),
                                });
                            }

                        } catch (e) {
                            // Heartbeat or malformed
                        }
                    }
                }
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('[OANDA] Stream error, reconnecting in 5s...', error);
                setTimeout(startStream, 5000);
            }
        }
    };

    // Watch for symbol changes to restart stream if needed
    activeCategorySymbols.subscribe(() => {
        startStream();
    });

    startStream();
}

// Unsubscribe from tickers
export function unsubscribeFromTickers() {
    // Binance
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }

    // OKX
    if (okxReconnectTimeout) {
        clearTimeout(okxReconnectTimeout);
        okxReconnectTimeout = null;
    }
    if (okxPingInterval) {
        clearInterval(okxPingInterval);
        okxPingInterval = null;
    }
    if (okxWs) {
        okxWs.close();
        okxWs = null;
    }

    // Bybit
    if (bybitReconnectTimeout) {
        clearTimeout(bybitReconnectTimeout);
        bybitReconnectTimeout = null;
    }
    if (bybitPingInterval) {
        clearInterval(bybitPingInterval);
        bybitPingInterval = null;
    }
    if (bybitWs) {
        bybitWs.close();
        bybitWs = null;
    }


    // OANDA
    if (oandaAbortController) {
        oandaAbortController.abort();
        oandaAbortController = null;
    }
}


/**
 * Mapping từ symbol prefix sang ticker prefix
 * Vì ticker keys có thể khác với symbol prefix trong một số trường hợp
 */
const TICKER_PREFIX_MAP = {
    'BINANCE': 'BINANCE',
    'BINANCE_FUTURES': 'BINANCE',
    'BYBIT': 'BYBIT',
    'BYBIT_FUTURES': 'BYBIT',
    'OKX': 'OKX',
    'OKX_FUTURES': 'OKX',
    'OANDA': 'OANDA'
};

/**
 * Get ticker for a symbol
 * Supports multiple formats:
 * - BINANCE:BTCUSDT
 * - BINANCE_FUTURES:BTCUSDT
 * - BYBIT:BTCUSDT
 * - OKX:BTCUSDT
 * - OANDA:EURUSD
 * - BTCUSDT (no prefix - defaults to BINANCE)
 * 
 * @param {string} symbol - Symbol to lookup
 * @returns {Object|null} - Ticker data or null
 */
export function getTicker(symbol) {
    if (!symbol) return null;

    const upperSymbol = symbol.toUpperCase();
    const tickers = tickerData.value;

    // Direct lookup - symbol already in correct format
    if (tickers[upperSymbol]) {
        return tickers[upperSymbol];
    }

    // Symbol có prefix - chuyển đổi sang ticker key format
    if (upperSymbol.includes(':')) {
        const [prefix, rawSymbol] = upperSymbol.split(':');
        const tickerPrefix = TICKER_PREFIX_MAP[prefix] || prefix;
        const tickerKey = `${tickerPrefix}:${rawSymbol}`;

        if (tickers[tickerKey]) {
            return tickers[tickerKey];
        }

        // Fallback: thử tìm với raw symbol
        for (const exchange of Object.values(TICKER_PREFIX_MAP)) {
            const key = `${exchange}:${rawSymbol}`;
            if (tickers[key]) {
                return tickers[key];
            }
        }
    }

    // Không có prefix - thử tìm theo thứ tự ưu tiên
    const priorityExchanges = ['BINANCE', 'BYBIT', 'OKX', 'OANDA'];
    for (const exchange of priorityExchanges) {
        const key = `${exchange}:${upperSymbol}`;
        if (tickers[key]) {
            return tickers[key];
        }
    }

    return null;
}


// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get base asset from symbol
export function getBaseAsset(symbol) {
    if (!symbol) return '';

    // Remove exchange prefix if present (e.g., "binance:btcusdt" -> "btcusdt")
    const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;

    const upper = cleanSymbol.toUpperCase();

    // If it has OANDA prefix or is a known forex format
    if (symbol.toUpperCase().startsWith('OANDA:') || (!upper.includes('USDT') && !upper.includes('BUSD') && !upper.includes('USDC') && !upper.includes('PERP') && !upper.includes('BTC') && !upper.includes('ETH'))) {
        // Assume format is like EURUSD, XAUUSD
        if (upper.length >= 6) {
            return upper.substring(0, 3);
        }
        return upper;
    }

    // Remove USDT, USDC, BUSD suffix
    return cleanSymbol
        .replace(/USDT$|USDC$|BUSD$|PERP$/i, '')
        .toLowerCase()
        .replace(/^1000/, '')  // Handle 1000PEPE etc
        .replace(/^10+/, '')   // Handle other prefixes
        .replace('_', '')      // Handle potential underscores
        .toUpperCase();
}

// Get coin logo URL
export function getCoinLogoUrl(symbol) {
    if (!symbol) return null;

    // Check if it's a crypto symbol (contains USDT, USDC, BUSD, or PERP)
    const isCrypto = /USDT|USDC|BUSD|PERP/i.test(symbol);

    if (!isCrypto) {
        // For Forex/Commodities, return null as per user request to use text initials
        return null;
    }

    const baseAsset = getBaseAsset(symbol).toLowerCase();
    return `https://huobicfg.s3.amazonaws.com/currency_icon/${baseAsset}.png`;
}

// Format price based on value
export function formatPrice(price) {
    if (!price || isNaN(price)) return '0.00';

    if (price >= 10000) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else if (price >= 1000) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (price >= 1) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    } else if (price >= 0.0001) {
        return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
    } else {
        return price.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 8 });
    }
}

// Format percentage
export function formatPercent(percent) {
    if (!percent || isNaN(percent)) return '0.00%';
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
}

// Format volume
export function formatVolume(volume) {
    if (!volume || isNaN(volume)) return '0';

    if (volume >= 1e9) {
        return (volume / 1e9).toFixed(2) + 'B';
    } else if (volume >= 1e6) {
        return (volume / 1e6).toFixed(2) + 'M';
    } else if (volume >= 1e3) {
        return (volume / 1e3).toFixed(2) + 'K';
    }
    return volume.toFixed(2);
}

// ============================================
// CATEGORY MANAGEMENT
// ============================================

// Set active category
export function setActiveCategory(categoryId) {
    activeCategory.value = categoryId;
    saveCategoriesToStorage();
}

// Add symbol to category
export function addSymbolToCategory(categoryId, symbol) {
    const cats = categories.value.map(cat => {
        if (cat.id === categoryId && !cat.symbols.includes(symbol)) {
            return { ...cat, symbols: [...cat.symbols, symbol] };
        }
        return cat;
    });
    categories.value = cats;
    saveCategoriesToStorage();
}

// Remove symbol from category
export function removeSymbolFromCategory(categoryId, symbol) {
    const cats = categories.value.map(cat => {
        if (cat.id === categoryId) {
            return { ...cat, symbols: cat.symbols.filter(s => s !== symbol) };
        }
        return cat;
    });
    categories.value = cats;
    saveCategoriesToStorage();
}

// Add new category
export function addCategory(category) {
    // Ensure unique ID
    let id = category.id;
    let counter = 1;
    while (categories.value.some(c => c.id === id)) {
        id = `${category.id}-${counter}`;
        counter++;
    }

    const newCategory = {
        ...category,
        id: id,
        symbols: category.symbols || [],
    };

    categories.value = [...categories.value, newCategory];
    activeCategory.value = id;
    saveCategoriesToStorage();
}

// Update existing category
export function updateCategory(categoryId, updates) {
    const cats = categories.value.map(cat => {
        if (cat.id === categoryId) {
            return { ...cat, ...updates };
        }
        return cat;
    });
    categories.value = cats;
    saveCategoriesToStorage();
}

// Sync symbols from datafeed sources into dedicated watchlists
export function syncDatafeedWatchlists(allSymbols) {
    if (!allSymbols || allSymbols.length === 0) return;

    // Mapping từ long prefix sang short prefix cho ticker lookup
    const PREFIX_SHORT_MAP = {
        'BINANCE_FUTURES': 'BINANCE',
        'BYBIT_FUTURES': 'BYBIT',
        'OKX_FUTURES': 'OKX',
        'OANDA': 'OANDA'
    };

    // Define exchange configurations
    const exchangeConfigs = [
        {
            id: 'BINANCE_FUTURES',
            shortPrefix: 'BINANCE',
            label: 'Binance',
            color: '#F3BA2F',
            filter: (s) => (s.datasource === 'BINANCE_FUTURES' || (s.exchange || '').toUpperCase().includes('BINANCE'))
        },
        {
            id: 'BYBIT_FUTURES',
            shortPrefix: 'BYBIT',
            label: 'Bybit',
            color: '#F7A600',
            filter: (s) => s.datasource === 'BYBIT_FUTURES' || (s.exchange || '').toUpperCase() === 'BYBIT FUTURES'
        },
        {
            id: 'OKX_FUTURES',
            shortPrefix: 'OKX',
            label: 'OKX',
            color: '#00C8FF',
            filter: (s) => s.datasource === 'OKX_FUTURES' || (s.exchange || '').toUpperCase() === 'OKX FUTURES'
        },
        {
            id: 'OANDA_FOREX',
            shortPrefix: 'OANDA',
            label: 'Forex',
            color: '#00A0DC',
            filter: (s) => (s.datasource === 'OANDA' || s.exchange === 'OANDA' || s.full_name?.startsWith('OANDA:')),
            skipUsdtFilter: true
        }
    ];

    const currentCats = [...categories.value];
    let changed = false;

    exchangeConfigs.forEach(config => {
        let exchangeSymbols = allSymbols.filter(config.filter);

        if (!config.skipUsdtFilter) {
            exchangeSymbols = exchangeSymbols.filter(s => (s.symbol || '').toUpperCase().endsWith('USDT'));
        }

        // Normalize symbol names với short prefix
        // VD: BINANCE_FUTURES:BTCUSDT -> BINANCE:BTCUSDT
        const symbolNames = exchangeSymbols.map(s => {
            let fullName = s.full_name || `${config.shortPrefix}:${s.symbol}`;

            // Chuyển đổi long prefix sang short prefix
            for (const [longPrefix, shortPrefix] of Object.entries(PREFIX_SHORT_MAP)) {
                if (fullName.startsWith(`${longPrefix}:`)) {
                    fullName = fullName.replace(`${longPrefix}:`, `${shortPrefix}:`);
                    break;
                }
            }

            return fullName;
        });

        // Find if this system category already exists
        const index = currentCats.findIndex(c => c.id === config.id);

        if (index > -1) {
            // Update symbols if they changed
            const oldSymbols = currentCats[index].symbols || [];
            if (oldSymbols.length !== symbolNames.length || !oldSymbols.every((val, i) => val === symbolNames[i])) {
                currentCats[index] = { ...currentCats[index], symbols: symbolNames };
                changed = true;
            }
        } else {
            // Add new system category
            currentCats.push({
                id: config.id,
                label: config.label,
                color: config.color,
                symbols: symbolNames,
                type: 'system'
            });
            changed = true;
        }
    });

    if (changed) {
        // Keep favorites first if possible
        currentCats.sort((a, b) => {
            if (a.id === 'favorites') return -1;
            if (b.id === 'favorites') return 1;
            return 0;
        });
        categories.value = currentCats;
        console.log('[Watchlist] Exchange categories synced with normalized symbol names');
    }
}


// Expose to window for datafeed manager to call
if (typeof window !== 'undefined') {
    window.syncDatafeedWatchlists = syncDatafeedWatchlists;
}

// Remove category
export function removeCategory(categoryId) {
    const cats = categories.value.filter(cat => cat.id !== categoryId);
    if (cats.length > 0) {
        categories.value = cats;
        // Switch to first category if deleted was active
        if (activeCategory.value === categoryId) {
            activeCategory.value = cats[0].id;
        }
        saveCategoriesToStorage();
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize: load from Firebase/storage
loadCategoriesFromStorage();
