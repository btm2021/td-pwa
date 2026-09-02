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
export const activeCategory = signal('BINANCE_FUTURES');

// Loading state
export const isWatchlistLoading = signal(true);

// Get symbols for active category
export const activeCategorySymbols = computed(() => {
    const cat = categories.value.find(c => c.id === activeCategory.value);
    return cat ? cat.symbols : [];
});

// Ticker data from WebSocket (symbol -> ticker data)
export const tickerData = signal({});

// Connection state is keyed by the exchange watchlist ID (for example,
// BINANCE_FUTURES). It lets the UI indicate only streams that are actually open.
export const exchangeConnectionStatus = signal({});

function setExchangeConnectionStatus(exchangeId, status) {
    if (exchangeConnectionStatus.value[exchangeId] === status) return;
    exchangeConnectionStatus.value = {
        ...exchangeConnectionStatus.value,
        [exchangeId]: status
    };
}

// Active market connection. Only one exchange feed may run at a time.
let ws = null;
let reconnectTimeout = null;
let activeMarketExchange = null;
let marketGeneration = 0;
let snapshotAbortController = null;
let binanceFuturesSnapshotPromise = null;
let snapshotRetryTimeout = null;
let snapshotRetryAttempt = 0;

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

function syncLoadedDatafeedWatchlists() {
    if (typeof window !== 'undefined' && window.allSearchableSymbols?.length > 0) {
        syncDatafeedWatchlists(window.allSearchableSymbols);
    }
}

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
                // We only load user categories from Firebase and clean out digits/meme symbols
                const userCategories = data.categories
                    .filter(c => c.type === 'user' || c.id === 'favorites')
                    .map(c => ({
                        ...c,
                        symbols: (c.symbols || []).filter(s => {
                            const raw = s.includes(':') ? s.split(':')[1] : s;
                            return !/^\d/.test(raw);
                        })
                    }));

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
        syncLoadedDatafeedWatchlists();
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
                // Ensure they are marked as user/favorites and clean out digits/meme symbols
                const userCats = parsed.map(c => ({
                    ...c,
                    symbols: (c.symbols || []).filter(s => {
                        const raw = s.includes(':') ? s.split(':')[1] : s;
                        return !/^\d/.test(raw);
                    }),
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
        syncLoadedDatafeedWatchlists();
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

// Ticker update batching
let tickerUpdateBuffer = {};
let tickerUpdateTimer = null;

function queueTickerUpdate(key, data) {
    const previousTicker = tickerUpdateBuffer[key] || tickerData.value[key];

    // A snapshot and the WebSocket start together. Ignore a late snapshot row
    // when a newer live event for the same symbol has already arrived.
    if (previousTicker?.lastUpdate && data.lastUpdate && data.lastUpdate < previousTicker.lastUpdate) {
        return;
    }

    tickerUpdateBuffer[key] = {
        ...previousTicker,
        ...data
    };
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

function clearTickerUpdateQueue() {
    if (tickerUpdateTimer) {
        clearTimeout(tickerUpdateTimer);
        tickerUpdateTimer = null;
    }
    tickerUpdateBuffer = {};
}

function parseFiniteNumber(value) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : null;
}

function normalizeBinanceSnapshotTicker(ticker) {
    const symbol = ticker?.symbol;
    const lastPrice = parseFiniteNumber(ticker?.lastPrice);
    if (!symbol || lastPrice === null || /^\d/.test(symbol)) return null;

    return {
        symbol,
        exchange: 'BINANCE',
        price: lastPrice,
        lastPrice,
        priceChange: parseFiniteNumber(ticker.priceChange),
        priceChangePercent: parseFiniteNumber(ticker.priceChangePercent),
        openPrice: parseFiniteNumber(ticker.openPrice),
        high: parseFiniteNumber(ticker.highPrice),
        low: parseFiniteNumber(ticker.lowPrice),
        volume: parseFiniteNumber(ticker.volume),
        quoteVolume: parseFiniteNumber(ticker.quoteVolume),
        lastUpdate: Number(ticker.closeTime) || Date.now()
    };
}

function normalizeBinanceStreamTicker(ticker) {
    // The current all-market stream contains both USD-M (1) and COIN-M (2).
    if (ticker?.st != null && Number(ticker.st) !== 1) return null;

    const symbol = ticker?.s;
    const lastPrice = parseFiniteNumber(ticker?.c);
    if (!symbol || lastPrice === null || /^\d/.test(symbol)) return null;

    return {
        symbol,
        exchange: 'BINANCE',
        price: lastPrice,
        lastPrice,
        priceChange: parseFiniteNumber(ticker.p),
        priceChangePercent: parseFiniteNumber(ticker.P),
        openPrice: parseFiniteNumber(ticker.o),
        high: parseFiniteNumber(ticker.h),
        low: parseFiniteNumber(ticker.l),
        volume: parseFiniteNumber(ticker.v),
        quoteVolume: parseFiniteNumber(ticker.q),
        lastUpdate: Number(ticker.C) || Number(ticker.E) || Date.now()
    };
}

function isCurrentMarket(generation, exchangeId) {
    return generation === marketGeneration && activeMarketExchange === exchangeId;
}

// One request returns the complete USD-M 24h status table. It starts as soon as
// Binance is selected instead of waiting for the WebSocket handshake.
function loadBinanceFuturesSnapshot(generation) {
    if (binanceFuturesSnapshotPromise) return binanceFuturesSnapshotPromise;
    if (snapshotRetryTimeout) {
        clearTimeout(snapshotRetryTimeout);
        snapshotRetryTimeout = null;
    }

    const controller = new AbortController();
    snapshotAbortController = controller;

    const request = fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
        signal: controller.signal
    })
        .then((response) => {
            if (!response.ok) throw new Error(`Binance Futures snapshot failed: ${response.status}`);
            return response.json();
        })
        .then((tickers) => {
            if (!isCurrentMarket(generation, 'BINANCE_FUTURES')) return;
            if (!Array.isArray(tickers)) throw new Error('Binance Futures snapshot returned an invalid payload');
            snapshotRetryAttempt = 0;

            tickers.forEach((ticker) => {
                const normalized = normalizeBinanceSnapshotTicker(ticker);
                if (normalized) queueTickerUpdate(`BINANCE:${normalized.symbol}`, normalized);
            });
        })
        .catch((error) => {
            if (error.name === 'AbortError') return;
            if (binanceFuturesSnapshotPromise === request) {
                binanceFuturesSnapshotPromise = null;
            }
            console.error('[Binance Futures] Unable to load the initial ticker snapshot:', error);

            if (isCurrentMarket(generation, 'BINANCE_FUTURES')) {
                const retryDelay = Math.min(5000 * (2 ** snapshotRetryAttempt), 60000);
                snapshotRetryAttempt += 1;
                snapshotRetryTimeout = setTimeout(() => {
                    snapshotRetryTimeout = null;
                    loadBinanceFuturesSnapshot(generation);
                }, retryDelay);
            }
        })
        .finally(() => {
            if (snapshotAbortController === controller) {
                snapshotAbortController = null;
            }
        });

    binanceFuturesSnapshotPromise = request;
    return binanceFuturesSnapshotPromise;
}

function normalizeMarketExchange(exchangeId) {
    switch (exchangeId) {
        case 'BINANCE':
        case 'BINANCE_FUTURES':
            return 'BINANCE_FUTURES';
        case 'OANDA':
        case 'OANDA_FOREX':
            return 'OANDA_FOREX';
        case 'all':
        case 'favorites':
        case null:
        case undefined:
            return 'BINANCE_FUTURES';
        default:
            // A custom list made entirely from OANDA symbols follows OANDA.
            // Mixed/empty lists use the application default, Binance Futures.
            const category = categories.value.find((item) => item.id === exchangeId);
            const symbols = category?.symbols || [];
            return symbols.length > 0 && symbols.every((symbol) => symbol.toUpperCase().startsWith('OANDA:'))
                ? 'OANDA_FOREX'
                : 'BINANCE_FUTURES';
    }
}

// Legacy entry point now follows the single-active-exchange contract.
export function subscribeToTickers() {
    return subscribeToExchange('BINANCE_FUTURES');
}

export function subscribeToExchange(exchangeId) {
    const targetExchange = normalizeMarketExchange(exchangeId);

    if (targetExchange === activeMarketExchange) {
        if (targetExchange === 'BINANCE_FUTURES') {
            const snapshot = loadBinanceFuturesSnapshot(marketGeneration);
            if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
                subscribeToBinance(marketGeneration);
            }
            return snapshot;
        }
        if (oandaAbortController) return Promise.resolve();
    }

    stopActiveMarketConnection();
    activeMarketExchange = targetExchange;
    const generation = ++marketGeneration;

    if (targetExchange === 'BINANCE_FUTURES') {
        setExchangeConnectionStatus(targetExchange, 'connecting');
        const snapshot = loadBinanceFuturesSnapshot(generation);
        subscribeToBinance(generation);
        return snapshot;
    }

    setExchangeConnectionStatus(targetExchange, 'connecting');
    subscribeToOANDA(generation);
    return Promise.resolve();
}

function subscribeToBinance(generation) {
    if (!isCurrentMarket(generation, 'BINANCE_FUTURES')) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    const connect = () => {
        if (!isCurrentMarket(generation, 'BINANCE_FUTURES')) return;

        console.log('[WebSocket] Connecting to Binance Futures ticker stream...');
        setExchangeConnectionStatus('BINANCE_FUTURES', 'connecting');
        const socket = new WebSocket('wss://fstream.binance.com/market/ws/!ticker@arr');
        ws = socket;

        socket.onopen = () => {
            if (!isCurrentMarket(generation, 'BINANCE_FUTURES') || ws !== socket) {
                socket.close();
                return;
            }
            console.log('[WebSocket] Connected to ticker stream');
            setExchangeConnectionStatus('BINANCE_FUTURES', 'connected');
        };

        socket.onmessage = (event) => {
            if (!isCurrentMarket(generation, 'BINANCE_FUTURES') || ws !== socket) return;

            try {
                const payload = JSON.parse(event.data);
                const rows = Array.isArray(payload) ? payload : payload?.data;
                if (!Array.isArray(rows)) return;

                rows.forEach((ticker) => {
                    const normalized = normalizeBinanceStreamTicker(ticker);
                    if (normalized) queueTickerUpdate(`BINANCE:${normalized.symbol}`, normalized);
                });
            } catch (error) {
                console.error('[WebSocket] Parse error:', error);
            }
        };

        socket.onerror = (error) => {
            console.error('[WebSocket] Error:', error);
        };

        socket.onclose = () => {
            if (!isCurrentMarket(generation, 'BINANCE_FUTURES') || ws !== socket) return;
            ws = null;
            console.log('[WebSocket] Disconnected, reconnecting in 3s...');
            setExchangeConnectionStatus('BINANCE_FUTURES', 'disconnected');
            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                connect();
            }, 3000);
        };
    };

    connect();
}

let oandaSymbolsUnsubscribe = null;

function subscribeToOANDA(generation) {
    let lastInstruments = '';

    const startStream = async () => {
        if (!isCurrentMarket(generation, 'OANDA_FOREX')) return;
        let controller = null;

        try {
            const oandaCategory = categories.value.find((category) => category.id === 'OANDA_FOREX');
            const searchableOandaSymbols = typeof window !== 'undefined'
                ? (window.allSearchableSymbols || [])
                    .filter((symbol) => symbol.datasource === 'OANDA')
                    .map((symbol) => symbol.full_name || `OANDA:${symbol.symbol}`)
                : [];
            const allSymbols = oandaCategory?.symbols?.length
                ? oandaCategory.symbols
                : searchableOandaSymbols;
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
                if (oandaAbortController) {
                    console.log('[OANDA] No OANDA symbols to stream, stopping stream.');
                    oandaAbortController.abort();
                    oandaAbortController = null;
                }
                lastInstruments = '';
                setExchangeConnectionStatus('OANDA_FOREX', 'disconnected');
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

            if (!instruments) return;
            if (instruments === lastInstruments && oandaAbortController && !oandaAbortController.signal.aborted) {
                return;
            }

            if (oandaAbortController) oandaAbortController.abort();
            controller = new AbortController();
            oandaAbortController = controller;
            lastInstruments = instruments;

            console.log(`[OANDA] Starting stream for: ${instruments}`);

            const response = await fetch(`${OANDA_STREAM_URL}/accounts/${OANDA_ACCOUNT_ID}/pricing/stream?instruments=${instruments}`, {
                headers: {
                    'Authorization': `Bearer ${OANDA_API_KEY}`
                },
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`OANDA pricing stream failed: ${response.status}`);
            if (!isCurrentMarket(generation, 'OANDA_FOREX') || oandaAbortController !== controller) {
                controller.abort();
                return;
            }

            setExchangeConnectionStatus('OANDA_FOREX', 'connected');

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
                                if (!isCurrentMarket(generation, 'OANDA_FOREX') || oandaAbortController !== controller) return;
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
                                    lastPrice: currentPrice,
                                    priceChange: null,
                                    priceChangePercent: null,
                                    high: currentPrice,
                                    low: currentPrice,
                                    volume: null,
                                    quoteVolume: null,
                                    lastUpdate: Date.now(),
                                });
                            }

                        } catch (e) {
                            // Heartbeat or malformed
                        }
                    }
                }
            }

            if (oandaAbortController === controller && isCurrentMarket(generation, 'OANDA_FOREX')) {
                oandaAbortController = null;
                lastInstruments = '';
                setExchangeConnectionStatus('OANDA_FOREX', 'disconnected');
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    startStream();
                }, 5000);
            }
        } catch (error) {
            if (error.name !== 'AbortError' &&
                isCurrentMarket(generation, 'OANDA_FOREX') &&
                oandaAbortController === controller) {
                console.warn('[OANDA] Stream error, reconnecting in 5s...', error);
                if (oandaAbortController === controller) oandaAbortController = null;
                lastInstruments = '';
                setExchangeConnectionStatus('OANDA_FOREX', 'disconnected');
                reconnectTimeout = setTimeout(() => {
                    reconnectTimeout = null;
                    startStream();
                }, 5000);
            }
        }
    };

    oandaSymbolsUnsubscribe = categories.subscribe(() => {
        startStream();
    });
}

function stopActiveMarketConnection() {
    const previousExchange = activeMarketExchange;
    activeMarketExchange = null;
    marketGeneration += 1;

    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    if (snapshotAbortController) {
        snapshotAbortController.abort();
        snapshotAbortController = null;
    }
    if (snapshotRetryTimeout) {
        clearTimeout(snapshotRetryTimeout);
        snapshotRetryTimeout = null;
    }
    binanceFuturesSnapshotPromise = null;
    snapshotRetryAttempt = 0;

    if (ws) {
        const socket = ws;
        ws = null;
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
    }

    if (oandaAbortController) {
        oandaAbortController.abort();
        oandaAbortController = null;
    }

    if (oandaSymbolsUnsubscribe) {
        oandaSymbolsUnsubscribe();
        oandaSymbolsUnsubscribe = null;
    }

    clearTickerUpdateQueue();
    if (previousExchange) setExchangeConnectionStatus(previousExchange, 'disconnected');
}

// Unsubscribe from the single active exchange feed.
export function unsubscribeFromTickers() {
    stopActiveMarketConnection();
}


/**
 * Mapping từ symbol prefix sang ticker prefix
 * Vì ticker keys có thể khác với symbol prefix trong một số trường hợp
 */
const TICKER_PREFIX_MAP = {
    'BINANCE': 'BINANCE',
    'BINANCE_FUTURES': 'BINANCE',
    'OANDA': 'OANDA'
};

/**
 * Get ticker for a symbol
 * Supports multiple formats:
 * - BINANCE:BTCUSDT
 * - BINANCE_FUTURES:BTCUSDT
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

        // Explicitly prefixed symbols should not borrow prices from another market.
        if (Object.prototype.hasOwnProperty.call(TICKER_PREFIX_MAP, prefix)) {
            return null;
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
    const priorityExchanges = ['BINANCE', 'OANDA'];
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
        'OANDA': 'OANDA'
    };

    // Define exchange configurations
    const exchangeConfigs = [
        {
            id: 'BINANCE_FUTURES',
            shortPrefix: 'BINANCE',
            label: 'Binance',
            color: '#F3BA2F',
            filter: (s) => s.datasource === 'BINANCE_FUTURES'
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

    const supportedSystemCategoryIds = new Set(exchangeConfigs.map(config => config.id));
    const removedExchangeSymbol = /^(?:BINANCE_SPOT|BYBIT(?:_FUTURES)?|OKX(?:_FUTURES)?):/i;
    const categoriesWithoutRemovedExchanges = categories.value.map((category) => ({
        ...category,
        symbols: (category.symbols || []).filter((symbol) => {
            if (removedExchangeSymbol.test(symbol)) return false;
            const raw = symbol.includes(':') ? symbol.split(':')[1] : symbol;
            return !/^\d/.test(raw);
        })
    }));
    const currentCats = categoriesWithoutRemovedExchanges.filter((category) =>
        category.type !== 'system' || supportedSystemCategoryIds.has(category.id)
    );
    let changed = currentCats.length !== categories.value.length || currentCats.some((category, index) =>
        category.symbols.length !== categories.value[index]?.symbols?.length
    );

    exchangeConfigs.forEach(config => {
        let exchangeSymbols = allSymbols.filter(config.filter);

        if (!config.skipUsdtFilter) {
            exchangeSymbols = exchangeSymbols.filter(s => {
                const sym = (s.symbol || '').toUpperCase();
                return sym.endsWith('USDT') && !/^\d/.test(sym);
            });
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
        if (!currentCats.some(category => category.id === activeCategory.value)) {
            activeCategory.value = currentCats[0]?.id || 'favorites';
        }
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
