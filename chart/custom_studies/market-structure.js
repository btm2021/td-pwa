/**
 * Market Structure [HH/HL/LL/LH] - Zero-Shift Accurate Zigzag Engine
 * 
 * Accurately connects the exact peak of High candles to the exact trough of Low candles:
 * - Uptrend:   HL → HH → HL → HH
 * - Downtrend: LH → LL → LH → LL
 * - Reversal:  CHoCH (Change of Character)
 * 
 * Features:
 * 1. Zero-shift Zigzag connecting line directly attached to exact candle highs and lows.
 * 2. Standard Labels for Higher High (HH), Lower High (LH), Higher Low (HL), Lower Low (LL).
 * 3. Dynamic Structure Breakout markers (BOS & CHoCH) on breakout candle.
 * 4. Active High/Low horizontal level lines.
 */

(function (root) {
    'use strict';

    // LuxAlgo Colors
    const COLOR_GREEN = '#089981';
    const COLOR_RED = '#F23645';
    const COLOR_CHOCH_BULL = '#00E676';
    const COLOR_CHOCH_BEAR = '#FF1744';
    const COLOR_ZIGZAG = '#2962FF';

    const PIVOT_RIGHT = 5;

    function buildMetainfo() {
        const plots = [
            // 1. Continuous Zigzag Line (offset: -5 onto exact pivot candle)
            { id: 'plot_zigzag', type: 'line', offset: -PIVOT_RIGHT },

            // 2. Horizontal Structure Levels (offset: 0)
            { id: 'plot_high_level', type: 'line' },
            { id: 'plot_low_level', type: 'line' },

            // 3. Swing Point Shapes (offset: -5 onto exact pivot candle)
            { id: 'shape_hh', type: 'shapes', offset: -PIVOT_RIGHT },
            { id: 'shape_lh', type: 'shapes', offset: -PIVOT_RIGHT },
            { id: 'shape_hl', type: 'shapes', offset: -PIVOT_RIGHT },
            { id: 'shape_ll', type: 'shapes', offset: -PIVOT_RIGHT },

            // 4. Breakout Shapes: BOS & CHoCH (offset: 0 on breakout candle)
            { id: 'shape_bos_bull', type: 'shapes' },
            { id: 'shape_bos_bear', type: 'shapes' },
            { id: 'shape_choch_bull', type: 'shapes' },
            { id: 'shape_choch_bear', type: 'shapes' },
        ];

        const styles = {
            plot_zigzag: { title: 'Zigzag Structure Line', histogramBase: 0, joinPoints: true },
            plot_high_level: { title: 'Structure High Level', histogramBase: 0, joinPoints: false },
            plot_low_level: { title: 'Structure Low Level', histogramBase: 0, joinPoints: false },

            shape_hh: { title: 'Higher High (HH)', text: 'HH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_lh: { title: 'Lower High (LH)', text: 'LH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_hl: { title: 'Higher Low (HL)', text: 'HL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_ll: { title: 'Lower Low (LL)', text: 'LL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },

            shape_bos_bull: { title: 'Bullish BOS', text: 'BOS', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_bos_bear: { title: 'Bearish BOS', text: 'BOS', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_choch_bull: { title: 'Bullish CHoCH', text: 'CHoCH', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_choch_bear: { title: 'Bearish CHoCH', text: 'CHoCH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
        };

        const defaultStyles = {
            plot_zigzag: { visible: true, color: COLOR_ZIGZAG, linewidth: 2, linestyle: 0, plottype: 0, trackPrice: false, transparency: 0 },
            plot_high_level: { visible: true, color: COLOR_RED, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 25 },
            plot_low_level: { visible: true, color: COLOR_GREEN, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 25 },

            shape_hh: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_lh: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_hl: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_ll: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },

            shape_bos_bull: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_bos_bear: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_choch_bull: { color: COLOR_CHOCH_BULL, textColor: '#000000', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_choch_bear: { color: COLOR_CHOCH_BEAR, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
        };

        const inputs = [
            { id: 'leftBars', name: 'Pivot Left Bars', defval: 5, type: 'integer', min: 2, max: 50 },
            { id: 'showZigzag', name: 'Show Zigzag Line', defval: true, type: 'bool' },
            { id: 'showSwingLabels', name: 'Show Swing Labels (HH/HL/LH/LL)', defval: true, type: 'bool' },
            { id: 'showLevels', name: 'Show High/Low Structure Level Lines', defval: true, type: 'bool' },
            { id: 'showBOS', name: 'Show BOS (Break of Structure)', defval: true, type: 'bool' },
            { id: 'showCHoCH', name: 'Show CHoCH (Change of Character)', defval: true, type: 'bool' },
        ];

        const defaultInputs = {
            leftBars: 5,
            showZigzag: true,
            showSwingLabels: true,
            showLevels: true,
            showBOS: true,
            showCHoCH: true,
        };

        return {
            _metainfoVersion: 51,
            id: 'market_structure@tv-basicstudies-1',
            name: 'Market Structure [HH/HL/LL/LH]',
            description: 'Market Structure - Zero-Shift Zigzag (HH, HL, LH, LL) & BOS/CHoCH',
            shortDescription: 'Market Structure',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,
            format: { type: 'inherit' },
            plots: plots,
            defaults: {
                styles: defaultStyles,
                inputs: defaultInputs,
            },
            inputs: inputs,
            styles: styles,
            precision: 4,
        };
    }

    function createMarketStructure(PineJS) {
        return {
            name: 'Market Structure [HH/HL/LL/LH]',
            metainfo: buildMetainfo(),

            constructor: function MarketStructureStudy() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // History buffers
                    this.candles = [];
                    this.highs = [];
                    this.lows = [];
                    this.lastTime = NaN;

                    // Alternating Swing State
                    this.lastZigzagType = null; // 'high' or 'low'
                    this.swingHigh = { currentLevel: NaN, lastLevel: NaN, barIndex: NaN, crossed: false };
                    this.swingLow = { currentLevel: NaN, lastLevel: NaN, barIndex: NaN, crossed: false };
                    this.marketBias = 0; // 1 = Uptrend, -1 = Downtrend

                    this.prevSwingHigh = NaN;
                    this.prevSwingLow = NaN;
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // 1. Inputs
                    const leftBars = Math.max(2, Math.min(50, Math.round(Number(this._input(0)) || 5)));
                    const rightBars = PIVOT_RIGHT; // 5
                    const showZigzag = Boolean(this._input(1));
                    const showSwingLabels = Boolean(this._input(2));
                    const showLevels = Boolean(this._input(3));
                    const showBOS = Boolean(this._input(4));
                    const showCHoCH = Boolean(this._input(5));

                    // 2. Bar Data
                    const time = PineJS.Std.time(this._context);
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);
                    const volume = PineJS.Std.volume(this._context) || 0;

                    const totalPlots = 11;
                    if (![time, open, high, low, close].every(Number.isFinite)) {
                        return new Array(totalPlots).fill(NaN);
                    }

                    // Handle Replay / Realtime rewind
                    const isNewBar = !Number.isFinite(this.lastTime) || time !== this.lastTime;
                    if (Number.isFinite(this.lastTime) && time < this.lastTime) {
                        const rewindIdx = this.candles.findIndex(c => c.time >= time);
                        if (rewindIdx >= 0) {
                            this.candles = this.candles.slice(0, rewindIdx);
                            this.highs = this.highs.slice(0, rewindIdx);
                            this.lows = this.lows.slice(0, rewindIdx);
                        }
                        this.lastTime = NaN;
                        this.lastZigzagType = null;
                        this.swingHigh = { currentLevel: NaN, lastLevel: NaN, barIndex: NaN, crossed: false };
                        this.swingLow = { currentLevel: NaN, lastLevel: NaN, barIndex: NaN, crossed: false };
                        this.marketBias = 0;
                        this.prevSwingHigh = NaN;
                        this.prevSwingLow = NaN;
                    }

                    const candle = { index: this.candles.length, time, open, high, low, close, volume };
                    if (isNewBar) {
                        this.candles.push(candle);
                        this.highs.push(high);
                        this.lows.push(low);
                        this.lastTime = time;
                    } else if (this.candles.length > 0) {
                        this.candles[this.candles.length - 1] = candle;
                        this.highs[this.highs.length - 1] = high;
                        this.lows[this.lows.length - 1] = low;
                    } else {
                        this.candles.push(candle);
                        this.highs.push(high);
                        this.lows.push(low);
                    }

                    const currentIndex = this.candles.length - 1;

                    // 3. Check for Pivot at candle (currentIndex - rightBars)
                    let zigzag = NaN;
                    let signalHH = NaN;
                    let signalLH = NaN;
                    let signalHL = NaN;
                    let signalLL = NaN;

                    this.prevSwingHigh = this.swingHigh.currentLevel;
                    this.prevSwingLow = this.swingLow.currentLevel;

                    if (currentIndex >= leftBars + rightBars) {
                        const pivotIdx = currentIndex - rightBars;
                        const pivotHigh = this.highs[pivotIdx];
                        const pivotLow = this.lows[pivotIdx];

                        // Test Pivot High
                        let isPH = true;
                        for (let k = pivotIdx - leftBars; k <= pivotIdx + rightBars; k++) {
                            if (k !== pivotIdx && this.highs[k] >= pivotHigh) {
                                isPH = false;
                                break;
                            }
                        }

                        // Test Pivot Low
                        let isPL = true;
                        for (let k = pivotIdx - leftBars; k <= pivotIdx + rightBars; k++) {
                            if (k !== pivotIdx && this.lows[k] <= pivotLow) {
                                isPL = false;
                                break;
                            }
                        }

                        // Alternating High / Low sequence
                        if (isPH && this.lastZigzagType !== 'high') {
                            this.lastZigzagType = 'high';
                            const isHH = isNaN(this.swingHigh.currentLevel) || pivotHigh >= this.swingHigh.currentLevel;
                            this.swingHigh.lastLevel = this.swingHigh.currentLevel;
                            this.swingHigh.currentLevel = pivotHigh;
                            this.swingHigh.barIndex = pivotIdx;
                            this.swingHigh.crossed = false;

                            // Plotted with offset: -rightBars onto exact pivot candle
                            zigzag = pivotHigh;
                            if (showSwingLabels) {
                                if (isHH) signalHH = pivotHigh;
                                else signalLH = pivotHigh;
                            }
                        } else if (isPL && this.lastZigzagType !== 'low') {
                            this.lastZigzagType = 'low';
                            const isLL = isNaN(this.swingLow.currentLevel) || pivotLow <= this.swingLow.currentLevel;
                            this.swingLow.lastLevel = this.swingLow.currentLevel;
                            this.swingLow.currentLevel = pivotLow;
                            this.swingLow.barIndex = pivotIdx;
                            this.swingLow.crossed = false;

                            // Plotted with offset: -rightBars onto exact pivot candle
                            zigzag = pivotLow;
                            if (showSwingLabels) {
                                if (isLL) signalLL = pivotLow;
                                else signalHL = pivotLow;
                            }
                        }
                    }

                    // 4. Structure Shifts: BOS & CHoCH on current candle (offset: 0)
                    let signalBOSBull = NaN;
                    let signalBOSBear = NaN;
                    let signalCHoCHBull = NaN;
                    let signalCHoCHBear = NaN;

                    if (Number.isFinite(this.swingHigh.currentLevel) && !this.swingHigh.crossed && close > this.swingHigh.currentLevel && currentIndex > this.swingHigh.barIndex) {
                        this.swingHigh.crossed = true;
                        const isCHoCH = this.marketBias === -1;
                        this.marketBias = 1;

                        if (isCHoCH && showCHoCH) {
                            signalCHoCHBull = low;
                        } else if (!isCHoCH && showBOS) {
                            signalBOSBull = low;
                        }
                    }

                    if (Number.isFinite(this.swingLow.currentLevel) && !this.swingLow.crossed && close < this.swingLow.currentLevel && currentIndex > this.swingLow.barIndex) {
                        this.swingLow.crossed = true;
                        const isCHoCH = this.marketBias === 1;
                        this.marketBias = -1;

                        if (isCHoCH && showCHoCH) {
                            signalCHoCHBear = high;
                        } else if (!isCHoCH && showBOS) {
                            signalBOSBear = high;
                        }
                    }

                    // 5. Active Horizontal Level Lines (offset: 0)
                    let plotHigh = (showLevels && Number.isFinite(this.swingHigh.currentLevel)) ? this.swingHigh.currentLevel : NaN;
                    let plotLow = (showLevels && Number.isFinite(this.swingLow.currentLevel)) ? this.swingLow.currentLevel : NaN;

                    if (Number.isFinite(this.prevSwingHigh) && this.swingHigh.currentLevel !== this.prevSwingHigh) {
                        plotHigh = NaN;
                    }
                    if (Number.isFinite(this.prevSwingLow) && this.swingLow.currentLevel !== this.prevSwingLow) {
                        plotLow = NaN;
                    }

                    // 6. Assemble Output Array matching buildMetainfo().plots strictly
                    const result = [
                        showZigzag ? zigzag : NaN,
                        plotHigh,
                        plotLow,
                        signalHH,
                        signalLH,
                        signalHL,
                        signalLL,
                        signalBOSBull,
                        signalBOSBear,
                        signalCHoCHBull,
                        signalCHoCHBear,
                    ];

                    // Memory Cleanup
                    if (this.candles.length > 2000) {
                        this.candles = this.candles.slice(-1000);
                        this.highs = this.highs.slice(-1000);
                        this.lows = this.lows.slice(-1000);
                    }

                    return result;
                };
            }
        };
    }

    // Export globally
    root.createMarketStructure = createMarketStructure;
})(typeof window !== 'undefined' ? window : globalThis);
