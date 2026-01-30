import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SymbolPicker, TimeframePicker } from '../components/WheelPicker';
import { ChartTypePicker, IndicatorsPicker } from '../components/ChartControls';
import { selectedSymbol, selectedTimeframe, setSelectedTimeframe, setSelectedSymbol, toggleFullscreen, isChartReady, setChartReady } from '../state/store';
import { timeframes } from '../state/watchlist';

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
        // Fallback for some environments where they might be added later
        console.warn('[Chart] No custom studies found in global scope yet.');
    } else {
        console.log(`[Chart] Found ${studies.length} custom studies.`);
    }

    return studies;
}

export function Chart() {
    const chartContainerRef = useRef(null);
    const tvWidgetRef = useRef(null);
    const symbol = selectedSymbol.value;
    const currentTimeframe = selectedTimeframe.value;
    const chartReady = isChartReady.value;

    const [showSymbolPicker, setShowSymbolPicker] = useState(false);
    const [showTimeframePicker, setShowTimeframePicker] = useState(false);
    const [showChartTypePicker, setShowChartTypePicker] = useState(false);
    const [currentChartType, setCurrentChartType] = useState(1); // Default: Candles

    useEffect(() => {
        // Initialize TradingView chart
        const initChart = async () => {
            if (!chartContainerRef.current) return;

            // Clear container
            chartContainerRef.current.innerHTML = '';

            // Check if TradingView library is available
            if (typeof TradingView === 'undefined') {
                console.warn('TradingView library not loaded yet');
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
                // Create datafeed instance
                const datafeed = new DatafeedClass();

                // Create save/load adapter if available
                let saveLoadAdapter = null;
                if (typeof SaveLoadAdapter !== 'undefined') {
                    try {
                        const adapter = new SaveLoadAdapter('anonymous');
                        saveLoadAdapter = adapter.getAdapter();
                        console.log('SaveLoadAdapter initialized');
                    } catch (e) {
                        console.warn('Could not initialize SaveLoadAdapter:', e);
                    }
                }

                // Map our timeframe format to TradingView format
                const intervalMap = {
                    '1m': '1',
                    '5m': '5',
                    '15m': '15',
                    '30m': '30',
                    '1h': '60',
                    '4h': '240',
                    '1d': '1D',
                    '1w': '1W',
                };

                // Get custom studies
                const customStudies = getCustomStudies();

                // Sử dụng datafeedSymbol để đảm bảo đúng datasource được sử dụng
                // VD: BINANCE_FUTURES:BTCUSDT, BYBIT_FUTURES:ETHUSDT, OKX_FUTURES:SOLUSDT
                const chartSymbol = symbol.datafeedSymbol || symbol.fullSymbol || symbol.symbol;
                console.log('[Chart] Initializing with symbol:', chartSymbol, 'from:', symbol);

                const widgetOptions = {
                    symbol: chartSymbol,
                    datafeed: datafeed,
                    interval: intervalMap[currentTimeframe] || '15',
                    container: chartContainerRef.current,
                    library_path: '/chart/charting_library/',
                    locale: 'en',

                    // Custom studies
                    custom_indicators_getter: function (PineJS) {
                        const studies = getCustomStudies();
                        console.log('[Chart] custom_indicators_getter called. Returning studies:', studies.length);
                        return Promise.resolve(studies.map(fn => fn(PineJS)));
                    },

                    // Save/Load adapter
                    save_load_adapter: saveLoadAdapter,
                    auto_save_delay: 5,
                    load_last_chart: true,

                    // Disable features for mobile-like experience
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
                        'go_to_date'
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

                    // Dark theme styling - đen đỏ hơn
                    toolbar_bg: '#000000',
                    loading_screen: {
                        backgroundColor: '#000000',
                        foregroundColor: '#ff4444'
                    },

                    overrides: {
                        'paneProperties.background': '#000000',
                        'paneProperties.backgroundType': 'solid',
                        'paneProperties.vertGridProperties.color': '#1a0000',
                        'paneProperties.horzGridProperties.color': '#1a0000',
                        'paneProperties.legendProperties.showStudyArguments': true,
                        'paneProperties.legendProperties.showStudyTitles': true,
                        'paneProperties.legendProperties.showStudyValues': true,
                        'paneProperties.legendProperties.showSeriesTitle': true,
                        'paneProperties.legendProperties.showSeriesOHLC': true,
                        'paneProperties.legendProperties.showLegend': true,
                        'paneProperties.legendProperties.showBarChange': true,
                        'scalesProperties.textColor': '#888888',
                        'scalesProperties.lineColor': '#1a0000',
                        'scalesProperties.backgroundColor': '#000000',
                        'mainSeriesProperties.candleStyle.upColor': '#00ff88',
                        'mainSeriesProperties.candleStyle.downColor': '#ff4444',
                        'mainSeriesProperties.candleStyle.drawWick': true,
                        'mainSeriesProperties.candleStyle.drawBorder': true,
                        'mainSeriesProperties.candleStyle.borderUpColor': '#00ff88',
                        'mainSeriesProperties.candleStyle.borderDownColor': '#ff4444',
                        'mainSeriesProperties.candleStyle.wickUpColor': '#00ff88',
                        'mainSeriesProperties.candleStyle.wickDownColor': '#ff4444',
                    },
                    studies_overrides: {
                        'volume.volume.color.0': '#ff4444',
                        'volume.volume.color.1': '#00ff88',
                    },
                };

                tvWidgetRef.current = new TradingView.widget(widgetOptions);

                tvWidgetRef.current.onChartReady(() => {
                    console.log('TradingView chart is ready');
                    setChartReady(true);

                    // Get current chart type
                    try {
                        const chartType = tvWidgetRef.current.chart().chartType();
                        setCurrentChartType(chartType);
                    } catch (e) {
                        // Chart type not available yet
                    }
                });

            } catch (error) {
                console.error('Error initializing TradingView chart:', error);
            }
        };

        // Wait a bit for scripts to load
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

    // Update chart timeframe
    useEffect(() => {
        if (tvWidgetRef.current && chartReady) {
            const intervalMap = {
                '1m': '1',
                '5m': '5',
                '15m': '15',
                '30m': '30',
                '1h': '60',
                '4h': '240',
                '1d': '1D',
                '1w': '1W',
            };

            try {
                tvWidgetRef.current.chart().setResolution(intervalMap[currentTimeframe] || '15');
            } catch (e) {
                // Chart not ready yet
            }
        }
    }, [currentTimeframe, chartReady]);

    const handleSymbolChange = (newSymbol) => {
        setSelectedSymbol(newSymbol);
        setChartReady(false);
    };

    const handleTimeframeChange = (tf) => {
        setSelectedTimeframe(tf);
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

    // Get timeframe label
    const currentTfLabel = timeframes.find(tf => tf.id === currentTimeframe)?.label || currentTimeframe.toUpperCase();

    return (
        <div className="screen screen--no-padding screen--full-height chart-screen">
            {/* Chart Container */}
            <div
                ref={chartContainerRef}
                className="chart-container"
            >
                {/* Loading state */}
                {!chartReady && (
                    <div className="chart-loading">
                        <div className="spinner"></div>
                        <div className="chart-loading__text">
                            Loading {symbol.symbol} chart...
                        </div>
                    </div>
                )}
            </div>
            {/* Chart Toolbar */}
            <div className="chart-toolbar">
                {/* Symbol Button */}
                <button
                    className="chart-toolbar__btn chart-toolbar__btn--symbol"
                    onClick={() => setShowSymbolPicker(true)}
                >
                    <span>{symbol.symbol}</span>
                    <Icon name="chevronDown" size={14} />
                </button>

                {/* Divider */}
                <div className="chart-toolbar__divider" />

                {/* Timeframe Button */}
                <button
                    className="chart-toolbar__btn chart-toolbar__btn--timeframe"
                    onClick={() => setShowTimeframePicker(true)}
                >
                    <span>{currentTfLabel}</span>
                    <Icon name="chevronDown" size={14} />
                </button>

                {/* Spacer */}
                <div className="chart-toolbar__spacer" />

                {/* Chart Type Button */}
                <button
                    className="chart-toolbar__btn chart-toolbar__btn--icon"
                    title="Chart Type"
                    onClick={() => setShowChartTypePicker(true)}
                >
                    <Icon name="chartCandles" size={20} />
                </button>

                {/* Draw Button */}
                <button
                    className="chart-toolbar__btn chart-toolbar__btn--icon"
                    title="Draw"
                    onClick={handleOpenDrawingTools}
                >
                    <Icon name="draw" size={20} />
                </button>

                {/* Indicators Button */}
                <button
                    className="chart-toolbar__btn chart-toolbar__btn--icon"
                    title="Indicators"
                    onClick={handleOpenIndicators}
                >
                    <Icon name="indicators" size={20} />
                </button>

                {/* Fullscreen Button */}
                <button
                    className="chart-toolbar__btn chart-toolbar__btn--icon"
                    title="Fullscreen"
                    onClick={toggleFullscreen}
                >
                    <Icon name="fullscreen" size={20} />
                </button>
            </div>

            {/* Symbol Picker */}
            {showSymbolPicker && (
                <SymbolPicker
                    value={symbol.symbol}
                    onChange={handleSymbolChange}
                    onClose={() => setShowSymbolPicker(false)}
                />
            )}

            {/* Timeframe Picker */}
            {showTimeframePicker && (
                <TimeframePicker
                    value={currentTimeframe}
                    onChange={handleTimeframeChange}
                    onClose={() => setShowTimeframePicker(false)}
                />
            )}

            {/* Chart Type Picker */}
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
