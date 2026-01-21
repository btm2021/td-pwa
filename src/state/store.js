import { signal, computed } from '@preact/signals';

// State signals
export const activeTab = signal('watchlist');
export const selectedSymbolName = signal('BTCUSDT');  // Use symbol name directly
export const selectedTimeframe = signal('5m');
export const isFullscreen = signal(false);
export const isChartReady = signal(false);

// Computed symbol object for Chart screen
export const selectedSymbol = computed(() => {
    const sym = selectedSymbolName.value;
    const isOanda = sym.startsWith('OANDA:');

    if (isOanda) {
        const clean = sym.replace('OANDA:', '');
        // Assume standard 6-char forex pair: EURUSD
        // Or check length
        let base = clean;
        let quote = '';
        if (clean.length === 6) {
            base = clean.substring(0, 3);
            quote = clean.substring(3);
        }

        return {
            id: sym.toLowerCase(),
            symbol: sym, // Keep full symbol for chart
            name: base,
            description: quote ? `${base} / ${quote}` : clean,
            exchange: 'OANDA',
        };
    }

    // Default Crypto
    // Create symbol object from name
    const baseAsset = sym.replace(/USDT$|USDC$|BUSD$|PERP$/i, '');
    return {
        id: sym.toLowerCase(),
        symbol: sym,
        name: baseAsset,
        description: `${baseAsset} / USDT Perpetual`,
        exchange: 'BINANCE',
    };
});

// Actions
export function setActiveTab(tab) {
    activeTab.value = tab;
}

export function setSelectedSymbol(symbolName) {
    // Convert to uppercase
    let name = symbolName.toUpperCase();

    // Check if it's explicitly OANDA
    const isOanda = name.startsWith('OANDA:');

    // If not OANDA and missing standard crypto suffixes, try to guess
    if (!isOanda && !name.endsWith('USDT') && !name.endsWith('USDC') && !name.endsWith('BUSD')) {
        // Simple heuristic: if length <= 5 it's likely a crypto ticker (BTC, ETH, MATIC)
        if (name.length <= 5) {
            name = name + 'USDT';
        }
        // If length is 6 (EURUSD) it might be forex, but could be PEOPLE
        // For now, if we don't have explicit info, we let it be or default to USDT?
        // Let's assume valid full names are passed. 
        // If user types "BTC", it becomes BTCUSDT.
        // If user types "EURUSD", safe to assume they want forex? 
        // Current behavior forced USDT. Let's relax it for known forex patterns or explicit OANDA prefix.
    }

    // Ensure OANDA prefix for known forex if missing
    // or rely on caller to provide OANDA: prefix
    if (!isOanda && (name === 'XAUUSD' || name === 'EURUSD' || name === 'GBPUSD' || name === 'USDJPY')) {
        name = 'OANDA:' + name;
    }
    selectedSymbolName.value = name;
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

// Navigation helpers
export function navigateToChart(symbol) {
    setSelectedSymbol(symbol);
}

export function navigateToTab(tab) {
    setActiveTab(tab);
}
