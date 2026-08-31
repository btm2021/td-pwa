/**
 * Adaptive Robust ZigZag [HH/HL/LH/LL]
 * 
 * Core Algorithm:
 * - State-Space Local Linear Trend Filter (Level + Velocity)
 * - Tanh Soft-Clipping of Price Innovations (Anti-Wick Spike)
 * - Dimensionless ATR Normalization & Adaptive Uncertainty
 * - Dual-Threshold Hysteresis for Noise Filtering
 * - ScriptWithDataOffset for 100% exact peak and trough candle anchoring
 */

(function (root) {
    'use strict';

    const COLOR_GREEN = '#089981';
    const COLOR_RED = '#F23645';
    const COLOR_ZIGZAG = '#2962FF';

    function buildMetainfo() {
        const plots = [
            // 1. Continuous Zigzag Line (with dataoffset onto exact peak/trough candle)
            { id: 'plot_zigzag', type: 'line' },
            { id: 'plot_zigzag_offset', type: 'dataoffset', target: 'plot_zigzag' },

            // 2. Swing Point Labels (HH, LH, HL, LL) with dataoffset onto exact peak/trough candle
            { id: 'shape_hh', type: 'shapes' },
            { id: 'shape_hh_offset', type: 'dataoffset', target: 'shape_hh' },
            { id: 'shape_lh', type: 'shapes' },
            { id: 'shape_lh_offset', type: 'dataoffset', target: 'shape_lh' },
            { id: 'shape_hl', type: 'shapes' },
            { id: 'shape_hl_offset', type: 'dataoffset', target: 'shape_hl' },
            { id: 'shape_ll', type: 'shapes' },
            { id: 'shape_ll_offset', type: 'dataoffset', target: 'shape_ll' },
        ];

        const styles = {
            plot_zigzag: { title: 'Adaptive Zigzag Line', histogramBase: 0, joinPoints: false },

            shape_hh: { title: 'Higher High (HH)', text: 'HH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_lh: { title: 'Lower High (LH)', text: 'LH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_hl: { title: 'Higher Low (HL)', text: 'HL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_ll: { title: 'Lower Low (LL)', text: 'LL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
        };

        const defaultStyles = {
            plot_zigzag: { visible: true, color: COLOR_ZIGZAG, linewidth: 2, linestyle: 0, plottype: 0, trackPrice: false, transparency: 0 },

            shape_hh: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_lh: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_hl: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_ll: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
        };

        const inputs = [
            { id: 'atrPeriod', name: 'ATR Period', defval: 14, type: 'integer', min: 1, max: 500 },
            { id: 'atrMultiplier', name: 'ATR Multiplier', defval: 2.0, type: 'float', min: 0.1, max: 10.0, step: 0.1 },
            { id: 'modelPeriod', name: 'State Model Period', defval: 20, type: 'integer', min: 3, max: 200 },
            { id: 'showSwingLabels', name: 'Show Swing Labels (HH/HL/LH/LL)', defval: true, type: 'bool' },
        ];

        const defaultInputs = {
            atrPeriod: 14,
            atrMultiplier: 2.0,
            modelPeriod: 20,
            showSwingLabels: true,
        };

        return {
            _metainfoVersion: 51,
            id: 'adaptive_zigzag@tv-basicstudies-1',
            name: 'Adaptive ZigZag',
            description: 'Adaptive Robust ZigZag with Dimensionless Normalization',
            shortDescription: 'Adaptive ZigZag',
            classId: 'ScriptWithDataOffset',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,
            format: { type: 'inherit' },
            plots: plots,
            styles: styles,
            defaults: {
                styles: defaultStyles,
                inputs: defaultInputs
            },
            inputs: inputs,
            precision: 4
        };
    }

    function createAdaptiveZigZag(PineJS) {
        return {
            name: 'Adaptive ZigZag',
            metainfo: buildMetainfo(),
            constructor: function () {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const atrPeriod = Math.max(1, Math.round(this._input(0)));
                    const modelPeriod = Math.max(3, Math.round(this._input(2)));
                    if (typeof this._context.setMinimumAdditionalDepth === 'function') {
                        this._context.setMinimumAdditionalDepth(atrPeriod + 6 * modelPeriod + 20);
                    }

                    this.last_time = NaN;

                    // History buffers
                    this.candles = [];
                    this.highs = [];
                    this.lows = [];

                    // State committed from previous bar
                    this.prev_close = NaN;
                    this.prev_atr = NaN;
                    this.prev_level = NaN;
                    this.prev_velocity = 0;
                    this.prev_uncertainty = 0;
                    this.prev_evidence = 0;
                    this.prev_direction = 0;
                    this.prev_bias = 0;

                    // Running Swing Extremum Tracking
                    this.current_leg_high = -Infinity;
                    this.current_leg_high_idx = -1;
                    this.current_leg_low = Infinity;
                    this.current_leg_low_idx = -1;

                    this.last_confirmed_high = NaN;
                    this.last_confirmed_low = NaN;

                    // Current open bar state
                    this.current_close = NaN;
                    this.current_atr = NaN;
                    this.current_level = NaN;
                    this.current_velocity = 0;
                    this.current_uncertainty = 0;
                    this.current_evidence = 0;
                    this.current_direction = 0;
                    this.current_bias = 0;
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const atrPeriod = Math.max(1, Math.round(this._input(0)));
                    const modelPeriod = Math.max(3, Math.round(this._input(2)));
                    const showSwingLabels = Boolean(this._input(3));

                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);
                    const open = PineJS.Std.open(this._context);
                    const time = PineJS.Std.time(this._context);

                    // Total plots: 2 (zigzag + offset) + 8 (4 shapes + 4 offsets) = 10
                    const totalPlots = 10;
                    if (![high, low, close, time].every(Number.isFinite)) {
                        return new Array(totalPlots).fill(NaN);
                    }

                    const isNewBar = isNaN(this.last_time) || time !== this.last_time;
                    if (isNewBar) {
                        if (!isNaN(this.last_time) && !isNaN(this.current_close)) {
                            this.prev_close = this.current_close;
                            this.prev_atr = this.current_atr;
                            this.prev_level = this.current_level;
                            this.prev_velocity = this.current_velocity;
                            this.prev_uncertainty = this.current_uncertainty;
                            this.prev_evidence = this.current_evidence;
                            this.prev_direction = this.current_direction;
                            this.prev_bias = this.current_bias;
                        }
                        this.candles.push({ time, open, high, low, close });
                        this.highs.push(high);
                        this.lows.push(low);
                        this.last_time = time;
                    } else if (this.candles.length > 0) {
                        const lastIdx = this.candles.length - 1;
                        this.candles[lastIdx] = { time, open, high, low, close };
                        this.highs[lastIdx] = high;
                        this.lows[lastIdx] = low;
                    } else {
                        this.candles.push({ time, open, high, low, close });
                        this.highs.push(high);
                        this.lows.push(low);
                    }

                    const currentIndex = this.candles.length - 1;

                    // 1. True Range & Wilder RMA
                    const trueRange = isNaN(this.prev_close)
                        ? high - low
                        : Math.max(
                            high - low,
                            Math.abs(high - this.prev_close),
                            Math.abs(low - this.prev_close)
                        );
                    const atr = isNaN(this.prev_atr)
                        ? trueRange
                        : (this.prev_atr * (atrPeriod - 1) + trueRange) / atrPeriod;

                    // 2. State-Space Local Linear Trend (Level + Velocity)
                    const alpha = 2 / (modelPeriod + 1);
                    const beta = 0.5 * alpha;
                    const predictedLevel = isNaN(this.prev_level)
                        ? close
                        : this.prev_level + this.prev_velocity;
                    const innovation = close - predictedLevel;
                    const innovationScale = Math.max(
                        atr,
                        this.prev_uncertainty,
                        Math.abs(close) * 1e-9,
                        1e-12
                    );

                    // 3. Tanh Soft-Clipping (Anti-Wick Spike)
                    const robustInnovation = innovationScale * Math.tanh(
                        innovation / innovationScale
                    );
                    const level = predictedLevel + alpha * robustInnovation;
                    const velocityDamping = 1 - 0.25 * alpha;
                    const velocity = velocityDamping * this.prev_velocity + beta * robustInnovation;
                    const uncertainty = (1 - alpha) * this.prev_uncertainty + alpha * Math.abs(innovation);

                    // 4. Directional Momentum Normalized by ATR
                    const safeAtr = Math.max(atr, Math.abs(close) * 1e-9, 1e-12);
                    const velocityEvidence = Math.tanh(3 * velocity / safeAtr);
                    const evidence = (1 - alpha) * this.prev_evidence + alpha * velocityEvidence;

                    // 5. Hysteresis Dual Thresholds
                    const enterThreshold = 0.28;
                    const exitThreshold = 0.08;
                    let direction = this.prev_direction;

                    if (direction === 0) {
                        if (evidence >= enterThreshold) direction = 1;
                        else if (evidence <= -enterThreshold) direction = -1;
                    } else if (direction === 1) {
                        if (evidence <= -enterThreshold) direction = -1;
                        else if (evidence < exitThreshold) direction = 0;
                    } else {
                        if (evidence >= enterThreshold) direction = 1;
                        else if (evidence > -exitThreshold) direction = 0;
                    }

                    // 6. Continuous Bias Tracking
                    let bias = direction !== 0 ? direction : this.prev_bias;
                    if (bias === 0) bias = evidence < 0 ? -1 : 1;
                    if (direction === 0) {
                        if (evidence >= exitThreshold) bias = 1;
                        else if (evidence <= -exitThreshold) bias = -1;
                    }

                    // 7. Exact Candle-Anchored ZigZag & Shapes Outputs
                    let outZigzag = NaN;
                    let outZigzagOffset = NaN;
                    let outHH = NaN, outHHOffset = NaN;
                    let outLH = NaN, outLHOffset = NaN;
                    let outHL = NaN, outHLOffset = NaN;
                    let outLL = NaN, outLLOffset = NaN;

                    const prevBias = this.prev_bias;
                    const isFlippingToBull = (bias === 1 && prevBias === -1);
                    const isFlippingToBear = (bias === -1 && prevBias === 1);

                    // Initialize extremum trackers on start
                    if (this.current_leg_high_idx < 0 || this.current_leg_low_idx < 0) {
                        this.current_leg_high = high;
                        this.current_leg_high_idx = currentIndex;
                        this.current_leg_low = low;
                        this.current_leg_low_idx = currentIndex;
                    }

                    if (isFlippingToBull) {
                        // Preceding Bear Leg is confirmed finished -> Lock Swing Low at exact low candle
                        const swingLowPrice = this.current_leg_low;
                        const swingLowIdx = this.current_leg_low_idx;
                        const offset = Math.min(0, swingLowIdx - currentIndex);

                        outZigzag = swingLowPrice;
                        outZigzagOffset = offset;

                        if (showSwingLabels) {
                            const isHL = isNaN(this.last_confirmed_low) || swingLowPrice >= this.last_confirmed_low;
                            if (isHL) {
                                outHL = swingLowPrice;
                                outHLOffset = offset;
                            } else {
                                outLL = swingLowPrice;
                                outLLOffset = offset;
                            }
                        }

                        this.last_confirmed_low = swingLowPrice;

                        // Start tracking Bull leg from the lowest low candle forward
                        let highestHigh = high;
                        let highestHighIdx = currentIndex;
                        const startSearch = Math.max(0, swingLowIdx);
                        for (let j = startSearch; j <= currentIndex; j++) {
                            if (this.highs[j] >= highestHigh) {
                                highestHigh = this.highs[j];
                                highestHighIdx = j;
                            }
                        }
                        this.current_leg_high = highestHigh;
                        this.current_leg_high_idx = highestHighIdx;
                    } else if (isFlippingToBear) {
                        // Preceding Bull Leg is confirmed finished -> Lock Swing High at exact high candle
                        const swingHighPrice = this.current_leg_high;
                        const swingHighIdx = this.current_leg_high_idx;
                        const offset = Math.min(0, swingHighIdx - currentIndex);

                        outZigzag = swingHighPrice;
                        outZigzagOffset = offset;

                        if (showSwingLabels) {
                            const isHH = isNaN(this.last_confirmed_high) || swingHighPrice >= this.last_confirmed_high;
                            if (isHH) {
                                outHH = swingHighPrice;
                                outHHOffset = offset;
                            } else {
                                outLH = swingHighPrice;
                                outLHOffset = offset;
                            }
                        }

                        this.last_confirmed_high = swingHighPrice;

                        // Start tracking Bear leg from the highest high candle forward
                        let lowestLow = low;
                        let lowestLowIdx = currentIndex;
                        const startSearch = Math.max(0, swingHighIdx);
                        for (let j = startSearch; j <= currentIndex; j++) {
                            if (this.lows[j] <= lowestLow) {
                                lowestLow = this.lows[j];
                                lowestLowIdx = j;
                            }
                        }
                        this.current_leg_low = lowestLow;
                        this.current_leg_low_idx = lowestLowIdx;
                    } else {
                        // Continue current leg -> track exact highest High or lowest Low
                        if (bias === 1) {
                            if (high >= this.current_leg_high) {
                                this.current_leg_high = high;
                                this.current_leg_high_idx = currentIndex;
                            }
                        } else {
                            if (low <= this.current_leg_low) {
                                this.current_leg_low = low;
                                this.current_leg_low_idx = currentIndex;
                            }
                        }
                    }

                    // Commit current tick
                    this.current_close = close;
                    this.current_atr = atr;
                    this.current_level = level;
                    this.current_velocity = velocity;
                    this.current_uncertainty = uncertainty;
                    this.current_evidence = evidence;
                    this.current_direction = direction;
                    this.current_bias = bias;

                    // Memory cleanup
                    if (this.candles.length > 4000) {
                        const trimCount = 1500;
                        this.candles = this.candles.slice(trimCount);
                        this.highs = this.highs.slice(trimCount);
                        this.lows = this.lows.slice(trimCount);
                        this.current_leg_high_idx = Math.max(0, this.current_leg_high_idx - trimCount);
                        this.current_leg_low_idx = Math.max(0, this.current_leg_low_idx - trimCount);
                    }

                    // Series Outputs strictly matching buildMetainfo().plots:
                    // 0: plot_zigzag
                    // 1: plot_zigzag_offset
                    // 2: shape_hh
                    // 3: shape_hh_offset
                    // 4: shape_lh
                    // 5: shape_lh_offset
                    // 6: shape_hl
                    // 7: shape_hl_offset
                    // 8: shape_ll
                    // 9: shape_ll_offset
                    return [
                        outZigzag,
                        outZigzagOffset,
                        outHH,
                        outHHOffset,
                        outLH,
                        outLHOffset,
                        outHL,
                        outHLOffset,
                        outLL,
                        outLLOffset
                    ];
                };
            }
        };
    }

    root.createAdaptiveZigZag = createAdaptiveZigZag;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { createAdaptiveZigZag };
    }
})(typeof window !== 'undefined' ? window : globalThis);
