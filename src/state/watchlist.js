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

// Default categories - user can add more
const defaultCategories = [
    {
        id: 'favorites',
        label: 'Favorites',
        color: '#FFD600',
        symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'],
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
                categories.value = data.categories;
                console.log('[Watchlist] Loaded from Firebase:', data.categories.length, 'categories');
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
                categories.value = parsed;
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

// Subscribe to Binance Futures ticker stream AND OANDA Polling
export function subscribeToTickers() {
    subscribeToBinance();
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
                        // Only update if it's already in watchlist or we want all
                        // For performance, maybe only update interested symbols?
                        // For now keep updating all as per original design
                        newTickerData[symbol] = {
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
            const forexSymbols = allSymbols.filter(s =>
                !s.endsWith('USDT') &&
                !s.endsWith('BUSD') &&
                !s.endsWith('USDC')
            );

            if (forexSymbols.length === 0) {
                lastInstruments = '';
                return;
            }

            const instruments = forexSymbols.map(s => {
                let clean = s.replace('OANDA:', '');
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

                                tickerData.value = {
                                    ...tickerData.value,
                                    [symbol]: {
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
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    if (oandaAbortController) {
        oandaAbortController.abort();
        oandaAbortController = null;
    }
}

// Get ticker for a symbol (handles prefixes like BINANCE:BTCUSDT)
export function getTicker(symbol) {
    if (!symbol) return null;

    // Direct lookup
    if (tickerData.value[symbol]) return tickerData.value[symbol];

    // Prefix lookup (strip BINANCE: etc)
    const cleanSymbol = symbol.includes(':') ? symbol.split(':')[1].toUpperCase() : symbol.toUpperCase();
    if (tickerData.value[cleanSymbol]) return tickerData.value[cleanSymbol];

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

    // Check for Forex (no USDT/USDC/BUSD/PERP suffix)
    if (!cleanSymbol.includes('USDT') && !cleanSymbol.includes('BUSD') && !cleanSymbol.includes('USDC') && !cleanSymbol.includes('PERP')) {
        // Assume format is like EURUSD, XAUUSD
        if (cleanSymbol.length === 6) {
            return cleanSymbol.substring(0, 3).toUpperCase();
        }
        return cleanSymbol.toUpperCase();
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

    const binanceSymbols = allSymbols
        .filter(s =>
            (s.exchange && s.exchange.toUpperCase().includes('BINANCE')) ||
            (s.full_name && s.full_name.startsWith('BINANCE:'))
        )
        .map(s => s.full_name);

    const oandaSymbols = allSymbols
        .filter(s =>
            (s.exchange && s.exchange.toUpperCase() === 'OANDA') ||
            (s.full_name && s.full_name.startsWith('OANDA:'))
        )
        .map(s => s.full_name);

    let updated = false;
    const currentCats = [...categories.value];

    // Helper to add or update systemic category
    const updateSystemCat = (id, label, color, symbols) => {
        const index = currentCats.findIndex(c => c.id === id);
        if (index > -1) {
            // Update existing
            currentCats[index] = { ...currentCats[index], symbols: symbols };
        } else {
            // Add new
            currentCats.push({
                id: id,
                label: label,
                color: color,
                symbols: symbols
            });
        }
        updated = true;
    };

    if (binanceSymbols.length > 0) {
        updateSystemCat('BINANCE_FUTURE', 'Binance Futures', '#F3BA2F', binanceSymbols);
    }

    if (oandaSymbols.length > 0) {
        updateSystemCat('OANDA', 'OANDA Forex', '#00A0DC', oandaSymbols);
    }

    if (updated) {
        categories.value = currentCats;
        saveCategoriesToStorage();
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
