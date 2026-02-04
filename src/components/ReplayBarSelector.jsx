import { useEffect, useRef, useState, useCallback } from 'preact/hooks';
import { signal } from '@preact/signals';
import { replayUIVisible, previewBars, replayState } from './ReplayControls';

// Signals
export const replaySelectionMode = signal(null);
export const selectedReplayBar = signal(null);

/**
 * Replay Bar Selector Component
 * Creates a cross_line shape on chart for bar selection
 */
export function ReplayBarSelector({ tvWidgetRef, engine }) {
    const [isLoading, setIsLoading] = useState(false);
    const [shapeInfo, setShapeInfo] = useState(null);
    const [error, setError] = useState(null);
    const shapeIdRef = useRef(null);
    const pollingRef = useRef(null);

    const visible = replayUIVisible.value;
    const bars = previewBars.value;
    const isActive = replayState.value.isActive;

    // Cleanup
    const cleanup = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }

        if (shapeIdRef.current && tvWidgetRef.current) {
            try {
                tvWidgetRef.current.activeChart().removeEntity(shapeIdRef.current);
                console.log('[Replay] Removed shape');
            } catch (e) { }
        }

        shapeIdRef.current = null;
        selectedReplayBar.value = null;
        setShapeInfo(null);
        setError(null);
    }, [tvWidgetRef]);

    // Create cross_line shape at viewport center
    const createCrossLineShape = useCallback(() => {
        const widget = tvWidgetRef.current;
        if (!widget) {
            setError('Chart not ready');
            return;
        }

        if (bars.length === 0) {
            setError('No data');
            return;
        }

        try {
            const chart = widget.activeChart();

            // Get visible range to find center of viewport
            let centerTime, centerPrice;

            try {
                const visibleRange = chart.getVisibleRange();
                if (visibleRange && visibleRange.from && visibleRange.to) {
                    // Center of visible time range
                    centerTime = (visibleRange.from + visibleRange.to) / 2;

                    // Find bar closest to center time
                    const centerTimeMs = centerTime * 1000;
                    let closestBar = bars[0];
                    let minDiff = Infinity;

                    for (const bar of bars) {
                        const diff = Math.abs(bar.time - centerTimeMs);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestBar = bar;
                        }
                    }

                    // Use bar's mid price for vertical center
                    centerPrice = (closestBar.high + closestBar.low) / 2;
                } else {
                    throw new Error('No visible range');
                }
            } catch (e) {
                // Fallback: use middle bar from data
                console.log('[Replay] Using fallback position');
                const midIndex = Math.floor(bars.length / 2);
                const bar = bars[midIndex];
                centerTime = bar.time / 1000;
                centerPrice = (bar.high + bar.low) / 2;
            }

            console.log('[Replay] Creating cross_line at center:', {
                time: new Date(centerTime * 1000).toISOString(),
                price: centerPrice
            });

            // Create cross_line shape
            const shapeId = chart.createShape(
                { time: centerTime, price: centerPrice },
                {
                    shape: 'cross_line',
                    lock: false,
                    disableSelection: false,
                    disableSave: true,
                    disableUndo: true,
                    overrides: {
                        linecolor: '#3b82f6',
                        linewidth: 2,
                        linestyle: 0
                    }
                }
            );

            console.log('[Replay] Shape created:', shapeId);

            if (shapeId) {
                shapeIdRef.current = shapeId;
                replaySelectionMode.value = 'placed';

                // Find initial bar info
                const timeMs = centerTime * 1000;
                let closestBar = bars[0];
                let closestIndex = 0;
                let minDiff = Infinity;

                for (let i = 0; i < bars.length; i++) {
                    const diff = Math.abs(bars[i].time - timeMs);
                    if (diff < minDiff) {
                        minDiff = diff;
                        closestBar = bars[i];
                        closestIndex = i;
                    }
                }

                setShapeInfo({ bar: closestBar, index: closestIndex });
                selectedReplayBar.value = { bar: closestBar, index: closestIndex };

                startPolling(chart, shapeId);
            } else {
                setError('Failed to create marker');
            }
        } catch (e) {
            console.error('[Replay] Error:', e);
            setError(e.message);
        }
    }, [tvWidgetRef, bars]);

    // Poll shape position
    const startPolling = useCallback((chart, shapeId) => {
        const poll = () => {
            try {
                const shape = chart.getShapeById(shapeId);
                if (shape) {
                    const points = shape.getPoints();
                    if (points && points.length > 0) {
                        const timeMs = points[0].time * 1000;

                        let closestBar = null;
                        let closestIndex = -1;
                        let minDiff = Infinity;

                        for (let i = 0; i < bars.length; i++) {
                            const diff = Math.abs(bars[i].time - timeMs);
                            if (diff < minDiff) {
                                minDiff = diff;
                                closestBar = bars[i];
                                closestIndex = i;
                            }
                        }

                        if (closestIndex >= 0) {
                            setShapeInfo({ bar: closestBar, index: closestIndex });
                            selectedReplayBar.value = { bar: closestBar, index: closestIndex };
                        }
                    }
                }
            } catch (e) { }
        };

        pollingRef.current = setInterval(poll, 300);
    }, [bars]);

    // Initialize
    useEffect(() => {
        if (!visible || isActive) {
            cleanup();
            replaySelectionMode.value = null;
            return;
        }

        if (!tvWidgetRef.current) return;

        if (bars.length === 0) {
            setIsLoading(true);
            engine.prefetchData()
                .then(() => setIsLoading(false))
                .catch(err => {
                    setIsLoading(false);
                    setError(err.message);
                });
        } else {
            createCrossLineShape();
        }

        return () => cleanup();
    }, [visible, isActive, tvWidgetRef.current]);

    // Create shape when bars available
    useEffect(() => {
        if (visible && !isActive && bars.length > 0 && !shapeIdRef.current && !isLoading) {
            createCrossLineShape();
        }
    }, [bars.length, visible, isActive, isLoading, createCrossLineShape]);

    // ESC to cancel
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && visible && !isActive) {
                cleanup();
                replayUIVisible.value = false;
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [visible, isActive, cleanup]);

    // Handlers
    const handleStart = () => {
        if (!shapeInfo) return;
        console.log('[Replay] Starting from:', shapeInfo.index);
        cleanup();
        engine.startReplayFromIndex(shapeInfo.index);
    };

    const handleCancel = () => {
        cleanup();
        replayUIVisible.value = false;
    };

    if (!visible || isActive) return null;

    // Format helpers
    const formatDate = (bar) => {
        if (!bar) return '--';
        const d = new Date(bar.time);
        return d.toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const formatTime = (bar) => {
        if (!bar) return '--';
        const d = new Date(bar.time);
        return d.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const formatPrice = (v) => (v != null ? v.toFixed(5) : '--');
    const formatVolume = (v) => {
        if (v == null) return '--';
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(2) + 'K';
        return v.toFixed(2);
    };

    return (
        <div className="replay-selection-sidebar">
            <div className="replay-selection-panel">
                {/* Header */}
                <div className="replay-panel-header-new">
                    <div className="replay-title-new">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1 4 1 10 7 10"></polyline>
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        <span>Bar Replay</span>
                    </div>
                    <button className="replay-close-btn" onClick={handleCancel} title="Close (ESC)">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Loading */}
                {isLoading && (
                    <div className="replay-loading">
                        <div className="replay-spinner"></div>
                        <span>Loading data...</span>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="replay-error">
                        <p>{error}</p>
                        <button className="replay-btn-small" onClick={createCrossLineShape}>
                            Retry
                        </button>
                    </div>
                )}

                {/* Shape Info */}
                {!isLoading && !error && shapeInfo && (
                    <div className="replay-content">
                        {/* Date/Time Section */}
                        <div className="replay-datetime-block">
                            <div className="datetime-row">
                                <span className="datetime-label">📅 Date</span>
                                <span className="datetime-value">{formatDate(shapeInfo.bar)}</span>
                            </div>
                            <div className="datetime-row">
                                <span className="datetime-label">🕐 Time</span>
                                <span className="datetime-value">{formatTime(shapeInfo.bar)}</span>
                            </div>
                        </div>

                        {/* OHLCV Grid */}
                        <div className="replay-ohlcv-block">
                            <div className="ohlcv-grid">
                                <div className="ohlcv-item">
                                    <span className="ohlcv-label">Open</span>
                                    <span className="ohlcv-value">{formatPrice(shapeInfo.bar.open)}</span>
                                </div>
                                <div className="ohlcv-item">
                                    <span className="ohlcv-label">High</span>
                                    <span className="ohlcv-value green">{formatPrice(shapeInfo.bar.high)}</span>
                                </div>
                                <div className="ohlcv-item">
                                    <span className="ohlcv-label">Low</span>
                                    <span className="ohlcv-value red">{formatPrice(shapeInfo.bar.low)}</span>
                                </div>
                                <div className="ohlcv-item">
                                    <span className="ohlcv-label">Close</span>
                                    <span className="ohlcv-value">{formatPrice(shapeInfo.bar.close)}</span>
                                </div>
                            </div>
                            <div className="volume-row">
                                <span className="ohlcv-label">Volume</span>
                                <span className="ohlcv-value">{formatVolume(shapeInfo.bar.volume)}</span>
                            </div>
                        </div>

                        {/* Bars Count */}
                        <div className="replay-bars-block">
                            <div className="bars-info">
                                <span className="bars-label">Bars to replay</span>
                                <span className="bars-count">{bars.length - shapeInfo.index}</span>
                            </div>
                            <div className="bars-progress">
                                <div
                                    className="bars-progress-fill"
                                    style={{ width: `${((bars.length - shapeInfo.index) / bars.length) * 100}%` }}
                                />
                            </div>
                        </div>

                        {/* Hint */}
                        <div className="replay-hint-block">
                            💡 Kéo <strong>dấu cross</strong> tới vị trí cần replay
                        </div>

                        {/* Start Button */}
                        <button className="replay-start-btn" onClick={handleStart}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Start Replay
                        </button>
                    </div>
                )}

                {/* Waiting */}
                {!isLoading && !error && !shapeInfo && (
                    <div className="replay-loading">
                        <div className="replay-spinner"></div>
                        <span>Creating marker...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
