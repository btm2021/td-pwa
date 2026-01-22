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

// Default categories - includes all supported exchanges with popular USDT pairs
// Symbols use exchange prefix format (EXCHANGE:SYMBOL) to separate prices by exchange
const defaultCategories = [
    {
        id: 'favorites',
        label: 'Favorites',
        color: '#FFD600',
        symbols: ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:SOLUSDT'],
    },
    {
        id: 'BINANCE_FUTURES',
        label: 'Binance',
        color: '#F3BA2F',
        symbols: [
            'BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'BINANCE:BNBUSDT', 'BINANCE:SOLUSDT', 'BINANCE:XRPUSDT',
            'BINANCE:DOGEUSDT', 'BINANCE:ADAUSDT', 'BINANCE:AVAXUSDT', 'BINANCE:DOTUSDT', 'BINANCE:LINKUSDT',
            'BINANCE:MATICUSDT', 'BINANCE:LTCUSDT', 'BINANCE:UNIUSDT', 'BINANCE:ATOMUSDT', 'BINANCE:APTUSDT',
            'BINANCE:ARBUSDT', 'BINANCE:OPUSDT', 'BINANCE:SUIUSDT', 'BINANCE:NEARUSDT', 'BINANCE:INJUSDT'
        ],
    },
    {
        id: 'BYBIT_FUTURES',
        label: 'Bybit',
        color: '#F7A600',
        symbols: [
            'BYBIT:BTCUSDT', 'BYBIT:ETHUSDT', 'BYBIT:SOLUSDT', 'BYBIT:XRPUSDT', 'BYBIT:DOGEUSDT',
            'BYBIT:AVAXUSDT', 'BYBIT:LINKUSDT', 'BYBIT:MATICUSDT', 'BYBIT:LTCUSDT', 'BYBIT:APTUSDT',
            'BYBIT:ARBUSDT', 'BYBIT:OPUSDT', 'BYBIT:SUIUSDT', 'BYBIT:NEARUSDT', 'BYBIT:INJUSDT'
        ],
    },
    {
        id: 'OKX_FUTURES',
        label: 'OKX',
        color: '#00C8FF',
        symbols: [
            'OKX:BTCUSDT', 'OKX:ETHUSDT', 'OKX:SOLUSDT', 'OKX:XRPUSDT', 'OKX:DOGEUSDT',
            'OKX:AVAXUSDT', 'OKX:LINKUSDT', 'OKX:LTCUSDT', 'OKX:APTUSDT', 'OKX:ARBUSDT',
            'OKX:OPUSDT', 'OKX:SUIUSDT', 'OKX:NEARUSDT', 'OKX:INJUSDT', 'OKX:WLDUSDT'
        ],
    },
    {
        id: 'KUCOIN_FUTURES',
        label: 'KuCoin',
        color: '#23AF91',
        symbols: [
            'KUCOIN:BTCUSDT', 'KUCOIN:ETHUSDT', 'KUCOIN:SOLUSDT', 'KUCOIN:XRPUSDT', 'KUCOIN:DOGEUSDT',
            'KUCOIN:AVAXUSDT', 'KUCOIN:LINKUSDT', 'KUCOIN:LTCUSDT', 'KUCOIN:APTUSDT', 'KUCOIN:ARBUSDT'
        ],
    },
    {
        id: 'MEXC_FUTURES',
        label: 'MEXC',
        color: '#1972F5',
        symbols: [
            'MEXC:BTCUSDT', 'MEXC:ETHUSDT', 'MEXC:SOLUSDT', 'MEXC:XRPUSDT', 'MEXC:DOGEUSDT',
            'MEXC:AVAXUSDT', 'MEXC:LINKUSDT', 'MEXC:APTUSDT', 'MEXC:ARBUSDT', 'MEXC:SUIUSDT'
        ],
    },
    {
        id: 'OANDA_FOREX',
        label: 'Forex',
        color: '#00A0DC',
        symbols: [
            'OANDA:XAUUSD', 'OANDA:EURUSD', 'OANDA:GBPUSD', 'OANDA:USDJPY', 'OANDA:AUDUSD',
            'OANDA:USDCAD', 'OANDA:NZDUSD', 'OANDA:EURGBP', 'OANDA:EURJPY', 'OANDA:GBPJPY'
        ],
    },

];


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

            if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
                // Merge saved categories with default exchange categories
                const savedCategories = data.categories;
                const mergedCategories = [...defaultCategories];

                // Add user custom categories or update existing ones
                savedCategories.forEach(savedCat => {
                    const existingIndex = mergedCategories.findIndex(c => c.id === savedCat.id);
                    if (existingIndex > -1) {
                        // Update existing category with saved data (preserve user's symbols)
                        mergedCategories[existingIndex] = { ...mergedCategories[existingIndex], ...savedCat };
                    } else {
                        // Add new user category
                        mergedCategories.push(savedCat);
                    }
                });

                categories.value = mergedCategories;
                console.log('[Watchlist] Loaded from Firebase:', mergedCategories.length, 'categories');
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

// LocalStorage fallback
function saveCategoriesToLocalStorage() {
    try {
        localStorage.setItem('watchlist_categories', JSON.stringify(categories.value));
        localStorage.setItem('watchlist_active_category', activeCategory.value);
    } catch (e) {
        console.warn('[Watchlist] Could not save to localStorage:', e);
    }
}

function loadCategoriesFromLocalStorage() {
    try {
        const saved = localStorage.getItem('watchlist_categories');
        const savedActive = localStorage.getItem('watchlist_active_category');

        if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
                // Merge saved categories with default exchange categories
                const mergedCategories = [...defaultCategories];

                parsed.forEach(savedCat => {
                    const existingIndex = mergedCategories.findIndex(c => c.id === savedCat.id);
                    if (existingIndex > -1) {
                        mergedCategories[existingIndex] = { ...mergedCategories[existingIndex], ...savedCat };
                    } else {
                        mergedCategories.push(savedCat);
                    }
                });

                categories.value = mergedCategories;
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
    // Debounce saves
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        saveCategoriesToFirebase();
    }, 500);
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

// OKX WebSocket
let okxWs = null;
let okxReconnectTimeout = null;

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
                    // Update only Binance symbols
                    const newTickerData = { ...tickerData.value };
                    let hasUpdates = false;

                    data.forEach(ticker => {
                        const symbol = ticker.s;
                        // Store with exchange prefix for separation
                        const key = `BINANCE:${symbol}`;
                        newTickerData[key] = {
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
                        };
                        hasUpdates = true;
                    });


                    if (hasUpdates) {
                        tickerData.value = newTickerData;
                    }
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
function subscribeToBybit() {
    if (bybitWs && bybitWs.readyState === WebSocket.OPEN) {
        return;
    }

    const connect = () => {
        console.log('[Bybit WebSocket] Connecting to ticker stream...');
        bybitWs = new WebSocket('wss://stream.bybit.com/v5/public/linear');

        bybitWs.onopen = () => {
            console.log('[Bybit WebSocket] Connected');
            // Subscribe to popular USDT perpetual tickers
            bybitWs.send(JSON.stringify({
                op: 'subscribe',
                args: [
                    'tickers.BTCUSDT', 'tickers.ETHUSDT', 'tickers.SOLUSDT', 'tickers.XRPUSDT', 'tickers.DOGEUSDT',
                    'tickers.AVAXUSDT', 'tickers.LINKUSDT', 'tickers.MATICUSDT', 'tickers.LTCUSDT', 'tickers.APTUSDT',
                    'tickers.ARBUSDT', 'tickers.OPUSDT', 'tickers.SUIUSDT', 'tickers.NEARUSDT', 'tickers.INJUSDT'
                ]
            }));
        };

        bybitWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.topic && data.topic.startsWith('tickers.') && data.data) {
                    const ticker = data.data;
                    const symbol = ticker.symbol;

                    const newTickerData = { ...tickerData.value };
                    // Store with exchange prefix for separation
                    const key = `BYBIT:${symbol}`;
                    newTickerData[key] = {
                        symbol: symbol,
                        exchange: 'BYBIT',
                        price: parseFloat(ticker.lastPrice),
                        priceChange: parseFloat(ticker.price24hPcnt) * parseFloat(ticker.lastPrice) / 100,
                        priceChangePercent: parseFloat(ticker.price24hPcnt) * 100,
                        high: parseFloat(ticker.highPrice24h),
                        low: parseFloat(ticker.lowPrice24h),
                        volume: parseFloat(ticker.volume24h),
                        quoteVolume: parseFloat(ticker.turnover24h),
                        lastUpdate: Date.now(),
                    };
                    tickerData.value = newTickerData;
                }
            } catch (error) {
                // Ignore heartbeat messages
            }
        };

        bybitWs.onerror = (error) => {
            console.error('[Bybit WebSocket] Error:', error);
        };

        bybitWs.onclose = () => {
            console.log('[Bybit WebSocket] Disconnected, reconnecting in 5s...');
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

    const connect = () => {
        console.log('[OKX WebSocket] Connecting to ticker stream...');
        okxWs = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');

        okxWs.onopen = () => {
            console.log('[OKX WebSocket] Connected');
            // Subscribe to popular USDT perpetual tickers
            okxWs.send(JSON.stringify({
                op: 'subscribe',
                args: [
                    { channel: 'tickers', instId: 'BTC-USDT-SWAP' },
                    { channel: 'tickers', instId: 'ETH-USDT-SWAP' },
                    { channel: 'tickers', instId: 'SOL-USDT-SWAP' },
                    { channel: 'tickers', instId: 'XRP-USDT-SWAP' },
                    { channel: 'tickers', instId: 'DOGE-USDT-SWAP' },
                    { channel: 'tickers', instId: 'AVAX-USDT-SWAP' },
                    { channel: 'tickers', instId: 'LINK-USDT-SWAP' },
                    { channel: 'tickers', instId: 'LTC-USDT-SWAP' },
                    { channel: 'tickers', instId: 'APT-USDT-SWAP' },
                    { channel: 'tickers', instId: 'ARB-USDT-SWAP' },
                    { channel: 'tickers', instId: 'OP-USDT-SWAP' },
                    { channel: 'tickers', instId: 'SUI-USDT-SWAP' },
                    { channel: 'tickers', instId: 'NEAR-USDT-SWAP' },
                    { channel: 'tickers', instId: 'INJ-USDT-SWAP' },
                    { channel: 'tickers', instId: 'WLD-USDT-SWAP' }
                ]
            }));
        };

        okxWs.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.data && data.data.length > 0) {
                    data.data.forEach(ticker => {
                        // Convert OKX instId to symbol format (BTC-USDT-SWAP -> BTCUSDT)
                        const symbol = ticker.instId.replace('-USDT-SWAP', 'USDT').replace('-', '');

                        const newTickerData = { ...tickerData.value };
                        // Store with exchange prefix for separation
                        const key = `OKX:${symbol}`;
                        newTickerData[key] = {
                            symbol: symbol,
                            exchange: 'OKX',
                            price: parseFloat(ticker.last),
                            priceChange: parseFloat(ticker.last) - parseFloat(ticker.open24h),
                            priceChangePercent: ((parseFloat(ticker.last) - parseFloat(ticker.open24h)) / parseFloat(ticker.open24h)) * 100,
                            high: parseFloat(ticker.high24h),
                            low: parseFloat(ticker.low24h),
                            volume: parseFloat(ticker.vol24h),
                            quoteVolume: parseFloat(ticker.volCcy24h),
                            lastUpdate: Date.now(),
                        };
                        tickerData.value = newTickerData;
                    });
                }

            } catch (error) {
                // Ignore heartbeat/error messages
            }
        };

        okxWs.onerror = (error) => {
            console.error('[OKX WebSocket] Error:', error);
        };

        okxWs.onclose = () => {
            console.log('[OKX WebSocket] Disconnected, reconnecting in 5s...');
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
                                tickerData.value = {
                                    ...tickerData.value,
                                    [key]: {
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
                                    }
                                };
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

    // Bybit
    if (bybitReconnectTimeout) {
        clearTimeout(bybitReconnectTimeout);
        bybitReconnectTimeout = null;
    }
    if (bybitWs) {
        bybitWs.close();
        bybitWs = null;
    }

    // OKX
    if (okxReconnectTimeout) {
        clearTimeout(okxReconnectTimeout);
        okxReconnectTimeout = null;
    }
    if (okxWs) {
        okxWs.close();
        okxWs = null;
    }

    // OANDA
    if (oandaAbortController) {
        oandaAbortController.abort();
        oandaAbortController = null;
    }
}


// Get ticker for a symbol (expects format like BINANCE:BTCUSDT)
export function getTicker(symbol) {
    if (!symbol) return null;

    // Normalize to uppercase
    const upperSymbol = symbol.toUpperCase();

    // Direct lookup with exact key (EXCHANGE:SYMBOL format)
    if (tickerData.value[upperSymbol]) return tickerData.value[upperSymbol];

    // If symbol has no prefix, try common exchanges
    if (!upperSymbol.includes(':')) {
        // Try Binance first (most common)
        const binanceKey = `BINANCE:${upperSymbol}`;
        if (tickerData.value[binanceKey]) return tickerData.value[binanceKey];

        // Try other exchanges
        const exchanges = ['BYBIT', 'OKX', 'KUCOIN', 'MEXC', 'OANDA'];
        for (const exchange of exchanges) {
            const key = `${exchange}:${upperSymbol}`;
            if (tickerData.value[key]) return tickerData.value[key];
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

    // Define exchange configurations
    const exchangeConfigs = [
        {
            id: 'BINANCE_FUTURES',
            label: 'Binance Futures',
            color: '#F3BA2F',
            filter: (s) => {
                const exchange = (s.exchange || '').toUpperCase();
                const fullName = (s.full_name || '').toUpperCase();
                const symbol = (s.symbol || '').toUpperCase();
                return (exchange.includes('BINANCE') && exchange.includes('FUTURES')) ||
                    fullName.startsWith('BINANCE:');
            }
        },
        {
            id: 'BYBIT_FUTURES',
            label: 'Bybit Futures',
            color: '#F7A600',
            filter: (s) => {
                const exchange = (s.exchange || '').toUpperCase();
                const fullName = (s.full_name || '').toUpperCase();
                return exchange.includes('BYBIT') && exchange.includes('FUTURES') ||
                    fullName.startsWith('BYBIT_FUTURES:') || fullName.startsWith('BYBITF:');
            }
        },
        {
            id: 'OKX_FUTURES',
            label: 'OKX Futures',
            color: '#00C8FF',
            filter: (s) => {
                const exchange = (s.exchange || '').toUpperCase();
                const fullName = (s.full_name || '').toUpperCase();
                return exchange.includes('OKX') && exchange.includes('FUTURES') ||
                    fullName.startsWith('OKX_FUTURES:') || fullName.startsWith('OKXF:');
            }
        },
        {
            id: 'KUCOIN_FUTURES',
            label: 'KuCoin Futures',
            color: '#23AF91',
            filter: (s) => {
                const exchange = (s.exchange || '').toUpperCase();
                const fullName = (s.full_name || '').toUpperCase();
                return exchange.includes('KUCOIN') && exchange.includes('FUTURES') ||
                    fullName.startsWith('KUCOIN_FUTURES:') || fullName.startsWith('KCF:');
            }
        },
        {
            id: 'MEXC_FUTURES',
            label: 'MEXC Futures',
            color: '#1972F5',
            filter: (s) => {
                const exchange = (s.exchange || '').toUpperCase();
                const fullName = (s.full_name || '').toUpperCase();
                return exchange.includes('MEXC') && exchange.includes('FUTURES') ||
                    fullName.startsWith('MEXC_FUTURES:') || fullName.startsWith('MXF:');
            }
        },
        {
            id: 'OANDA_FOREX',
            label: 'OANDA Forex',
            color: '#00A0DC',
            filter: (s) => {
                const exchange = (s.exchange || '').toUpperCase();
                const fullName = (s.full_name || '').toUpperCase();
                return exchange === 'OANDA' || fullName.startsWith('OANDA:');
            },
            skipUsdtFilter: true // Forex doesn't have USDT pairs
        }
    ];

    let updated = false;
    const currentCats = [...categories.value];

    // Helper to add or update systemic category
    const updateSystemCat = (id, label, color, symbols) => {
        if (symbols.length === 0) return; // Don't create empty categories

        const index = currentCats.findIndex(c => c.id === id);
        if (index > -1) {
            // Update existing - only update if symbols changed
            const existingSymbols = currentCats[index].symbols || [];
            if (JSON.stringify(existingSymbols.sort()) !== JSON.stringify(symbols.sort())) {
                currentCats[index] = { ...currentCats[index], symbols: symbols };
                updated = true;
            }
        } else {
            // Add new
            currentCats.push({
                id: id,
                label: label,
                color: color,
                symbols: symbols
            });
            updated = true;
        }
    };

    // Process each exchange
    exchangeConfigs.forEach(config => {
        let symbols = allSymbols.filter(config.filter);

        // Filter to USDT pairs only (except for Forex)
        if (!config.skipUsdtFilter) {
            symbols = symbols.filter(s => {
                const symbol = (s.symbol || '').toUpperCase();
                return symbol.endsWith('USDT');
            });
        }

        // Get full_name for watchlist
        const symbolNames = symbols.map(s => s.full_name || s.symbol);

        // Limit to top 100 symbols to avoid performance issues
        const limitedSymbols = symbolNames.slice(0, 100);

        updateSystemCat(config.id, config.label, config.color, limitedSymbols);
    });

    if (updated) {
        categories.value = currentCats;
        saveCategoriesToStorage();
        console.log('[Watchlist] Synced categories from datasources');
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
