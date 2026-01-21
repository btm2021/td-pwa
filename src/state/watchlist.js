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

// Subscribe to Binance Futures ticker stream
export function subscribeToTickers() {
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
                    const newTickerData = { ...tickerData.value };

                    data.forEach(ticker => {
                        const symbol = ticker.s;
                        newTickerData[symbol] = {
                            symbol: symbol,
                            price: parseFloat(ticker.c),
                            priceChange: parseFloat(ticker.p),
                            priceChangePercent: parseFloat(ticker.P),
                            high: parseFloat(ticker.h),
                            low: parseFloat(ticker.l),
                            volume: parseFloat(ticker.v),
                            quoteVolume: parseFloat(ticker.q),
                            lastUpdate: Date.now(),
                        };
                    });

                    tickerData.value = newTickerData;
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
}

// Get ticker for a symbol
export function getTicker(symbol) {
    return tickerData.value[symbol] || null;
}

// Get base asset from symbol
export function getBaseAsset(symbol) {
    // Remove USDT, USDC, BUSD suffix
    return symbol
        .replace(/USDT$|USDC$|BUSD$|PERP$/i, '')
        .toLowerCase()
        .replace(/^1000/, '')  // Handle 1000PEPE etc
        .replace(/^10+/, '');   // Handle other prefixes
}

// Get coin logo URL
export function getCoinLogoUrl(symbol) {
    const baseAsset = getBaseAsset(symbol);
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

// Set active category
export function setActiveCategory(categoryId) {
    activeCategory.value = categoryId;
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

// Save categories to localStorage
function saveCategoriesToStorage() {
    try {
        localStorage.setItem('watchlist_categories', JSON.stringify(categories.value));
        localStorage.setItem('watchlist_active_category', activeCategory.value);
    } catch (e) {
        console.warn('Could not save categories to localStorage:', e);
    }
}

// Load categories from localStorage
export function loadCategoriesFromStorage() {
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
        console.warn('Could not load categories from localStorage:', e);
    }
}

// Initialize: load from storage
loadCategoriesFromStorage();
