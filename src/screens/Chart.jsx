import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SymbolPicker } from '../components/WheelPicker';
import { ChartTypePicker } from '../components/ChartControls';
import {
    selectedSymbol,
    selectedTimeframe,
    setSelectedSymbol,
    setActiveTab,
    toggleFullscreen,
    isChartReady,
    setChartReady,
} from '../state/store';
import { setDeviceMode } from '../hooks/useDeviceMode';
import {
    getTicker,
    formatPrice,
    formatPercent,
    tickerData,
} from '../state/watchlist';

// Get custom studies creators
function getCustomStudies() {
    const studies = [];
    const names = [
        'createATRBot', 'createVSR', 'createVSR_1', 'createVIDYA',
        'createSessionVP', 'createSwingPoints', 'createKAMA',
        'createSMC', 'createFVG'
    ];

    names.forEach(name => {
        if (typeof window[name] === 'function') {
            studies.push(window[name]);
        } else if (typeof globalThis[name] === 'function') {
            studies.push(globalThis[name]);
        }
    });

    if (studies.length === 0) {
        console.warn('[Chart] No custom studies found in global scope yet.');
    } else {
        console.log(`[Chart] Found ${studies.length} custom studies.`);
    }

    return studies;
}

const INTERVAL_MAP = {
    '1m': '1',
    '5m': '5',
    '15m': '15',
    '30m': '30',
    '1h': '60',
    '4h': '240',
    '1d': '1D',
    '1w': '1W',
};

export function Chart() {
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);
    const symbol = selectedSymbol.value;
    const currentTimeframe = selectedTimeframe.value;
    const chartReady = isChartReady.value;

    const [showSymbolPicker, setShowSymbolPicker] = useState(false);
    const [showChartTypePicker, setShowChartTypePicker] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [currentChartType, setCurrentChartType] = useState(1);
    const [tick, setTick] = useState(0);

    // Live ticker for price header
    useEffect(() => {
        const unsub = tickerData.subscribe(() => setTick((t) => t + 1));
        return unsub;
    }, []);

    const ticker = getTicker(symbol.tickerKey || symbol.fullSymbol || symbol.symbol);
    const price = ticker?.price ?? ticker?.last ?? null;
    const changePct = ticker?.priceChangePercent ?? ticker?.changePercent ?? null;
    const isUp = changePct == null ? true : changePct >= 0;
    void tick; // force re-render on ticker updates

    useEffect(() => {
        const initChart = async () => {
            if (!chartContainerRef.current) return;

            chartContainerRef.current.innerHTML = '';

            if (typeof TradingView === 'undefined') {
                console.warn('TradingView library not loaded yet');
                return;
            }

            const DatafeedClass = typeof UnifiedDatafeed !== 'undefined' ? UnifiedDatafeed :
                typeof BinanceDatafeed !== 'undefined' ? BinanceDatafeed : null;
            if (!DatafeedClass) {
                console.warn('No datafeed loaded yet');
                return;
            }

            try {
                const datafeed = new DatafeedClass();

                let saveLoadAdapter = null;
                if (typeof SaveLoadAdapter !== 'undefined') {
                    try {
                        const adapter = new SaveLoadAdapter('anonymous');
                        saveLoadAdapter = adapter.getAdapter();
                    } catch (e) {
                        console.warn('Could not initialize SaveLoadAdapter:', e);
                    }
                }

                const chartSymbol = symbol.datafeedSymbol || symbol.fullSymbol || symbol.symbol;
                console.log('[Chart] Initializing with symbol:', chartSymbol);

                const widgetOptions = {
                    symbol: chartSymbol,
                    datafeed: datafeed,
                    interval: INTERVAL_MAP[currentTimeframe] || '15',
                    container: chartContainerRef.current,
                    library_path: '/chart/charting_library/',
                    locale: 'en',

                    custom_indicators_getter: function (PineJS) {
                        const studies = getCustomStudies();
                        return Promise.resolve(studies.map(fn => fn(PineJS)));
                    },

                    save_load_adapter: saveLoadAdapter,
                    auto_save_delay: 5,
                    load_last_chart: true,

                    disabled_features: [
                        'show_object_tree',
                        'header_widget',
                        'header_symbol_search',
                        'header_compare',
                        'header_undo_redo',
                        'header_screenshot',
                        'header_fullscreen_button',
                        'header_settings',
                        'header_chart_type',
                        'header_indicators',
                        'header_resolutions',
                        'compare_symbol',
                        'left_toolbar',
                        'context_menus',
                        'control_bar',
                        'timeframes_toolbar',
                        'border_around_the_chart',
                        'go_to_date',
                    ],

                    enabled_features: [
                        'hide_left_toolbar_by_default',
                        'disable_resolution_rebuild',
                        'study_templates',
                        'side_toolbar_in_fullscreen_mode',
                        'legend_context_menu',
                    ],

                    fullscreen: false,
                    autosize: true,
                    theme: 'dark',
                    timezone: 'Etc/UTC',
                    toolbar_bg: '#0B0E14',
                    loading_screen: {
                        backgroundColor: '#0B0E14',
                        foregroundColor: '#2962FF',
                    },

                    overrides: {
                        'paneProperties.background': '#0B0E14',
                        'paneProperties.backgroundType': 'solid',
                        'paneProperties.vertGridProperties.color': '#161B24',
                        'paneProperties.horzGridProperties.color': '#161B24',
                        'paneProperties.legendProperties.showStudyArguments': true,
                        'paneProperties.legendProperties.showStudyTitles': true,
                        'paneProperties.legendProperties.showStudyValues': true,
                        'paneProperties.legendProperties.showSeriesTitle': true,
                        'paneProperties.legendProperties.showSeriesOHLC': true,
                        'paneProperties.legendProperties.showLegend': true,
                        'paneProperties.legendProperties.showBarChange': true,
                        'scalesProperties.textColor': '#8F96A3',
                        'scalesProperties.lineColor': '#202631',
                        'scalesProperties.backgroundColor': '#0B0E14',
                        'mainSeriesProperties.candleStyle.upColor': '#22AB94',
                        'mainSeriesProperties.candleStyle.downColor': '#F23645',
                        'mainSeriesProperties.candleStyle.drawWick': true,
                        'mainSeriesProperties.candleStyle.drawBorder': true,
                        'mainSeriesProperties.candleStyle.borderUpColor': '#22AB94',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#F23645',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#22AB94',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#F23645',
                    },
                    studies_overrides: {
                        'volume.volume.color.0': '#F23645',
                        'volume.volume.color.1': '#22AB94',
                    },
                };

                tvWidgetRef.current = new TradingView.widget(widgetOptions);

                tvWidgetRef.current.onChartReady(() => {
                    console.log('TradingView chart is ready');
                    setChartReady(true);
                    try {
                        setCurrentChartType(tvWidgetRef.current.chart().chartType());
                    } catch (e) {
                        // Chart type not available yet
                    }
                });
            } catch (error) {
                console.error('Error initializing TradingView chart:', error);
            }
        };

        const timeoutId = setTimeout(initChart, 500);

        return () => {
            clearTimeout(timeoutId);
            if (tvWidgetRef.current) {
                try {
                    tvWidgetRef.current.remove();
                } catch (e) {
                    // Widget may already be removed
                }
                tvWidgetRef.current = null;
            }
        };
    }, [symbol.symbol]);

    useEffect(() => {
        if (tvWidgetRef.current && chartReady) {
            try {
                tvWidgetRef.current.chart().setResolution(INTERVAL_MAP[currentTimeframe] || '15');
            } catch (e) {
                // Chart not ready yet
            }
        }
    }, [currentTimeframe, chartReady]);

    const handleSymbolChange = (newSymbol) => {
        setSelectedSymbol(newSymbol);
        setChartReady(false);
    };

    const handleChartTypeChange = (typeId) => {
        if (tvWidgetRef.current && chartReady) {
            try {
                tvWidgetRef.current.chart().setChartType(typeId);
                setCurrentChartType(typeId);
            } catch (e) {
                console.error('Error changing chart type:', e);
            }
        }
    };

    const handleOpenDrawingTools = () => {
        if (tvWidgetRef.current && chartReady) {
            try {
                tvWidgetRef.current.chart().executeActionById('drawingToolbarAction');
            } catch (e) {
                console.error('Error opening drawing tools:', e);
            }
        }
    };

    const handleOpenIndicators = () => {
        if (tvWidgetRef.current && chartReady) {
            try {
                tvWidgetRef.current.chart().executeActionById('insertIndicator');
            } catch (e) {
                console.error('Error opening indicators dialog:', e);
            }
        }
    };

    return (
        <div className="screen screen--no-padding screen--full-height chart-screen">
            <header className="tv-chart-header">
                <button
                    type="button"
                    className="tv-chart-header__symbol"
                    onClick={() => setShowSymbolPicker(true)}
                    aria-label={`Change symbol, currently ${symbol.symbol}`}
                >
                    <span className={`tv-chart-header__asset ${symbol.name === 'BTC' ? 'is-bitcoin' : ''}`}>
                        {symbol.name?.charAt(0) || 'T'}
                    </span>
                    <span className="tv-chart-header__identity">
                        <span className="tv-chart-header__symbol-line">
                            <span className="tv-chart-header__symbol-name">{symbol.symbol}</span>
                            <Icon name="chevronDown" size={14} />
                        </span>
                        <span className="tv-chart-header__market">{symbol.description} · {symbol.exchange}</span>
                    </span>
                </button>

                <div className="tv-chart-header__price">
                    <span className={`tv-chart-header__last ${isUp ? 'is-up' : 'is-down'}`}>
                        {price != null ? formatPrice(price) : '—'}
                    </span>
                    <span className={`tv-chart-header__change ${isUp ? 'is-up' : 'is-down'}`}>
                        {changePct != null ? formatPercent(changePct) : '—'}
                    </span>
                </div>

                <button
                    type="button"
                    className={`tv-chart-header__icon-btn ${isFavorite ? 'is-active' : ''}`}
                    title={isFavorite ? 'Remove from watchlist' : 'Add to watchlist'}
                    aria-pressed={isFavorite}
                    onClick={() => setIsFavorite((value) => !value)}
                >
                    <Icon name={isFavorite ? 'star' : 'starOutline'} size={20} />
                </button>
                <button
                    type="button"
                    className="tv-chart-header__icon-btn"
                    title="More chart options"
                    aria-expanded={showMoreMenu}
                    onClick={() => setShowMoreMenu((value) => !value)}
                >
                    <Icon name="more" size={20} />
                </button>

                {showMoreMenu && (
                    <div className="tv-chart-more" role="menu">
                        <button type="button" role="menuitem" onClick={() => { setShowSymbolPicker(true); setShowMoreMenu(false); }}>
                            <Icon name="search" size={18} />
                            <span>Search symbol</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { toggleFullscreen(); setShowMoreMenu(false); }}>
                            <Icon name="fullscreen" size={18} />
                            <span>Full screen</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setShowChartTypePicker(true); setShowMoreMenu(false); }}>
                            <Icon name="chartCandles" size={18} />
                            <span>Chart type</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { handleOpenIndicators(); setShowMoreMenu(false); }}>
                            <Icon name="indicators" size={18} />
                            <span>Indicators</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { handleOpenDrawingTools(); setShowMoreMenu(false); }}>
                            <Icon name="draw" size={18} />
                            <span>Draw</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => { setActiveTab('calendar'); setShowMoreMenu(false); }}>
                            <Icon name="calendar" size={18} />
                            <span>Calendar</span>
                        </button>
                        <button type="button" role="menuitem" onClick={() => setDeviceMode('desktop')}>
                            <Icon name="desktop" size={18} />
                            <span>Desktop mode</span>
                        </button>
                    </div>
                )}
            </header>

            <div ref={chartContainerRef} className="chart-container">
                {!chartReady && (
                    <div className="chart-loading">
                        <div className="spinner"></div>
                        <div className="chart-loading__text">
                            Loading {symbol.symbol}…
                        </div>
                    </div>
                )}
            </div>

            {showSymbolPicker && (
                <SymbolPicker
                    value={symbol.symbol}
                    onChange={handleSymbolChange}
                    onClose={() => setShowSymbolPicker(false)}
                />
            )}

            {showChartTypePicker && (
                <ChartTypePicker
                    currentType={currentChartType}
                    onChange={handleChartTypeChange}
                    onClose={() => setShowChartTypePicker(false)}
                />
            )}
        </div>
    );
}
