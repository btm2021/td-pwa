import { useState, useEffect, useRef } from 'preact/hooks';
import { signal } from '@preact/signals';
import { selectedSymbol, selectedTimeframe } from '../state/store';

// Replay state signals
export const replayState = signal({
    isActive: false,
    isPaused: true,
    visibleBarsCount: 0,
    totalBars: 0,
    currentSpeedIndex: 5, // Default to 5x (index 4 in SPEEDS array)
    currentBar: null
});

// Show bar selection modal
export const replayUIVisible = signal(false);

// Pre-fetched bars for selection
export const previewBars = signal([]);

// Store original chart config
export const originalChartConfig = signal(null);

// Speed options
const SPEEDS = [
    { label: '0.5x', interval: 2000 },
    { label: '1x', interval: 1000 },
    { label: '2x', interval: 500 },
    { label: '3x', interval: 333 },
    { label: '5x', interval: 250 },
    { label: '10x', interval: 170 },
];

/**
 * Replay Engine Hook
 * Manages bar replay functionality
 */
export function useReplayEngine(tvWidgetRef, datafeedRef) {
    const [allBars, setAllBars] = useState([]);
    const timerRef = useRef(null);
    const realtimeCallbackRef = useRef(null);
    const replayWidgetRef = useRef(null);
    const symbol = selectedSymbol.value.symbol;
    const timeframe = selectedTimeframe.value;

    // Reset preview bars when symbol or timeframe changes
    useEffect(() => {
        previewBars.value = [];
    }, [symbol, timeframe]);

    const getResolutionFromState = () => {
        const intervalMap = {
            '1m': '1', '5m': '5', '15m': '15', '30m': '30',
            '1h': '60', '4h': '240', '1d': '1D', '1w': '1W',
        };
        return intervalMap[selectedTimeframe.value] || '15';
    };

    // Fetch historical data
    const fetchHistoricalData = async (symbol, resolution) => {
        return new Promise((resolve, reject) => {
            const now = Math.floor(Date.now() / 1000);
            const resolutionSeconds = {
                '1': 60, '3': 180, '5': 300, '15': 900, '30': 1800,
                '60': 3600, '120': 7200, '240': 14400, 'D': 86400, '1D': 86400, 'W': 604800, '1W': 604800, 'M': 2592000, '1M': 2592000
            }[resolution] || 900;
            const from = now - (resolutionSeconds * 2000);

            const symbolInfo = { name: symbol, full_name: symbol, ticker: symbol };

            if (!datafeedRef.current) {
                reject(new Error('Datafeed not available'));
                return;
            }

            datafeedRef.current.getBars(
                symbolInfo,
                resolution,
                { from, to: now, firstDataRequest: true },
                (bars, meta) => {
                    const sortedBars = bars.sort((a, b) => a.time - b.time);
                    setAllBars(sortedBars);
                    previewBars.value = sortedBars; // Store for preview
                    resolve(sortedBars);
                },
                reject
            );
        });
    };

    // Pre-fetch data for bar selector (called when UI opens)
    const prefetchData = async () => {
        if (previewBars.value.length > 0) return previewBars.value;

        try {
            if (!tvWidgetRef.current) return [];

            const chart = tvWidgetRef.current.activeChart();
            const symbol = chart.symbol();
            const resolution = getResolutionFromState();

            const bars = await fetchHistoricalData(symbol, resolution);
            return bars;
        } catch (error) {
            console.error('[ReplayEngine] Prefetch failed:', error);
            return [];
        }
    };

    // Create replay datafeed
    const createReplayDatafeed = (bars, visibleCount) => {
        return {
            onReady: (callback) => {
                setTimeout(() => callback({
                    supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                    exchanges: [],
                    symbols_types: [],
                    supports_marks: false,
                    supports_timescale_marks: false,
                    supports_time: true
                }), 0);
            },
            searchSymbols: (input, exchange, type, callback) => callback([]),
            resolveSymbol: (symbolName, onResolve, onError) => {
                setTimeout(() => {
                    onResolve({
                        name: symbolName,
                        description: `${symbolName} (Replay)`,
                        type: 'crypto',
                        session: '24x7',
                        timezone: 'Etc/UTC',
                        ticker: symbolName,
                        minmov: 1,
                        pricescale: 100,
                        has_intraday: true,
                        has_daily: true,
                        supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
                        volume_precision: 2,
                        data_status: 'streaming'
                    });
                }, 0);
            },
            getBars: (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
                const state = replayState.value;
                const visibleBars = bars.slice(0, state.visibleBarsCount);
                onHistoryCallback(visibleBars, { noData: visibleBars.length === 0 });
            },
            subscribeBars: (symbolInfo, resolution, onRealtimeCallback, subscriberUID) => {
                realtimeCallbackRef.current = onRealtimeCallback;
            },
            unsubscribeBars: (subscriberUID) => {
                realtimeCallbackRef.current = null;
            }
        };
    };

    // Start replay from specific bar index
    const startReplayFromIndex = async (startIndex) => {
        if (replayState.value.isActive) return;

        try {
            if (!tvWidgetRef.current) return;

            const chart = tvWidgetRef.current.activeChart();
            const symbol = chart.symbol();
            const resolution = chart.resolution();

            console.log(`[ReplayEngine] Starting replay for ${symbol} @ ${resolution}`);

            // Save original chart configuration
            let chartOverrides = {};
            let studiesOverrides = {};
            try {
                // Get visible studies from original chart
                const studies = chart.getAllStudies();
                originalChartConfig.value = {
                    symbol,
                    resolution,
                    studies: studies.map(s => ({ name: s.name, id: s.id })),
                };
            } catch (e) {
                console.warn('[ReplayEngine] Could not get original chart config:', e);
            }

            // Use pre-fetched bars or fetch new
            let bars = previewBars.value;
            if (bars.length === 0) {
                bars = await fetchHistoricalData(symbol, resolution);
            } else {
                setAllBars(bars);
            }

            if (bars.length < 10) {
                throw new Error('Not enough historical data');
            }

            // Use provided index
            const visibleCount = Math.max(50, Math.min(startIndex, bars.length - 1));

            // Update state
            replayState.value = {
                ...replayState.value,
                isActive: true,
                isPaused: true,
                visibleBarsCount: visibleCount,
                totalBars: bars.length,
                currentBar: bars[visibleCount - 1]
            };

            // Close the bar selection modal
            replayUIVisible.value = false;

            // Hide main chart
            const mainContainer = document.querySelector('.desktop-chart__container');
            if (mainContainer) mainContainer.style.display = 'none';

            // Create replay container
            let replayContainer = document.getElementById('replay-chart-container');
            if (!replayContainer) {
                replayContainer = document.createElement('div');
                replayContainer.id = 'replay-chart-container';
                replayContainer.style.cssText = 'width: 100%; height: 100%; position: absolute; top: 0; left: 0; z-index: 10;';
                document.querySelector('.desktop-chart')?.appendChild(replayContainer);
            }
            replayContainer.style.display = 'block';
            replayContainer.innerHTML = '';

            // Create replay widget with SAME configuration as original chart
            const replayDatafeed = createReplayDatafeed(bars, visibleCount);

            // Get custom studies creators (same as original chart)
            const customStudies = [];
            if (typeof createATRBot !== 'undefined') customStudies.push(createATRBot);
            if (typeof createVSR !== 'undefined') customStudies.push(createVSR);
            if (typeof createVSR_1 !== 'undefined') customStudies.push(createVSR_1);
            if (typeof createVIDYA !== 'undefined') customStudies.push(createVIDYA);
            if (typeof createSessionVP !== 'undefined') customStudies.push(createSessionVP);
            if (typeof createSwingPoints !== 'undefined') customStudies.push(createSwingPoints);
            if (typeof createKAMA !== 'undefined') customStudies.push(createKAMA);
            if (typeof createSMC !== 'undefined') customStudies.push(createSMC);
            if (typeof createFVG !== 'undefined') customStudies.push(createFVG);

            // Get save load adapter (same as original chart)


            replayWidgetRef.current = new TradingView.widget({
                symbol: symbol.replace('.P', ''),
                datafeed: replayDatafeed,
                interval: resolution,
                container: replayContainer,
                library_path: '/chart/charting_library/',
                locale: 'vi',
                custom_indicators_getter: customStudies.length > 0
                    ? function (PineJS) {
                        return Promise.resolve(customStudies.map(fn => fn(PineJS)));
                    }
                    : undefined,
                auto_save_delay: 5,

                // Desktop features enabled (matching DesktopChart exactly)
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
                    'trading_notifications'
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
            });

            replayWidgetRef.current.onChartReady(() => {
                console.log('[ReplayEngine] Replay chart ready');
                replayWidgetRef.current.headerReady().then(() => {
                    // Add REPLAY badge
                    const badge = replayWidgetRef.current.createButton({ align: 'left' });
                    badge.innerHTML = '<span style="color: #f59e0b; font-weight: bold; font-size: 12px; margin-right: 8px;">⏵ REPLAY</span>';
                    badge.style.cursor = 'default';


                    // Play/Pause
                    const playPauseBtn = replayWidgetRef.current.createButton({ align: 'left' });
                    const updatePlayPauseIcon = (isPaused) => {
                        playPauseBtn.innerHTML = isPaused ? `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: #3b82f6;">
                                <path d="M8 5v14l11-7z"/>
                            </svg>
                        ` : `
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: #3b82f6;">
                                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                            </svg>
                        `;
                    };
                    updatePlayPauseIcon(replayState.value.isPaused);
                    playPauseBtn.addEventListener('click', togglePause);

                    // Step Forward
                    const forwardBtn = replayWidgetRef.current.createButton({ align: 'left' });
                    forwardBtn.title = 'Step Forward';
                    forwardBtn.innerHTML = `
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
                        </svg>
                    `;
                    forwardBtn.addEventListener('click', () => {
                        if (!replayState.value.isPaused) {
                            togglePause();
                        }
                        addNextBar();
                    });

                    // Speed Button
                    const speedBtn = replayWidgetRef.current.createButton({ align: 'left' });
                    const updateSpeedLabel = (index) => {
                        speedBtn.innerHTML = `<span style="color: #3b82f6; font-weight: 600; font-size: 13px;">${SPEEDS[index].label}</span>`;
                    };
                    updateSpeedLabel(replayState.value.currentSpeedIndex);
                    speedBtn.addEventListener('click', () => {
                        const nextIdx = (replayState.value.currentSpeedIndex + 1) % SPEEDS.length;
                        setSpeed(nextIdx);
                    });

                    // Add Stop button to header
                    const stopBtn = replayWidgetRef.current.createButton({ align: 'left' });
                    stopBtn.setAttribute('title', 'Exit Replay');
                    stopBtn.innerHTML = `
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" style="vertical-align: middle;">
                            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                    `;
                    stopBtn.addEventListener('click', stopReplay);

                    // Subscribe to state changes to update header UI
                    const unsubscribe = replayState.subscribe(state => {
                        if (!replayWidgetRef.current) return;
                        updatePlayPauseIcon(state.isPaused);
                        updateSpeedLabel(state.currentSpeedIndex);
                    });

                    // Store unsubscribe for cleanup
                    replayWidgetRef.current._unsubscribeHeader = unsubscribe;
                });
            });

            console.log(`[ReplayEngine] Replay started from ${visibleCount}/${bars.length} bars`);

        } catch (error) {
            console.error('[ReplayEngine] Failed to start:', error);
            stopReplay();
        }
    };

    // Start replay (legacy - from percent)
    const startReplay = async (startPercent = 50) => {
        const bars = previewBars.value.length > 0 ? previewBars.value : await prefetchData();
        const startIndex = Math.floor(bars.length * (startPercent / 100));
        await startReplayFromIndex(startIndex);
    };

    // Stop replay
    const stopReplay = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (replayWidgetRef.current) {
            if (replayWidgetRef.current._unsubscribeHeader) {
                replayWidgetRef.current._unsubscribeHeader();
            }
            try { replayWidgetRef.current.remove(); } catch (e) { }
            replayWidgetRef.current = null;
        }

        const replayContainer = document.getElementById('replay-chart-container');
        if (replayContainer) replayContainer.style.display = 'none';

        const mainContainer = document.querySelector('.desktop-chart__container');
        if (mainContainer) mainContainer.style.display = 'block';

        replayState.value = {
            isActive: false,
            isPaused: true,
            visibleBarsCount: 0,
            totalBars: 0,
            currentSpeedIndex: 1,
            currentBar: null
        };
        originalChartConfig.value = null;
        setAllBars([]);
    };

    // Toggle pause
    const togglePause = () => {
        if (!replayState.value.isActive) return;

        const newPaused = !replayState.value.isPaused;
        replayState.value = { ...replayState.value, isPaused: newPaused };

        if (newPaused) {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        } else {
            startTimer();
        }
    };

    // Add next bar
    const addNextBar = () => {
        const state = replayState.value;
        if (state.visibleBarsCount >= state.totalBars) {
            replayState.value = { ...replayState.value, isPaused: true };
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        const newCount = state.visibleBarsCount + 1;
        const newBar = allBars[newCount - 1];

        replayState.value = {
            ...replayState.value,
            visibleBarsCount: newCount,
            currentBar: newBar
        };

        if (realtimeCallbackRef.current && newBar) {
            realtimeCallbackRef.current({
                time: newBar.time,
                open: newBar.open,
                high: newBar.high,
                low: newBar.low,
                close: newBar.close,
                volume: newBar.volume
            });
        }
    };

    // Step forward
    const stepForward = () => {
        if (!replayState.value.isActive) return;
        if (!replayState.value.isPaused) {
            replayState.value = { ...replayState.value, isPaused: true };
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
        addNextBar();
    };

    // Step backward
    const stepBackward = () => {
        const state = replayState.value;
        if (!state.isActive) return;
        if (state.visibleBarsCount <= 50) return;

        if (!state.isPaused) {
            replayState.value = { ...replayState.value, isPaused: true };
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        const newCount = state.visibleBarsCount - 1;
        const newBar = allBars[newCount - 1];

        replayState.value = {
            ...replayState.value,
            visibleBarsCount: newCount,
            currentBar: newBar
        };

        if (replayWidgetRef.current) {
            try {
                replayWidgetRef.current.activeChart().resetData();
            } catch (e) { }
        }
    };

    // Set speed
    const setSpeed = (index) => {
        if (index < 0 || index >= SPEEDS.length) return;

        replayState.value = { ...replayState.value, currentSpeedIndex: index };

        if (replayState.value.isActive && !replayState.value.isPaused) {
            if (timerRef.current) clearInterval(timerRef.current);
            startTimer();
        }
    };

    // Jump to position
    const jumpToPosition = (percent) => {
        if (!replayState.value.isActive) return;

        const newCount = Math.floor(allBars.length * (percent / 100));
        const clampedCount = Math.max(50, Math.min(newCount, allBars.length));
        const newBar = allBars[clampedCount - 1];

        replayState.value = {
            ...replayState.value,
            visibleBarsCount: clampedCount,
            currentBar: newBar
        };

        if (replayWidgetRef.current) {
            try {
                replayWidgetRef.current.activeChart().resetData();
            } catch (e) { }
        }
    };

    // Start timer
    const startTimer = () => {
        const speed = SPEEDS[replayState.value.currentSpeedIndex];
        timerRef.current = setInterval(() => {
            addNextBar();
        }, speed.interval);
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (replayWidgetRef.current) {
                try { replayWidgetRef.current.remove(); } catch (e) { }
            }
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!replayState.value.isActive) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePause();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    stepForward();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    stepBackward();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSpeed(Math.min(replayState.value.currentSpeedIndex + 1, SPEEDS.length - 1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    setSpeed(Math.max(replayState.value.currentSpeedIndex - 1, 0));
                    break;
                case 'Escape':
                    e.preventDefault();
                    stopReplay();
                    replayUIVisible.value = false;
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [allBars]);

    return {
        startReplay,
        startReplayFromIndex,
        prefetchData,
        stopReplay,
        togglePause,
        stepForward,
        stepBackward,
        setSpeed,
        jumpToPosition,
        speeds: SPEEDS
    };
}

/**
 * Replay Controls UI Component
 * Shows as sidebar when replay is active
 */
/**
 * Replay Controls UI Component
 * Shows as a compact draggable floating panel when replay is active
 */
export function ReplayControls({ engine }) {
    return null;
}


/**
 * Bar Selection Sidebar Component
 * Shows as sidebar to select starting bar
 */
export function BarSelectionSidebar({ engine }) {
    const state = replayState.value;
    const visible = replayUIVisible.value;
    const bars = previewBars.value;

    const [isLoading, setIsLoading] = useState(false);
    const [selectedBarIndex, setSelectedBarIndex] = useState(null);
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');

    // Load bars when UI opens
    useEffect(() => {
        if (visible && bars.length === 0 && !state.isActive) {
            setIsLoading(true);
            engine.prefetchData().finally(() => setIsLoading(false));
        }
    }, [visible]);

    // Set default date/time when bars are loaded
    useEffect(() => {
        if (bars.length > 0 && !selectedBarIndex) {
            const middleIndex = Math.floor(bars.length / 2);
            setSelectedBarIndex(middleIndex);

            const middleBar = bars[middleIndex];
            const date = new Date(middleBar.time);
            setStartDate(date.toISOString().split('T')[0]);
            setStartTime(date.toTimeString().slice(0, 5));
        }
    }, [bars]);

    // Update selected index when date/time changes
    useEffect(() => {
        if (bars.length === 0 || !startDate) return;

        const targetTime = new Date(`${startDate}T${startTime || '00:00'}`).getTime();

        // Find closest bar
        let closestIndex = 0;
        let minDiff = Math.abs(bars[0].time - targetTime);

        for (let i = 1; i < bars.length; i++) {
            const diff = Math.abs(bars[i].time - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
            }
        }

        setSelectedBarIndex(closestIndex);
    }, [startDate, startTime, bars]);

    // Don't show if replay is active or modal not visible
    if (!visible || state.isActive) return null;

    const formatBarTime = (bar) => {
        if (!bar) return '--';
        return new Date(bar.time).toLocaleString('vi-VN');
    };

    const formatPrice = (val) => {
        if (!val) return '--';
        return val.toFixed(4);
    };

    const handleStartReplay = () => {
        if (selectedBarIndex !== null) {
            engine.startReplayFromIndex(selectedBarIndex);
        }
    };

    // Get selected bar preview
    const selectedBar = selectedBarIndex !== null && bars[selectedBarIndex];
    const barsAfterStart = selectedBarIndex !== null ? bars.length - selectedBarIndex : 0;

    // Get date range for inputs
    const minDate = bars.length > 0 ? new Date(bars[0].time).toISOString().split('T')[0] : '';
    const maxDate = bars.length > 0 ? new Date(bars[bars.length - 1].time).toISOString().split('T')[0] : '';

    return (
        <div className="replay-selection-sidebar">
            <div className="replay-selection-panel">
                {/* Header */}
                <div className="replay-header">
                    <div className="replay-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        <span>Bar Replay</span>
                    </div>
                    <button
                        className="replay-close-btn"
                        onClick={() => replayUIVisible.value = false}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="replay-loading">
                        <div className="replay-spinner"></div>
                        <span>Loading historical data...</span>
                    </div>
                ) : bars.length > 0 ? (
                    <>
                        {/* Date/Time Picker */}
                        <div className="replay-section">
                            <label>Start Date & Time</label>
                            <div className="datetime-picker">
                                <input
                                    type="date"
                                    className="date-input"
                                    value={startDate}
                                    min={minDate}
                                    max={maxDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                                <input
                                    type="time"
                                    className="time-input"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Bar Slider */}
                        <div className="replay-section">
                            <label>Or use slider ({bars.length} bars available)</label>
                            <div className="bar-slider-container">
                                <input
                                    type="range"
                                    className="bar-slider"
                                    min="50"
                                    max={bars.length - 1}
                                    value={selectedBarIndex || 0}
                                    onInput={(e) => {
                                        const idx = parseInt(e.target.value);
                                        setSelectedBarIndex(idx);
                                        const bar = bars[idx];
                                        if (bar) {
                                            const date = new Date(bar.time);
                                            setStartDate(date.toISOString().split('T')[0]);
                                            setStartTime(date.toTimeString().slice(0, 5));
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* Selected Bar Preview */}
                        {selectedBar && (
                            <div className="replay-section selected-bar-preview">
                                <div className="preview-header">
                                    <span className="preview-label">Start Point</span>
                                    <span className="preview-bars-count">{barsAfterStart} bars to replay</span>
                                </div>
                                <div className="preview-bar-info">
                                    <div className="preview-time">{formatBarTime(selectedBar)}</div>

                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="replay-error">
                        <span>No data available. Please wait for chart to load.</span>
                    </div>
                )}

                {/* Start Button */}
                <div className="replay-controls-buttons">
                    <div className="controls-row">
                        <button
                            className="replay-btn primary"
                            onClick={handleStartReplay}
                            disabled={isLoading || !selectedBarIndex}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Start Replay
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Replay Button Component
 */
export function ReplayButton() {
    return (
        <button
            className="chart-toolbar-btn"
            title="Bar Replay"
            onClick={() => {
                replayUIVisible.value = !replayUIVisible.value;
            }}
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                <line x1="21" y1="6" x2="21" y2="18" strokeDasharray="2,2"></line>
            </svg>
        </button>
    );
}
