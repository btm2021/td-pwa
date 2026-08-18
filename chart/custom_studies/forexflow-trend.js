/*
 * TradingView Advanced Charts adapter for the ForexFlow trend detector.
 * Source algorithm: https://github.com/bmarshall511/forexflow
 * Source revision: 7c60bbf5a4ae59150bd3bc425a06a4934cdd0af0
 * SPDX-License-Identifier: AGPL-3.0-only
 */

(function registerForexFlowTrendStudy(root) {
    'use strict';

    const PLOT_COUNT = 14;
    const COLORS = {
        up: '#3B82F6',
        down: '#F97316',
        forming: '#94A3B8',
        terminated: '#EF4444',
    };

    const LABEL_PLOTS = [
        { id: 'swing_h', label: 'H', color: COLORS.forming, location: 'AboveBar', shape: 'shape_label_down' },
        { id: 'swing_hh', label: 'HH', color: COLORS.up, location: 'AboveBar', shape: 'shape_label_down' },
        { id: 'swing_lh', label: 'LH', color: COLORS.down, location: 'AboveBar', shape: 'shape_label_down' },
        { id: 'swing_l', label: 'L', color: COLORS.forming, location: 'BelowBar', shape: 'shape_label_up' },
        { id: 'swing_hl', label: 'HL', color: COLORS.up, location: 'BelowBar', shape: 'shape_label_up' },
        { id: 'swing_ll', label: 'LL', color: COLORS.down, location: 'BelowBar', shape: 'shape_label_up' },
    ];

    function emptyPlots() {
        return new Array(PLOT_COUNT).fill(NaN);
    }

    function finiteNumber(value, fallback) {
        return Number.isFinite(value) ? value : fallback;
    }

    function normalizeTimeframe(period) {
        const raw = String(period || '').toUpperCase();
        if (/^\d+$/.test(raw)) {
            const minutes = Number(raw);
            if (minutes < 60) return `M${minutes}`;
            if (minutes % 60 === 0) return `H${minutes / 60}`;
        }
        if (raw === '1D') return 'D';
        if (raw === '1W') return 'W';
        if (raw === '1M') return 'M';
        return raw;
    }

    function normalizeInstrument(ticker) {
        const raw = String(ticker || '')
            .split(':')
            .pop()
            .replace('/', '_')
            .toUpperCase();

        if (/^[A-Z]{6}$/.test(raw)) {
            return `${raw.slice(0, 3)}_${raw.slice(3)}`;
        }
        return raw;
    }

    function readPeriod(PineJS, context) {
        try {
            return normalizeTimeframe(PineJS.Std.period(context));
        } catch (error) {
            return '';
        }
    }

    function readTicker(PineJS, context) {
        try {
            return normalizeInstrument(PineJS.Std.ticker(context));
        } catch (error) {
            return '';
        }
    }

    function swingKey(swing) {
        return `swing:${swing.type}:${swing.time}:${swing.price}`;
    }

    function breakoutKey(segment) {
        return [
            'bos',
            segment.direction,
            segment.from.time,
            segment.from.price,
            segment.to.time,
            segment.to.price,
        ].join(':');
    }

    function trendSignature(trend) {
        const swing = trend.controllingSwing;
        const control = swing
            ? `${swing.type}:${swing.time}:${swing.price}`
            : 'none';
        return `${trend.status}:${trend.direction || 'range'}:${control}`;
    }

    function rebuildEventKeys(eventLog) {
        const keys = new Set();
        for (const entry of eventLog) {
            for (const key of entry.keys) keys.add(key);
        }
        return keys;
    }

    function shapeDefaults(color, location, plottype) {
        return {
            color,
            textColor: '#FFFFFF',
            transparency: 0,
            plottype,
            location,
            size: 'tiny',
            visible: true,
        };
    }

    function buildMetainfo() {
        const plots = [
            { id: 'trend_bg', type: 'bg_colorer', palette: 'trend_state_palette' },
            { id: 'control_level', type: 'line' },
            {
                id: 'control_color',
                type: 'colorer',
                palette: 'control_palette',
                target: 'control_level',
            },
            { id: 'swing_path', type: 'line' },
            { id: 'swing_offset', type: 'dataoffset', target: 'swing_path' },
            ...LABEL_PLOTS.map((plot) => ({ id: plot.id, type: 'shapes' })),
            { id: 'bos_up', type: 'shapes' },
            { id: 'bos_down', type: 'shapes' },
            { id: 'terminated', type: 'shapes' },
        ];

        const defaultStyles = {
            trend_bg: {
                transparency: 95,
                visible: true,
            },
            control_level: {
                linestyle: 2,
                linewidth: 2,
                plottype: 9,
                trackPrice: true,
                transparency: 5,
                visible: true,
                color: COLORS.up,
            },
            swing_path: {
                linestyle: 0,
                linewidth: 2,
                plottype: 0,
                trackPrice: false,
                transparency: 10,
                visible: true,
                color: COLORS.forming,
            },
            bos_up: shapeDefaults(COLORS.up, 'BelowBar', 'shape_label_up'),
            bos_down: shapeDefaults(COLORS.down, 'AboveBar', 'shape_label_down'),
            terminated: shapeDefaults(COLORS.terminated, 'Absolute', 'shape_xcross'),
        };

        const styles = {
            control_level: {
                title: 'Controlling Swing',
                histogramBase: 0,
                joinPoints: false,
            },
            swing_path: {
                title: 'Market Structure',
                histogramBase: 0,
                joinPoints: false,
            },
            bos_up: {
                title: 'Bullish Breakout',
                text: 'BOS',
                location: 'BelowBar',
                plottype: 'shape_label_up',
                isHidden: false,
            },
            bos_down: {
                title: 'Bearish Breakout',
                text: 'BOS',
                location: 'AboveBar',
                plottype: 'shape_label_down',
                isHidden: false,
            },
            terminated: {
                title: 'Trend Terminated',
                text: 'TERM',
                location: 'Absolute',
                plottype: 'shape_xcross',
                isHidden: false,
            },
        };

        for (const plot of LABEL_PLOTS) {
            defaultStyles[plot.id] = shapeDefaults(
                plot.color,
                plot.location,
                plot.shape
            );
            styles[plot.id] = {
                title: `Structure ${plot.label}`,
                text: plot.label,
                location: plot.location,
                plottype: plot.shape,
                isHidden: false,
            };
        }

        return {
            _metainfoVersion: 51,
            id: 'forexflow_trend_structure@tv-basicstudies-1',
            name: 'ForexFlow Trend & Structure',
            description: 'ForexFlow Trend & Structure',
            shortDescription: 'FXFlow Trend',
            classId: 'ScriptWithDataOffset',
            is_hidden_study: false,
            is_price_study: true,
            linkedToSeries: true,
            isCustomIndicator: true,
            format: { type: 'inherit' },
            plots,
            palettes: {
                trend_state_palette: {
                    colors: [
                        { name: 'Forming / Range' },
                        { name: 'Uptrend Confirmed' },
                        { name: 'Downtrend Confirmed' },
                        { name: 'Trend Terminated' },
                    ],
                    valToIndex: { 0: 0, 1: 1, 2: 2, 3: 3 },
                },
                control_palette: {
                    colors: [
                        { name: 'Uptrend Control' },
                        { name: 'Downtrend Control' },
                        { name: 'Terminated Control' },
                    ],
                    valToIndex: { 1: 0, 2: 1, 3: 2 },
                },
            },
            defaults: {
                styles: defaultStyles,
                palettes: {
                    trend_state_palette: {
                        colors: [
                            { color: COLORS.forming },
                            { color: COLORS.up },
                            { color: COLORS.down },
                            { color: COLORS.terminated },
                        ],
                    },
                    control_palette: {
                        colors: [
                            { color: COLORS.up, width: 2, style: 2 },
                            { color: COLORS.down, width: 2, style: 2 },
                            { color: COLORS.terminated, width: 2, style: 2 },
                        ],
                    },
                },
                inputs: {
                    swingStrength: 5,
                    minSegmentAtr: 0.5,
                    maxSwingPoints: 20,
                    lookback: 500,
                    showZigzag: true,
                    showSwingLabels: true,
                    showControlLevel: true,
                    showBOS: true,
                    showStateBackground: false,
                },
            },
            inputs: [
                {
                    id: 'swingStrength',
                    name: 'Swing Strength (0 = Auto)',
                    defval: 5,
                    type: 'integer',
                    min: 0,
                    max: 10,
                },
                {
                    id: 'minSegmentAtr',
                    name: 'Minimum Segment (ATR)',
                    defval: 0.5,
                    type: 'float',
                    min: 0,
                    max: 3,
                    step: 0.1,
                },
                {
                    id: 'maxSwingPoints',
                    name: 'Maximum Swing Points',
                    defval: 20,
                    type: 'integer',
                    min: 6,
                    max: 50,
                },
                {
                    id: 'lookback',
                    name: 'Lookback Candles',
                    defval: 500,
                    type: 'integer',
                    min: 100,
                    max: 500,
                },
                {
                    id: 'showZigzag',
                    name: 'Show Structure Line',
                    defval: true,
                    type: 'bool',
                },
                {
                    id: 'showSwingLabels',
                    name: 'Show H / HH / HL / LH / LL Labels',
                    defval: true,
                    type: 'bool',
                },
                {
                    id: 'showControlLevel',
                    name: 'Show Controlling Swing',
                    defval: true,
                    type: 'bool',
                },
                {
                    id: 'showBOS',
                    name: 'Show Breakout Marker',
                    defval: true,
                    type: 'bool',
                },
                {
                    id: 'showStateBackground',
                    name: 'Show Trend State Background',
                    defval: false,
                    type: 'bool',
                },
            ],
            styles,
        };
    }

    function createForexFlowTrend(PineJS) {
        const core = root.ForexFlowTrendCore;
        if (!core) {
            throw new Error(
                'ForexFlowTrendCore is missing. Load forexflow-trend-core.js before forexflow-trend.js.'
            );
        }

        return {
            name: 'ForexFlow Trend & Structure',
            metainfo: buildMetainfo(),

            constructor: function ForexFlowTrendStudy() {
                this.init = function init(context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;
                    this.lastTime = NaN;
                    this.committedCandles = [];
                    this.currentCandle = null;
                    this.committedEventLog = [];
                    this.committedEventKeys = new Set();
                    this.committedTrendSignature = null;
                    this.currentEventKeys = [];
                    this.currentTrendSignature = null;
                    this.loggedCalculationError = false;

                    const timeframe = readPeriod(PineJS, this._context);
                    const requestedStrength = Math.round(
                        finiteNumber(this._input(0), 5)
                    );
                    const strength = requestedStrength > 0
                        ? Math.min(10, requestedStrength)
                        : core.getDefaultSwingStrength(timeframe);
                    const lookback = Math.max(
                        100,
                        Math.min(
                            core.maxCandles,
                            Math.round(finiteNumber(this._input(3), 500))
                        )
                    );

                    if (typeof this._context.setMinimumAdditionalDepth === 'function') {
                        this._context.setMinimumAdditionalDepth(
                            lookback + strength * 2 + 20
                        );
                    }
                };

                this.main = function main(context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const time = PineJS.Std.time(this._context);
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);

                    if (![time, open, high, low, close].every(Number.isFinite)) {
                        return emptyPlots();
                    }

                    if (Number.isFinite(this.lastTime) && time < this.lastTime) {
                        const rewindIndex = this.committedCandles.findIndex(
                            (candle) => candle.time >= time
                        );
                        if (rewindIndex >= 0) {
                            this.committedCandles = this.committedCandles.slice(0, rewindIndex);
                            this.committedEventLog = this.committedEventLog.slice(0, rewindIndex);
                        }
                        this.committedEventKeys = rebuildEventKeys(this.committedEventLog);
                        this.committedTrendSignature = this.committedEventLog.length > 0
                            ? this.committedEventLog[this.committedEventLog.length - 1].trendSignature
                            : null;
                        this.lastTime = NaN;
                        this.currentCandle = null;
                        this.currentEventKeys = [];
                        this.currentTrendSignature = null;
                    }

                    const timeframe = readPeriod(PineJS, this._context);
                    const instrument = readTicker(PineJS, this._context);
                    const requestedStrength = Math.round(
                        finiteNumber(this._input(0), 5)
                    );
                    const strength = requestedStrength > 0
                        ? Math.max(1, Math.min(10, requestedStrength))
                        : core.getDefaultSwingStrength(timeframe);
                    const minimumSegmentAtr = Math.max(
                        0,
                        Math.min(3, finiteNumber(this._input(1), 0.5))
                    );
                    const maximumSwingPoints = Math.max(
                        6,
                        Math.min(50, Math.round(finiteNumber(this._input(2), 20)))
                    );
                    const lookback = Math.max(
                        100,
                        Math.min(
                            core.maxCandles,
                            Math.round(finiteNumber(this._input(3), 500))
                        )
                    );
                    const showZigzag = Boolean(this._input(4));
                    const showSwingLabels = Boolean(this._input(5));
                    const showControlLevel = Boolean(this._input(6));
                    const showBreakout = Boolean(this._input(7));
                    const showStateBackground = Boolean(this._input(8));
                    const isNewBar = !Number.isFinite(this.lastTime) || time !== this.lastTime;

                    if (isNewBar) {
                        if (this.currentCandle !== null) {
                            this.committedCandles.push(this.currentCandle);
                            this.committedEventLog.push({
                                time: this.currentCandle.time,
                                keys: this.currentEventKeys.slice(),
                                trendSignature: this.currentTrendSignature,
                            });
                            for (const key of this.currentEventKeys) {
                                this.committedEventKeys.add(key);
                            }
                            this.committedTrendSignature = this.currentTrendSignature;
                        }
                        this.currentEventKeys = [];
                        this.currentTrendSignature = null;
                        this.lastTime = time;
                    }

                    const maximumCommitted = Math.max(0, lookback - 1);
                    if (this.committedCandles.length > maximumCommitted) {
                        this.committedCandles = this.committedCandles.slice(-maximumCommitted);
                        this.committedEventLog = this.committedEventLog.slice(-maximumCommitted);
                        this.committedEventKeys = rebuildEventKeys(this.committedEventLog);
                        this.committedTrendSignature = this.committedEventLog.length > 0
                            ? this.committedEventLog[this.committedEventLog.length - 1].trendSignature
                            : null;
                    }

                    const currentCandle = { time, open, high, low, close };
                    this.currentCandle = currentCandle;
                    const candles = maximumCommitted > 0
                        ? this.committedCandles.slice(-maximumCommitted)
                        : [];
                    candles.push(currentCandle);

                    const config = {
                        swingStrength: strength,
                        minSegmentAtr: minimumSegmentAtr,
                        maxSwingPoints: maximumSwingPoints,
                        lookbackCandles: lookback,
                    };

                    let trend;
                    let visibleSwingPoints;
                    try {
                        trend = core.detectTrend(
                            candles,
                            instrument,
                            timeframe,
                            config,
                            close
                        );
                        visibleSwingPoints = trend.swingPoints.length > 0
                            ? trend.swingPoints
                            : core.getFilteredSwingPoints(candles, timeframe, config);
                    } catch (error) {
                        if (!this.loggedCalculationError) {
                            console.error('[ForexFlow Trend] Calculation failed:', error);
                            this.loggedCalculationError = true;
                        }
                        this.currentEventKeys = [];
                        this.currentTrendSignature = null;
                        return emptyPlots();
                    }

                    const eventsThisBar = [];
                    const outputs = emptyPlots();

                    if (showStateBackground) {
                        outputs[0] = trend.status === 'terminated'
                            ? 3
                            : trend.direction === 'up'
                                ? 1
                                : trend.direction === 'down'
                                    ? 2
                                    : 0;
                    }

                    if (trend.controllingSwing && showControlLevel) {
                        outputs[1] = trend.controllingSwing.price;
                        outputs[2] = trend.status === 'terminated'
                            ? 3
                            : trend.direction === 'up'
                                ? 1
                                : 2;
                    }

                    const latestSwing = visibleSwingPoints[visibleSwingPoints.length - 1];
                    if (latestSwing) {
                        const key = swingKey(latestSwing);
                        if (!this.committedEventKeys.has(key)) {
                            eventsThisBar.push(key);

                            if (showZigzag) {
                                outputs[3] = latestSwing.price;
                                outputs[4] = latestSwing.candleIndex - (candles.length - 1);
                            }

                            if (showSwingLabels) {
                                const labelIndex = LABEL_PLOTS.findIndex(
                                    (plot) => plot.label === latestSwing.label
                                );
                                if (labelIndex >= 0) {
                                    outputs[5 + labelIndex] = {
                                        value: 1,
                                        // Every label plot uses a stable offset, as required by
                                        // StudyResultValueWithOffset. The pivot is confirmed
                                        // exactly `strength` bars after its source candle.
                                        offset: -strength,
                                    };
                                }
                            }
                        }
                    }

                    const breakout = trend.segments.find((segment) => segment.isBreakout);
                    if (breakout) {
                        const key = breakoutKey(breakout);
                        if (!this.committedEventKeys.has(key)) {
                            eventsThisBar.push(key);
                            if (showBreakout) {
                                outputs[breakout.direction === 'up' ? 11 : 12] = 1;
                            }
                        }
                    }

                    const currentTrendSignature = trendSignature(trend);
                    if (
                        trend.status === 'terminated' &&
                        trend.controllingSwing &&
                        currentTrendSignature !== this.committedTrendSignature
                    ) {
                        outputs[13] = trend.controllingSwing.price;
                    }

                    this.currentEventKeys = Array.from(new Set(eventsThisBar));
                    this.currentTrendSignature = currentTrendSignature;
                    return outputs;
                };
            },
        };
    }

    root.createForexFlowTrend = createForexFlowTrend;
})(typeof window !== 'undefined' ? window : globalThis);
