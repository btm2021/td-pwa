import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../../components/Icon';
import { SearchPanel } from '../../components/SearchPanel';
import { selectedSymbol, selectedTimeframe, setSelectedTimeframe, setSelectedSymbol, toggleFullscreen, isChartReady, setChartReady } from '../../state/store';
import { timeframes, tickerData, formatPrice, formatPercent } from '../../state/watchlist';

// Get custom studies creators
function getCustomStudies() {
    const studies = [];
    if (typeof createATRBot !== 'undefined') studies.push(createATRBot);
    if (typeof createVSR !== 'undefined') studies.push(createVSR);
    if (typeof createVSR_1 !== 'undefined') studies.push(createVSR_1);
    if (typeof createVIDYA !== 'undefined') studies.push(createVIDYA);
    if (typeof createSessionVP !== 'undefined') studies.push(createSessionVP);
    if (typeof createSwingPoints !== 'undefined') studies.push(createSwingPoints);
    if (typeof createKAMA !== 'undefined') studies.push(createKAMA);
    if (typeof createSMC !== 'undefined') studies.push(createSMC);
    if (typeof createFVG !== 'undefined') studies.push(createFVG);
    return studies;
}

export function DesktopChart() {
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);
    const symbol = selectedSymbol.value;
    const currentTimeframe = selectedTimeframe.value;
    const chartReady = isChartReady.value;
    const tickers = tickerData.value;

    const [showSearch, setShowSearch] = useState(false);

    // Get ticker data for current symbol
    const ticker = tickers[symbol.symbol] || {};
    const price = ticker.price || 0;
    const changePercent = ticker.priceChangePercent || 0;
    const isPositive = changePercent >= 0;

    useEffect(() => {
        const initChart = async () => {
            if (!chartContainerRef.current) return;
            chartContainerRef.current.innerHTML = '';

            if (typeof TradingView === 'undefined' || typeof BinanceDatafeed === 'undefined') {
                console.warn('TradingView or BinanceDatafeed not loaded');
                return;
            }

            try {
                const datafeed = new BinanceDatafeed();
                let saveLoadAdapter = null;
                if (typeof SaveLoadAdapter !== 'undefined') {
                    try {
                        const adapter = new SaveLoadAdapter('anonymous');
                        saveLoadAdapter = adapter.getAdapter();
                    } catch (e) {
                        console.warn('Could not initialize SaveLoadAdapter:', e);
                    }
                }

                const intervalMap = {
                    '1m': '1', '5m': '5', '15m': '15', '30m': '30',
                    '1h': '60', '4h': '240', '1d': '1D', '1w': '1W',
                };

                const customStudies = getCustomStudies();

                const widgetOptions = {
                    symbol: symbol.symbol.replace('.P', ''),
                    datafeed: datafeed,
                    interval: intervalMap[currentTimeframe] || '5',
                    container: chartContainerRef.current,
                    library_path: '/chart/charting_library/',
                    locale: 'en',
                    custom_indicators_getter: customStudies.length > 0
                        ? function (PineJS) {
                            return Promise.resolve(customStudies.map(fn => fn(PineJS)));
                        }
                        : undefined,
                    save_load_adapter: saveLoadAdapter,
                    auto_save_delay: 5,
                    load_last_chart: true,

                    // Desktop features enabled
                    disabled_features: [
                        'header_symbol_search',
                        'header_compare',
                        'use_localstorage_for_settings',
                    ],

                    enabled_features: [
                        'study_templates',
                        'side_toolbar_in_fullscreen_mode',
                        'legend_context_menu',
                        'items_favoriting',
                        'save_chart_properties_to_local_storage',
                    ],

                    fullscreen: false,
                    autosize: true,
                    theme: 'dark',
                    timezone: 'Etc/UTC',
                    toolbar_bg: '#0B0B0E',

                    loading_screen: {
                        backgroundColor: '#0B0B0E',
                        foregroundColor: '#2979FF'
                    },

                    overrides: {
                        'paneProperties.background': '#0B0B0E',
                        'paneProperties.backgroundType': 'solid',
                        'paneProperties.vertGridProperties.color': '#1A1A1F',
                        'paneProperties.horzGridProperties.color': '#1A1A1F',
                        'paneProperties.legendProperties.showStudyArguments': true,
                        'paneProperties.legendProperties.showStudyTitles': true,
                        'paneProperties.legendProperties.showStudyValues': true,
                        'paneProperties.legendProperties.showSeriesTitle': true,
                        'paneProperties.legendProperties.showSeriesOHLC': true,
                        'paneProperties.legendProperties.showLegend': true,
                        'paneProperties.legendProperties.showBarChange': true,
                        'scalesProperties.textColor': '#A0A0A8',
                        'scalesProperties.lineColor': '#2A2A30',
                        'scalesProperties.backgroundColor': '#0B0B0E',
                        'mainSeriesProperties.candleStyle.upColor': '#00C853',
                        'mainSeriesProperties.candleStyle.downColor': '#FF3B30',
                        'mainSeriesProperties.candleStyle.drawWick': true,
                        'mainSeriesProperties.candleStyle.drawBorder': true,
                        'mainSeriesProperties.candleStyle.borderUpColor': '#00C853',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#FF3B30',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#00C853',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#FF3B30',
                    },

                    studies_overrides: {
                        'volume.volume.color.0': '#FF3B30',
                        'volume.volume.color.1': '#00C853',
                    },
                };

                tvWidgetRef.current = new TradingView.widget(widgetOptions);

                tvWidgetRef.current.onChartReady(() => {
                    console.log('Desktop TradingView chart ready');
                    setChartReady(true);
                });

            } catch (error) {
                console.error('Error initializing chart:', error);
            }
        };

        const timeoutId = setTimeout(initChart, 500);

        return () => {
            clearTimeout(timeoutId);
            if (tvWidgetRef.current) {
                try { tvWidgetRef.current.remove(); } catch (e) { }
                tvWidgetRef.current = null;
            }
        };
    }, [symbol.symbol]);

    // Update timeframe
    useEffect(() => {
        if (tvWidgetRef.current && chartReady) {
            const intervalMap = {
                '1m': '1', '5m': '5', '15m': '15', '30m': '30',
                '1h': '60', '4h': '240', '1d': '1D', '1w': '1W',
            };
            try {
                tvWidgetRef.current.chart().setResolution(intervalMap[currentTimeframe] || '5');
            } catch (e) { }
        }
    }, [currentTimeframe, chartReady]);

    const handleSymbolSelect = (sym) => {
        setSelectedSymbol(sym);
        setChartReady(false);
        setShowSearch(false);
    };

    return (
        <div className="desktop-chart">


            {/* Chart Container */}
            <div ref={chartContainerRef} className="desktop-chart__container">
                {!chartReady && (
                    <div className="chart-loading">
                        <div className="spinner" />
                        <div className="chart-loading__text">
                            Loading {symbol.symbol} chart...
                        </div>
                    </div>
                )}
            </div>

            {/* Search Panel */}
            {showSearch && (
                <SearchPanel
                    onClose={() => setShowSearch(false)}
                    onSelectSymbol={handleSymbolSelect}
                />
            )}
        </div>
    );
}
