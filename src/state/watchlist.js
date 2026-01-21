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

// OANDA Polling State
let oandaInterval = null;
const OANDA_ACCOUNT_ID = '101-004-27015242-001';
const OANDA_API_KEY = '7a53c4eeff879ba6118ddc416c2d2085-4a766a7d07af7bd629c07b451fe92984';
const OANDA_API_URL = 'https://api-fxpractice.oanda.com/v3';

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
    if (oandaInterval) return;

    const pollOANDA = async () => {
        try {
            const allSymbols = activeCategorySymbols.value;

            // Filter out crypto symbols loosely
            const forexSymbols = allSymbols.filter(s =>
                !s.endsWith('USDT') &&
                !s.endsWith('BUSD') &&
                !s.endsWith('USDC')
            );

            if (forexSymbols.length === 0) return;

            // Format for OANDA API: 
            // 1. Remove "OANDA:" prefix if present
            // 2. Ensure underscore format (EURUSD -> EUR_USD)
            const instruments = forexSymbols.map(s => {
                let clean = s.replace('OANDA:', '');

                // Already has underscore?
                if (clean.includes('_')) return clean;

                // Gold/Silver special cases
                if (clean === 'XAUUSD') return 'XAU_USD';
                if (clean === 'XAGUSD') return 'XAG_USD';

                // Standard 6-char forex pairs (EURUSD, GBPJPY)
                if (clean.length === 6) {
                    return `${clean.substring(0, 3)}_${clean.substring(3)}`;
                }

                // Fallback (might fail if unknown format)
                return clean;
            }).join(',');

            // If no valid instruments after processing, skip
            if (!instruments) return;

            const response = await fetch(`${OANDA_API_URL}/accounts/${OANDA_ACCOUNT_ID}/pricing?instruments=${instruments}`, {
                headers: {
                    'Authorization': `Bearer ${OANDA_API_KEY}`
                }
            });

            const data = await response.json();

            if (data.prices) {
                const newTickerData = { ...tickerData.value };
                let hasUpdates = false;

                data.prices.forEach(price => {
                    // Convert back from EUR_USD to EURUSD if that's how we stored it
                    // But wait, our search panel returns "EURUSD" (no underscore) from binance logic fallback?
                    // Actually unified feed returns whatever the source returns. 
                    // Let's standardize: Store in watchlist as "EURUSD", map to "EUR_USD" for API.

                    const instrument = price.instrument; // "EUR_USD"
                    const symbol = instrument.replace('_', ''); // "EURUSD"

                    const bid = parseFloat(price.bids[0].price);
                    const ask = parseFloat(price.asks[0].price);
                    const currentPrice = (bid + ask) / 2;

                    // OANDA doesn't give 24h change easily in pricing endpoint
                    // We can estimate or leave 0 for now

                    newTickerData[symbol] = {
                        symbol: symbol,
                        exchange: 'OANDA',
                        price: currentPrice,
                        priceChange: 0,
                        priceChangePercent: 0,
                        high: currentPrice, // Placeholder
                        low: currentPrice,  // Placeholder
                        volume: 0,
                        quoteVolume: 0,
                        lastUpdate: Date.now(),
                    };
                    hasUpdates = true;
                });

                if (hasUpdates) {
                    tickerData.value = newTickerData;
                }
            }

        } catch (error) {
            console.warn('[Watchlist] OANDA Poll error:', error);
        }
    };

    // Poll every 3 seconds
    pollOANDA(); // Initial
    oandaInterval = setInterval(pollOANDA, 3000);
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
    if (oandaInterval) {
        clearInterval(oandaInterval);
        oandaInterval = null;
    }
}

// Get ticker for a symbol
export function getTicker(symbol) {
    return tickerData.value[symbol] || null;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get base asset from symbol
export function getBaseAsset(symbol) {
    if (!symbol) return '';

    // Check for Forex (no USDT suffix)
    if (!symbol.includes('USDT') && !symbol.includes('BUSD') && !symbol.includes('PERP')) {
        // Assume format is like EURUSD, XAUUSD
        if (symbol.length === 6) {
            return symbol.substring(0, 3);
        }
    }

    // Remove USDT, USDC, BUSD suffix
    return symbol
        .replace(/USDT$|USDC$|BUSD$|PERP$/i, '')
        .toLowerCase()
        .replace(/^1000/, '')  // Handle 1000PEPE etc
        .replace(/^10+/, '')   // Handle other prefixes
        .replace('_', ''); // Handle potential underscores
}

// Get coin logo URL
export function getCoinLogoUrl(symbol) {
    const baseAsset = getBaseAsset(symbol).toLowerCase();

    // Check for Forex pairs
    if (!symbol.includes('USDT') && !symbol.includes('BUSD')) {
        // Forex flags/icons
        // Using a general flag service or fallback
        // For major currencies we can map to known flags if needed
        const forexMap = {
            'eur': 'https://s3-symbol-logo.tradingview.com/country/EU.svg',
            'usd': 'https://s3-symbol-logo.tradingview.com/country/US.svg',
            'gbp': 'https://s3-symbol-logo.tradingview.com/country/GB.svg',
            'jpy': 'https://s3-symbol-logo.tradingview.com/country/JP.svg',
            'aud': 'https://s3-symbol-logo.tradingview.com/country/AU.svg',
            'chf': 'https://s3-symbol-logo.tradingview.com/country/CH.svg',
            'cad': 'https://s3-symbol-logo.tradingview.com/country/CA.svg',
            'nzd': 'https://s3-symbol-logo.tradingview.com/country/NZ.svg',
            'xau': 'https://s3-symbol-logo.tradingview.com/metal/gold.svg',
            'xag': 'https://s3-symbol-logo.tradingview.com/metal/silver.svg'
        };

        if (forexMap[baseAsset]) {
            return forexMap[baseAsset];
        }
    }

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
