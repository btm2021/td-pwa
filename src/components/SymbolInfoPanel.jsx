import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';
import { formatPrice, formatPercent, formatVolume, getCoinLogoUrl, getBaseAsset, getTicker, tickerData } from '../state/watchlist';
import { selectedSymbolName, navigateToChart, navigateToFutures } from '../state/store';
import { deviceMode } from '../hooks/useDeviceMode';
import { fetchOHLCV } from '../utils/data';
import { calcEMA, calcATR, calcATRBot, calcVSR } from '../utils/indicators';
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts';

export function SymbolInfoPanel() {
    const symbol = selectedSymbolName.value;
    const ticker = getTicker(symbol);
    const [imgError, setImgError] = useState(false);

    // PnL Mode Global State (to be passed down)
    const [pnlMode, setPnlMode] = useState(false);

    // Force update when ticker changes
    const [_, setTick] = useState(0);
    useEffect(() => {
        const unsubscribe = tickerData.subscribe(() => {
            setTick(t => t + 1);
        });
        return unsubscribe;
    }, []);

    // State for Timeframe
    const [interval, setInterval] = useState('15m');
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

    // Indicator Logic Lifted Up
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [indicators, setIndicators] = useState(null);

    useEffect(() => {
        let isMounted = true;
        async function loadData() {
            setLoading(true);
            setError(null);
            try {
                const history = await fetchOHLCV(symbol, interval, 1500);
                if (!isMounted) return;

                if (history && history.length > 100) {
                    setData(history);

                    // Standardized ATRBot Configuration (10, 1, 14)
                    const ATR_LENGTH = 10;
                    const BOT_MULTI = 1.618;
                    const EMA_LENGTH = 21;

                    const ema = calcEMA(history, EMA_LENGTH);
                    const atr = calcATR(history, ATR_LENGTH);
                    const bot = calcATRBot(history, ema, atr, BOT_MULTI);

                    const vsr = calcVSR(history, 10, 5);

                    // Bot 2 (10, 1, 14) - Lines Only
                    const BOT_MULTI_2 = 1;
                    const EMA_LENGTH_2 = 14;
                    const ema2 = calcEMA(history, EMA_LENGTH_2);
                    const bot2 = calcATRBot(history, ema2, atr, BOT_MULTI_2);

                    const lastIdx = history.length - 1;

                    const seriesData = history.map((d, i) => {
                        const botVal = bot[i];
                        const emaVal = ema[i];
                        const bot2Val = bot2[i];
                        const ema2Val = ema2[i];

                        // Trail 1/2 = Bot 1 (Fill)
                        // Trail 3/4 = Bot 2 (Lines)
                        return {
                            time: d.time,
                            trail1: emaVal,
                            trail2: botVal,
                            trail3: ema2Val,
                            trail4: bot2Val,
                            vsrUp: vsr.up[i],
                            vsrLo: vsr.lo[i]
                        };
                    });

                    setIndicators({
                        bot: {
                            trailing: bot[lastIdx],
                            ema: ema[lastIdx],
                            trail1: seriesData.map(d => ({ time: d.time, value: d.trail1 })).filter(d => d.value !== null),
                            trail2: seriesData.map(d => ({ time: d.time, value: d.trail2 })).filter(d => d.value !== null),
                            trail3: seriesData.map(d => ({ time: d.time, value: d.trail3 })).filter(d => d.value !== null),
                            trail4: seriesData.map(d => ({ time: d.time, value: d.trail4 })).filter(d => d.value !== null)
                        },
                        vsr: {
                            up: vsr.up[lastIdx],
                            lo: vsr.lo[lastIdx],
                            isSpike: vsr.beg[lastIdx]
                        },
                        series: {
                            trail1: seriesData.map(d => ({ time: d.time, value: d.trail1 })).filter(d => d.value !== null),
                            trail2: seriesData.map(d => ({ time: d.time, value: d.trail2 })).filter(d => d.value !== null),
                            trail3: seriesData.map(d => ({ time: d.time, value: d.trail3 })).filter(d => d.value !== null),
                            trail4: seriesData.map(d => ({ time: d.time, value: d.trail4 })).filter(d => d.value !== null),
                        },
                        history: history,
                        vsrRes: vsr,
                        aligned: seriesData
                    });
                } else {
                    setError("Not enough history data");
                }
            } catch (err) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadData();
        return () => { isMounted = false; };
    }, [symbol, interval]);

    // Derived State for Header Meta
    let bias = 'NEUTRAL';
    let biasColor = 'var(--text-tertiary)';
    let isInVsrZone = false;
    let vsrData = { isSpike: false };

    if (indicators) {
        const currentPrice = ticker?.price || data[data.length - 1]?.close || 0;
        const bot = indicators.bot;
        const vsr = indicators.vsr;

        const isBullish = currentPrice > bot.trailing;
        isInVsrZone = vsr.up && currentPrice <= vsr.up && currentPrice >= vsr.lo;

        bias = isBullish ? 'BULLISH' : 'BEARISH';
        biasColor = isBullish ? 'var(--accent-green)' : 'var(--accent-red)';
        vsrData = vsr;
    }


    if (!symbol) {
        return (
            <div className="symbol-info-panel symbol-info-panel--empty">
                <div className="symbol-info-panel__empty-content">
                    <Icon name="search" size={48} />
                    <h3>Select a symbol</h3>
                    <p>Choose a symbol from your watchlist to see details</p>
                </div>
            </div>
        );
    }

    const displayTicker = ticker || {
        price: 0,
        priceChangePercent: 0,
        high: 0,
        low: 0,
        volume: 0,
        quoteVolume: 0
    };

    const isPositive = displayTicker.priceChangePercent >= 0;
    const baseAsset = getBaseAsset(symbol).toUpperCase();
    const exchange = symbol.split(':')[0];
    const isForex = !symbol.includes('USDT') && !symbol.includes('BUSD') && !symbol.includes('USDC') && !symbol.includes('PERP');
    const quoteAsset = isForex ? (symbol.startsWith('OANDA:') ? symbol.replace('OANDA:', '').substring(3) : symbol.substring(3)) : 'USDT';
    const subtitle = isForex ? `${baseAsset} / ${quoteAsset}` : `${baseAsset} / USDT Perpetual`;

    return (
        <div className="symbol-detail-premium">
            {/* 1. TOP HEADER SECTION */}
            <header className="detail-header">
                <div className="detail-header__left">
                    <div className="asset-brand">
                        <div className="asset-logo">
                            {!imgError && getCoinLogoUrl(symbol) ? (
                                <img
                                    src={getCoinLogoUrl(symbol)}
                                    alt={baseAsset}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="asset-logo-fallback">{baseAsset.charAt(0)}</div>
                            )}
                        </div>
                        <div className="asset-info">
                            <div className="asset-name-row">
                                <h1 className="asset-symbol">{baseAsset}</h1>
                                <span className="exchange-tag-premium">{exchange}</span>
                            </div>
                            <div className="asset-meta-row">
                                <p className="asset-fullname">{subtitle}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SLEEK TOOLBAR SECTION */}
                <div className="detail-header__center">
                    <div className="premium-toolbar">
                        <div className="timeframe-selector">
                            {timeframes.map(tf => (
                                <button
                                    key={tf}
                                    className={`tf-btn ${interval === tf ? 'active' : ''}`}
                                    onClick={() => setInterval(tf)}
                                >
                                    {tf}
                                </button>
                            ))}
                        </div>

                        <div className="toolbar-separator"></div>

                        <div className="chart-legends-modern">
                            <div className="legend-item-modern">
                                <span className="dot-line fill"></span>
                                <span>Cloud</span>
                            </div>
                            <div className="legend-item-modern">
                                <span className="dot-line green"></span>
                                <span>EMA14</span>
                            </div>
                            <div className="legend-item-modern">
                                <span className="dot-line red"></span>
                                <span>BotVal</span>
                            </div>
                        </div>

                        <div className="toolbar-separator"></div>

                        <div className="pnl-actions">
                            <button
                                className={`btn-pnl-toggle ${pnlMode ? 'active' : ''}`}
                                onClick={() => setPnlMode(!pnlMode)}
                                title="PNL Measure Tool"
                            >
                                <Icon name="chart-bar" size={18} />
                            </button>
                            <button
                                className="btn-pnl-toggle"
                                style={{ background: 'rgba(57, 211, 83, 0.1)', color: '#39d353', borderColor: 'rgba(57, 211, 83, 0.3)' }}
                                onClick={() => navigateToChart(symbol)}
                                title="Open Full Chart"
                            >
                                <Icon name="chart" size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="detail-header__right">
                    <div className="price-primary">
                        <span className="price-value">${formatPrice(displayTicker.price)}</span>
                        <div className={`price-change-pill ${isPositive ? 'is-up' : 'is-down'}`}>
                            {isPositive ? '▲' : '▼'} {formatPercent(displayTicker.priceChangePercent)}
                        </div>
                    </div>
                </div>
            </header>

            {/* 2. MAIN CONTENT GRID - FULL WIDTH */}
            <div className="detail-content-full">
                <div className="chart-card-wrapper">
                    <IndicatorChart
                        data={data}
                        indicators={indicators}
                        loading={loading}
                        error={error}
                        symbol={symbol}
                        pnlMode={pnlMode}
                        setPnlMode={setPnlMode}
                    />
                </div>
            </div>
        </div>
    );
}

function IndicatorChart({ data, indicators, loading, error, symbol, pnlMode, setPnlMode }) {
    if (loading) {
        return (
            <div className="premium-loading-overlay">
                <div className="loading-glass-card">
                    <div className="loading-orbit">
                        <div className="orbit-dot"></div>
                        <div className="orbit-scan"></div>
                    </div>
                    <div className="loading-content">
                        <div className="loading-title">TD ANALYTICS <span className="v5-badge">V5</span></div>
                        <div className="loading-symbol-row">
                            <span className="pulsing-box"></span>
                            <span className="analyzing-text">ANALYZING {symbol?.split(':')[1] || 'MARKET'}</span>
                        </div>
                        <div className="loading-status-bar">
                            <div className="status-progress"></div>
                        </div>
                        <div className="loading-subtext">Computing 1500 market data points...</div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !indicators) {
        return (
            <div className="indicator-dashboard indicator-dashboard--error">
                <p>Failed to analyze: {error || 'No data'}</p>
            </div>
        );
    }

    return (
        <div className="indicator-chart-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
            <MiniChart
                data={data}
                indicators={indicators}
                history={indicators.history}
                vsrRes={indicators.vsrRes}
                symbol={symbol}
                pnlModeExternal={pnlMode}
                setPnlModeExternal={setPnlMode}
            />
        </div>
    );
}



function MiniChart({ data, indicators, history, vsrRes, symbol, pnlModeExternal, setPnlModeExternal }) {
    const chartContainerRef = useRef();
    const chartRef = useRef(null);
    const candleSeriesRef = useRef(null);
    const t3SeriesRef = useRef(null);
    const t4SeriesRef = useRef(null);
    const [pnlPoints, setPnlPoints] = useState([]);
    const [livePnl, setLivePnl] = useState(null);

    // 1. Initialize Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;
        const container = chartContainerRef.current;

        const chart = createChart(container, {
            width: container.clientWidth || 800,
            height: container.clientHeight || 500,
            layout: {
                background: { color: '#0d1117' },
                textColor: '#8b949e',
                fontFamily: 'Inter, system-ui, sans-serif'
            },
            grid: { vertLines: { color: 'rgba(255,255,255,0.03)' }, horzLines: { color: 'rgba(255,255,255,0.03)' } },
            rightPriceScale: { borderColor: 'rgba(255,255,255,0.06)' },
            timeScale: { borderColor: 'rgba(255,255,255,0.06)', timeVisible: true },
            crosshair: {
                mode: 0,
                vertLine: { labelBackgroundColor: '#2979FF', color: 'rgba(255,255,255,0.2)' },
                horzLine: { labelBackgroundColor: '#2979FF', color: 'rgba(255,255,255,0.2)' }
            },
        });

        // Initialize series using strict LC v5 pattern (no aliases)
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#238636', downColor: '#da3633', borderVisible: false,
            wickUpColor: '#238636', wickDownColor: '#da3633',
        });

        const t3Series = chart.addSeries(LineSeries, {
            color: '#238636', lineWidth: 2, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false
        });

        const t4Series = chart.addSeries(LineSeries, {
            color: '#da3633', lineWidth: 2, crosshairMarkerVisible: false, lastValueVisible: false, priceLineVisible: false
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        t3SeriesRef.current = t3Series;
        t4SeriesRef.current = t4Series;

        // Overlay Canvas
        const canvas = document.createElement('canvas');
        Object.assign(canvas.style, { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '2' });
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const drawOverlays = () => {
            if (!ctx || !chartRef.current || !candleSeriesRef.current) return;
            const dpr = window.devicePixelRatio || 1;
            canvas.width = container.clientWidth * dpr;
            canvas.height = container.clientHeight * dpr;
            ctx.scale(dpr, dpr);
            ctx.clearRect(0, 0, container.clientWidth, container.clientHeight);

            const timeScale = chart.timeScale();
            const series = candleSeriesRef.current;

            // Cloud Fill (Bot 1)
            const aligned = indicators.aligned;
            if (aligned && aligned.length > 0) {
                let path = [];
                let lastBias = null;
                const flushPath = (p, bias) => {
                    if (p.length < 2) return;
                    ctx.beginPath();
                    ctx.fillStyle = bias === 'up' ? 'rgba(35, 134, 54, 0.12)' : 'rgba(218, 54, 51, 0.12)';
                    ctx.moveTo(p[0].x, p[0].y1);
                    for (let j = 1; j < p.length; j++) ctx.lineTo(p[j].x, p[j].y1);
                    for (let j = p.length - 1; j >= 0; j--) ctx.lineTo(p[j].x, p[j].y2);
                    ctx.closePath(); ctx.fill();
                };
                for (let i = 0; i < aligned.length; i++) {
                    const row = aligned[i];
                    const x = timeScale.timeToCoordinate(row.time);
                    if (x === null) continue;
                    const y1 = series.priceToCoordinate(row.trail1);
                    const y2 = series.priceToCoordinate(row.trail2);
                    if (y1 === null || y2 === null) continue;
                    const bias = row.trail1 > row.trail2 ? 'up' : 'down';
                    if (bias !== lastBias) { if (path.length > 0) flushPath(path, lastBias); path = []; lastBias = bias; }
                    path.push({ x, y1, y2 });
                }
                if (path.length > 0) flushPath(path, lastBias);
            }

            // VSR Zones
            if (history && vsrRes) {
                let zones = [];
                let cur = null;
                for (let i = 0; i < history.length; i++) {
                    if (vsrRes.beg[i]) {
                        if (cur) { cur.endTime = history[i - 1].time; zones.push(cur); }
                        cur = { startTime: history[i].time, endTime: history[history.length - 1].time, zh: vsrRes.up[i], zl: vsrRes.lo[i] };
                    }
                }
                if (cur) zones.push(cur);

                zones.forEach(z => {
                    const x1 = timeScale.timeToCoordinate(z.startTime);
                    const x2 = timeScale.timeToCoordinate(z.endTime);
                    const y1 = series.priceToCoordinate(z.zh);
                    const y2 = series.priceToCoordinate(z.zl);
                    if (y1 === null || y2 === null) return;
                    ctx.fillStyle = 'rgba(57, 211, 83, 0.08)';
                    ctx.strokeStyle = 'rgba(57, 211, 83, 0.2)';
                    ctx.lineWidth = 1;
                    const fx1 = x1 === null ? -100 : x1;
                    const fx2 = x2 === null ? container.clientWidth + 100 : x2;
                    ctx.fillRect(fx1, y1, fx2 - fx1, y2 - y1);
                    ctx.strokeRect(fx1, y1, fx2 - fx1, y2 - y1);
                });
            }
        };

        const handleResize = () => {
            if (container && chart) {
                chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
                requestAnimationFrame(drawOverlays);
            }
        };
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        chart.timeScale().subscribeVisibleTimeRangeChange(() => requestAnimationFrame(drawOverlays));

        const handleMouseMove = (param) => {
            if (!param.point || !param.time) { setLivePnl(null); return; }
            if (candleSeriesRef.current) {
                const price = candleSeriesRef.current.coordinateToPrice(param.point.y);
                if (price) setLivePnl({ price, x: param.point.x, y: param.point.y });
            }
            requestAnimationFrame(drawOverlays);
        };
        chart.subscribeCrosshairMove(handleMouseMove);

        const onContextMenu = (e) => { e.preventDefault(); setPnlModeExternal(true); };
        container.addEventListener('contextmenu', onContextMenu);

        // Intial draw
        requestAnimationFrame(drawOverlays);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            container.removeEventListener('contextmenu', onContextMenu);
            if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
            chartRef.current = null;
            candleSeriesRef.current = null;
        };
    }, [symbol]); // Recreate on symbol change

    // 2. Clear PnL on reactivation or deactivation
    useEffect(() => {
        if (pnlModeExternal) {
            setPnlPoints([]);
        } else if (candleSeriesRef.current) {
            if (typeof candleSeriesRef.current.setMarkers === 'function') {
                candleSeriesRef.current.setMarkers([]);
            }
            setPnlPoints([]);
        }
    }, [pnlModeExternal]);

    // 3. Update Data & Dynamic Price Scale
    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0 || !indicators || !candleSeriesRef.current) return;

        // Dynamic Price Format Calculation
        const lastPrice = data[data.length - 1].close;
        let precision = 2;

        if (lastPrice < 0.0001) precision = 8;
        else if (lastPrice < 0.01) precision = 6;
        else if (lastPrice < 1) precision = 5;
        else if (lastPrice < 100) precision = 3;
        else precision = 2;

        const minMove = 1 / Math.pow(10, precision);
        const priceFormat = {
            type: 'price',
            precision: precision,
            minMove: minMove,
        };

        // Apply to all series to keep price scale consistent
        candleSeriesRef.current.applyOptions({ priceFormat });
        if (t3SeriesRef.current) t3SeriesRef.current.applyOptions({ priceFormat });
        if (t4SeriesRef.current) t4SeriesRef.current.applyOptions({ priceFormat });

        if (typeof candleSeriesRef.current.setData === 'function') {
            candleSeriesRef.current.setData(data);
        }

        if (indicators.series.trail3 && t3SeriesRef.current && typeof t3SeriesRef.current.setData === 'function') {
            t3SeriesRef.current.setData(indicators.series.trail3);
        }
        if (indicators.series.trail4 && t4SeriesRef.current && typeof t4SeriesRef.current.setData === 'function') {
            t4SeriesRef.current.setData(indicators.series.trail4);
        }
    }, [data, indicators]);

    // 4. Markers Effect (Dedicated reactive effect for markers)
    useEffect(() => {
        const series = candleSeriesRef.current;
        if (!series || typeof series.setMarkers !== 'function') return;

        if (!pnlModeExternal || pnlPoints.length === 0) {
            series.setMarkers([]);
            return;
        }

        // Use a simpler approach for v5 markers to ensure visibility
        const markers = pnlPoints.map((p) => ({
            time: p.time,
            position: p.type === 'ENTRY' ? (p.price < 0 ? 'aboveBar' : 'belowBar') : (p.price > 0 ? 'aboveBar' : 'belowBar'),
            color: p.type === 'ENTRY' ? '#3fb7ff' : '#ff9800',
            shape: p.type === 'ENTRY' ? 'arrowUp' : 'arrowDown',
            text: p.type,
            size: 1
        })).sort((a, b) => {
            const tA = typeof a.time === 'number' ? a.time : 0;
            const tB = typeof b.time === 'number' ? b.time : 0;
            return tA - tB;
        });

        series.setMarkers(markers);
    }, [pnlPoints, data, pnlModeExternal]);

    // 3. PnL Click
    useEffect(() => {
        if (!chartRef.current || !pnlModeExternal) return;
        const chart = chartRef.current;
        const handlePnLClick = (param) => {
            if (!param.point || !param.time || !candleSeriesRef.current) return;
            const candleSeries = candleSeriesRef.current;

            // Get data for the clicked candle to snap price
            const data = param.seriesData.get(candleSeries);
            if (!data) return;

            const price = data.close;
            const exactTime = param.time; // param.time is the most reliable for markers in v5

            setPnlPoints(prev => {
                const isReset = prev.length >= 2;
                const newPoint = { price, time: exactTime, type: (isReset || prev.length === 0) ? 'ENTRY' : 'EXIT' };
                return isReset ? [newPoint] : [...prev, newPoint];
            });
        };
        chart.subscribeClick(handlePnLClick);
        return () => chart.unsubscribeClick(handlePnLClick);
    }, [pnlModeExternal]);

    // 4. Keyboard
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === 'Shift') setPnlModeExternal(true);
            if (e.key === 'Escape') {
                setPnlModeExternal(false);
                setPnlPoints([]);
            }
        };
        const onKeyUp = (e) => { if (e.key === 'Shift') setPnlModeExternal(false); };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); };
    }, []);

    let pnlDetails = null;
    if (pnlPoints.length === 2) {
        const entry = pnlPoints[0].price;
        const exit = pnlPoints[1].price;
        const leverage = 20;
        const margin = 100;
        const side = exit > entry ? 'LONG' : 'SHORT';
        const pnlPct = side === 'LONG' ? (exit - entry) / entry : (entry - exit) / entry;
        const roe = pnlPct * leverage * 100;
        const pnlUsdt = margin * pnlPct * leverage;
        pnlDetails = { side, entry, exit, roe, pnlUsdt, leverage, margin };
    }

    return (
        <div className="mini-chart-wrapper" style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '300px' }}>
            <div
                ref={chartContainerRef}
                className="mini-chart-container"
                style={{ flex: 1, width: '100%', height: '100%' }}
            />
            {pnlModeExternal && livePnl && (
                <div className="pnl-tool-tooltip" style={{ left: livePnl.x + 15, top: livePnl.y + 15 }}>
                    {pnlPoints.length === 0 ? (
                        <span>Click to set <b>ENTRY</b></span>
                    ) : pnlPoints.length === 1 ? (
                        <div>
                            <div style={{ color: '#d29922', fontWeight: 800, fontSize: 10, marginBottom: 4 }}>MEASURING (20x)</div>
                            <div>Price: {livePnl.price.toFixed(4)}</div>
                            <div style={{ color: livePnl.price > pnlPoints[0].price ? '#4ade80' : '#f87171', fontWeight: 700 }}>
                                ROE: {((livePnl.price > pnlPoints[0].price ? (livePnl.price - pnlPoints[0].price) / pnlPoints[0].price : (pnlPoints[0].price - livePnl.price) / pnlPoints[0].price) * 2000).toFixed(2)}%
                            </div>
                            <div style={{ marginTop: 4, fontSize: 10, opacity: 0.7 }}>Click to set <b>EXIT</b></div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, gap: 12 }}>
                                <span style={{ color: '#d29922', fontWeight: 800 }}>PNL RESULT</span>
                                <span style={{ opacity: 0.5, fontSize: 10 }}>ESC to clear</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, gap: 16 }}>
                                <span>Side:</span>
                                <span style={{ color: pnlDetails.side === 'LONG' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{pnlDetails.side}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Entry:</span> <span>{pnlDetails.entry.toFixed(4)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>Exit:</span> <span>{pnlDetails.exit.toFixed(4)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span>ROE%:</span>
                                <span style={{ color: pnlDetails.roe >= 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>{pnlDetails.roe.toFixed(2)}% (20x)</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>PnL:</span>
                                <span style={{ color: pnlDetails.roe >= 0 ? '#4ade80' : '#f87171', fontWeight: 800 }}>{pnlDetails.pnlUsdt.toFixed(2)} USDT (100)</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
