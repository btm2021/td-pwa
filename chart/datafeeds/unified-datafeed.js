/**
 * Unified Datafeed Initialization
 * Khởi tạo DatafeedManager với tất cả datasources
 */

// Wait for all scripts to load
window.initializeDatafeed = function () {
    // Check dependencies
    if (typeof DatafeedManager === 'undefined' ||
        typeof BinanceFuturesDatasource === 'undefined') {
        console.error('[Datafeed] Required classes not loaded');
        return null;
    }

    // Create manager
    const manager = new DatafeedManager();

    // Register Binance Futures (default)
    manager.registerDatasource(new BinanceFuturesDatasource(), true);

    // Register OANDA if available
    if (typeof OANDADatasource !== 'undefined') {
        manager.registerDatasource(new OANDADatasource(), false);
        console.log('[Datafeed] OANDA datasource registered');
    }

    // Register Bybit Futures if available
    if (typeof BybitFuturesDatasource !== 'undefined') {
        manager.registerDatasource(new BybitFuturesDatasource(), false);
        console.log('[Datafeed] Bybit Futures datasource registered');
    }

    // Register Bybit Spot if available
    if (typeof BybitSpotDatasource !== 'undefined') {
        manager.registerDatasource(new BybitSpotDatasource(), false);
        console.log('[Datafeed] Bybit Spot datasource registered');
    }

    // Register OKX Futures if available
    if (typeof OKXFuturesDatasource !== 'undefined') {
        manager.registerDatasource(new OKXFuturesDatasource(), false);
        console.log('[Datafeed] OKX Futures datasource registered');
    }

    // Register OKX Spot if available
    if (typeof OKXSpotDatasource !== 'undefined') {
        manager.registerDatasource(new OKXSpotDatasource(), false);
        console.log('[Datafeed] OKX Spot datasource registered');
    }

    // Register KuCoin Futures if available
    if (typeof KuCoinFuturesDatasource !== 'undefined') {
        manager.registerDatasource(new KuCoinFuturesDatasource(), false);
        console.log('[Datafeed] KuCoin Futures datasource registered');
    }

    // Register KuCoin Spot if available
    if (typeof KuCoinSpotDatasource !== 'undefined') {
        manager.registerDatasource(new KuCoinSpotDatasource(), false);
        console.log('[Datafeed] KuCoin Spot datasource registered');
    }

    // Register MEXC Futures if available
    if (typeof MEXCFuturesDatasource !== 'undefined') {
        manager.registerDatasource(new MEXCFuturesDatasource(), false);
        console.log('[Datafeed] MEXC Futures datasource registered');
    }

    // Register MEXC Spot if available
    if (typeof MEXCSpotDatasource !== 'undefined') {
        manager.registerDatasource(new MEXCSpotDatasource(), false);
        console.log('[Datafeed] MEXC Spot datasource registered');
    }

    // Initialize all datasources (fetch exchange info)
    manager.initialize().then(() => {
        console.log('[Datafeed] All datasources initialized');
    }).catch(error => {
        console.error('[Datafeed] Initialization error:', error);
    });

    // Store globally
    window.unifiedDatafeed = manager;

    return manager;
};

// Auto-initialize on load
window.addEventListener('load', () => {
    // Wait a bit for other scripts to parse
    setTimeout(() => {
        if (!window.unifiedDatafeed) {
            window.initializeDatafeed();
        }
    }, 100);
});

// Create unified datafeed that wraps DatafeedManager
class UnifiedDatafeed {
    constructor() {
        if (window.unifiedDatafeed) {
            this.manager = window.unifiedDatafeed;
        } else {
            this.manager = window.initializeDatafeed();
        }
    }

    onReady(callback) {
        if (this.manager) {
            this.manager.onReady(callback);
        } else {
            // Fallback to basic config
            setTimeout(() => callback({
                supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                exchanges: [
                    { value: 'BINANCE', name: 'Binance', desc: 'Binance Futures' },
                    { value: 'OANDA', name: 'OANDA', desc: 'OANDA Forex' }
                ],
                symbols_types: [
                    { name: 'Crypto', value: 'crypto' },
                    { name: 'Forex', value: 'forex' }
                ],
                supports_marks: false,
                supports_timescale_marks: false,
                supports_time: true
            }), 0);
        }
    }

    searchSymbols(userInput, exchange, symbolType, onResultReadyCallback) {
        if (this.manager) {
            this.manager.searchSymbols(userInput, exchange, symbolType, onResultReadyCallback);
        } else {
            onResultReadyCallback([]);
        }
    }

    resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback) {
        if (this.manager) {
            this.manager.resolveSymbol(symbolName, onSymbolResolvedCallback, onResolveErrorCallback);
        } else {
            onResolveErrorCallback('Datafeed not initialized');
        }
    }

    getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
        if (this.manager) {
            this.manager.getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback);
        } else {
            onErrorCallback('Datafeed not initialized');
        }
    }

    subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID, onResetCacheNeededCallback) {
        if (this.manager) {
            this.manager.subscribeBars(symbolInfo, resolution, onRealtimeCallback, subscriberUID);
        }
    }

    unsubscribeBars(subscriberUID) {
        if (this.manager) {
            this.manager.unsubscribeBars(subscriberUID);
        }
    }
}

// Export globally
window.UnifiedDatafeed = UnifiedDatafeed;
