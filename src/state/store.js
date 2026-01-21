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
    // Create symbol object from name
    const baseAsset = sym.replace(/USDT$|USDC$|BUSD$/i, '');
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
    // Convert to uppercase and ensure USDT suffix
    let name = symbolName.toUpperCase();
    if (!name.endsWith('USDT') && !name.endsWith('USDC') && !name.endsWith('BUSD')) {
        name = name + 'USDT';
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
