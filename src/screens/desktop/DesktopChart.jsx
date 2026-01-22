import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../../components/Icon';
import { SearchPanel } from '../../components/SearchPanel';
import { ReplayControls, BarSelectionSidebar, useReplayEngine, replayUIVisible } from '../../components/ReplayControls';
import { selectedSymbol, selectedTimeframe, setSelectedTimeframe, setSelectedSymbol, toggleFullscreen, isChartReady, setChartReady } from '../../state/store';
import { timeframes, tickerData, formatPrice, formatPercent } from '../../state/watchlist';
import '../../styles/replay.css';

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
    const datafeedRef = useRef(null);
    const symbol = selectedSymbol.value;
    const currentTimeframe = selectedTimeframe.value;
    const chartReady = isChartReady.value;
    const tickers = tickerData.value;

    const [showSearch, setShowSearch] = useState(false);
    const lastResolutionRef = useRef(null);

    // Replay engine
    const replayEngine = useReplayEngine(tvWidgetRef, datafeedRef);

    // Get ticker data for current symbol
    const ticker = tickers[symbol.symbol] || {};
    const price = ticker.price || 0;
    const changePercent = ticker.priceChangePercent || 0;
    const isPositive = changePercent >= 0;

    useEffect(() => {
        const initChart = async () => {
            if (!chartContainerRef.current) return;
            chartContainerRef.current.innerHTML = '';

            if (typeof TradingView === 'undefined') {
                console.warn('TradingView not loaded');
                return;
            }

            // Check if datafeed is available (UnifiedDatafeed or BinanceDatafeed)
            const DatafeedClass = typeof UnifiedDatafeed !== 'undefined' ? UnifiedDatafeed :
                typeof BinanceDatafeed !== 'undefined' ? BinanceDatafeed : null;
            if (!DatafeedClass) {
                console.warn('No datafeed loaded yet');
                return;
            }

            try {
                const datafeed = new DatafeedClass();
                datafeedRef.current = datafeed; // Store for replay engine
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

                const currentRes = intervalMap[currentTimeframe] || '15';

                const widgetOptions = {
                    symbol: symbol.symbol.replace('.P', ''),
                    datafeed: datafeed,
                    interval: currentRes,
                    container: chartContainerRef.current,
                    library_path: '/chart/charting_library/',
                    locale: 'vi',
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

                        'header_compare',
                        'use_localstorage_for_settings',
                        'timeframes_toolbar',
                        'show_object_tree',
                        'popup_hints',
                        'bottom_toolbar',
                        'control_bar',
                        'open_account_manager',
                        'trading_account_manager',
                        'trading_notifications',
                        'header_undo_redo'
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
                    favorites: {
                        intervals: ['1', '15', '60', '240'],
                        chartTypes: ['Candles', 'Line']
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

                    // Add Replay button to TradingView header
                    tvWidgetRef.current.headerReady().then(() => {
                        const replayBtn = tvWidgetRef.current.createButton({ align: 'left' });
                        replayBtn.setAttribute('title', 'Bar Replay');
                        replayBtn.classList.add('tv-replay-btn');
                        replayBtn.innerHTML = `
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
                                <polyline points="1 4 1 10 7 10"></polyline>
                                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                            </svg>
                         
                        `;
                        replayBtn.addEventListener('click', () => {
                            replayUIVisible.value = !replayUIVisible.value;
                        });
                    });

                    // Sync interval change back to state
                    tvWidgetRef.current.subscribe('onIntervalChanged', (interval) => {
                        const reverseIntervalMap = {
                            '1': '1m', '5': '5m', '15': '15m', '30': '30m',
                            '60': '1h', '240': '4h', '1D': '1d', '1W': '1w'
                        };
                        const tf = reverseIntervalMap[interval];
                        if (tf && tf !== selectedTimeframe.value) {
                            setSelectedTimeframe(tf);
                        }
                    });
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
    }, [symbol.symbol, currentTimeframe]);

    // Update timeframe

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

            {/* Replay Controls (Sidebar) */}
            <ReplayControls engine={replayEngine} />

            {/* Bar Selection Sidebar (Sidebar) */}
            <BarSelectionSidebar engine={replayEngine} />

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
