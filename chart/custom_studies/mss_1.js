/**
 * MSS_1 - Market Structure Shift & ATR-Confirmed Swing Classification (HH, HL, LH, LL)
 * 
 * Thuật toán:
 * 1. Tìm đỉnh/đáy ứng viên: Pivot nhỏ (left/right = 2-3)
 * 2. Lọc nhiễu bằng ATR: Khoảng cách di chuyển swing >= ATR * Multiplier
 * 3. Xác nhận swing bằng độ mạnh: Sau swing phải có cú di chuyển đủ lớn (move từ đỉnh/đáy >= ATR * X)
 * 4. So sánh với swing cùng loại:
 *    - High mới > High cũ -> HH
 *    - High mới < High cũ -> LH
 *    - Low mới  > Low cũ  -> HL
 *    - Low mới  < Low cũ  -> LL
 * 5. Đường Zigzag nối liền mạch + Đường cản cấu trúc High/Low Level Lines
 * 6. Nhận diện BOS (tiếp diễn) và MSS (đảo chiều xu hướng)
 */

(function (root) {
    'use strict';

    // Color Constants
    const COLOR_GREEN = '#089981';
    const COLOR_RED = '#F23645';
    const COLOR_MSS_BULL = '#00E676';
    const COLOR_MSS_BEAR = '#FF1744';
    const COLOR_ZIGZAG = '#787B86';

    function buildMetainfo() {
        const plots = [
            // 1. Structure Zigzag Path
            { id: 'plot_zigzag', type: 'line' },

            // 2. Structural High & Low Level Lines (for BOS / MSS)
            { id: 'plot_high_level', type: 'line' },
            { id: 'plot_low_level', type: 'line' },

            // 3. Strong / Weak Trailing Levels
            { id: 'plot_strong_weak_high', type: 'line' },
            { id: 'plot_strong_weak_low', type: 'line' },

            // 4. Swing Point Shapes (HH, LH, HL, LL)
            { id: 'shape_hh', type: 'shapes' },
            { id: 'shape_lh', type: 'shapes' },
            { id: 'shape_hl', type: 'shapes' },
            { id: 'shape_ll', type: 'shapes' },

            // 5. Breakout Shapes: BOS & MSS
            { id: 'shape_bos_bull', type: 'shapes' },
            { id: 'shape_bos_bear', type: 'shapes' },
            { id: 'shape_mss_bull', type: 'shapes' },
            { id: 'shape_mss_bear', type: 'shapes' },
        ];

        const styles = {
            plot_zigzag: { title: 'MSS Zigzag Path', histogramBase: 0, joinPoints: true },
            plot_high_level: { title: 'Structure High Level', histogramBase: 0, joinPoints: false },
            plot_low_level: { title: 'Structure Low Level', histogramBase: 0, joinPoints: false },
            plot_strong_weak_high: { title: 'Strong/Weak High Level', histogramBase: 0, joinPoints: false },
            plot_strong_weak_low: { title: 'Strong/Weak Low Level', histogramBase: 0, joinPoints: false },

            shape_hh: { title: 'Higher High (HH)', text: 'HH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_lh: { title: 'Lower High (LH)', text: 'LH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_hl: { title: 'Higher Low (HL)', text: 'HL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_ll: { title: 'Lower Low (LL)', text: 'LL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },

            shape_bos_bull: { title: 'Bullish BOS', text: 'BOS', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_bos_bear: { title: 'Bearish BOS', text: 'BOS', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_mss_bull: { title: 'Bullish MSS', text: 'MSS', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_mss_bear: { title: 'Bearish MSS', text: 'MSS', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
        };

        const defaultStyles = {
            plot_zigzag: { visible: true, color: COLOR_ZIGZAG, linewidth: 2, linestyle: 0, plottype: 0, trackPrice: false, transparency: 0 },
            plot_high_level: { visible: true, color: COLOR_RED, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 20 },
            plot_low_level: { visible: true, color: COLOR_GREEN, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 20 },
            plot_strong_weak_high: { visible: false, color: COLOR_RED, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 30 },
            plot_strong_weak_low: { visible: false, color: COLOR_GREEN, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 30 },

            shape_hh: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_lh: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_hl: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_ll: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },

            shape_bos_bull: { color: COLOR_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_bos_bear: { color: COLOR_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_mss_bull: { color: COLOR_MSS_BULL, textColor: '#000000', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_mss_bear: { color: COLOR_MSS_BEAR, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
        };

        const inputs = [
            // Candidate Pivot Inputs
            { id: 'pivotLeft', name: 'Pivot Left Bars', defval: 2, type: 'integer', min: 1, max: 20 },
            { id: 'pivotRight', name: 'Pivot Right Bars', defval: 2, type: 'integer', min: 1, max: 20 },

            // ATR Filter & Strength Confirmation
            { id: 'atrPeriod', name: 'ATR Period', defval: 14, type: 'integer', min: 1, max: 100 },
            { id: 'atrMultiplier', name: 'Min Move Strength (ATR × X)', defval: 0.8, type: 'float', min: 0.1, max: 10.0, step: 0.1 },

            // Visual Toggles
            { id: 'showSwingLabels', name: 'Show Swing Labels (HH/HL/LH/LL)', defval: true, type: 'bool' },
            { id: 'showZigzag', name: 'Show Zigzag Path', defval: true, type: 'bool' },
            { id: 'showStructureLines', name: 'Show High/Low Structure Level Lines', defval: true, type: 'bool' },
            { id: 'showBOS', name: 'Show BOS (Break of Structure)', defval: true, type: 'bool' },
            { id: 'showMSS', name: 'Show MSS (Market Structure Shift)', defval: true, type: 'bool' },
            { id: 'breakConfirmation', name: 'Breakout Confirmation', defval: 'Close', type: 'text', options: ['Close', 'Wick'] },
            { id: 'showStrongWeak', name: 'Show Strong/Weak High-Low', defval: false, type: 'bool' },
        ];

        const defaultInputs = {
            pivotLeft: 2,
            pivotRight: 2,
            atrPeriod: 14,
            atrMultiplier: 0.8,
            showSwingLabels: true,
            showZigzag: true,
            showStructureLines: true,
            showBOS: true,
            showMSS: true,
            breakConfirmation: 'Close',
            showStrongWeak: false,
        };

        return {
            _metainfoVersion: 51,
            id: 'mss_1@tv-basicstudies-1',
            name: 'MSS_1',
            description: 'MSS_1 - ATR-Confirmed Market Structure (HH, HL, LH, LL)',
            shortDescription: 'MSS_1',
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

    function createMSS_1(PineJS) {
        return {
            name: 'MSS_1',
            metainfo: buildMetainfo(),

            constructor: function MSS1Study() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // History buffers
                    this.candles = [];
                    this.atrs = [];
                    this.rmaATR = NaN;
                    this.lastTime = NaN;

                    // Candidate and confirmed swings
                    this.unconfirmedHighs = [];
                    this.unconfirmedLows = [];
                    this.confirmedSwings = [];

                    // Active structure levels
                    this.activeHighLevel = NaN;
                    this.activeLowLevel = NaN;
                    this.prevActiveHigh = NaN;
                    this.prevActiveLow = NaN;

                    // Current Zigzag tracking direction: 1 = moving up to High, -1 = moving down to Low
                    this.currentDir = 0;
                    this.marketTrend = 0; // 1 = uptrend (HH/HL), -1 = downtrend (LH/LL)

                    // Trailing Extremes
                    this.trailingTop = -Infinity;
                    this.trailingBottom = Infinity;
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // 1. Inputs
                    const pivotLeft = Math.max(1, Math.min(20, Math.round(Number(this._input(0)) || 2)));
                    const pivotRight = Math.max(1, Math.min(20, Math.round(Number(this._input(1)) || 2)));
                    const atrPeriod = Math.max(1, Math.min(100, Math.round(Number(this._input(2)) || 14)));
                    const atrMultiplier = Math.max(0.1, Number(this._input(3)) || 0.8);

                    const showSwingLabels = Boolean(this._input(4));
                    const showZigzag = Boolean(this._input(5));
                    const showStructureLines = Boolean(this._input(6));
                    const showBOS = Boolean(this._input(7));
                    const showMSS = Boolean(this._input(8));
                    const breakConfirmation = String(this._input(9) || 'Close').toLowerCase();
                    const useCloseBreak = breakConfirmation === 'close';
                    const showStrongWeak = Boolean(this._input(10));

                    // 2. Bar Data
                    const time = PineJS.Std.time(this._context);
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);
                    const volume = PineJS.Std.volume(this._context) || 0;

                    const totalPlots = 13;
                    if (![time, open, high, low, close].every(Number.isFinite)) {
                        return new Array(totalPlots).fill(NaN);
                    }

                    // Handle Replay / Realtime
                    const isNewBar = !Number.isFinite(this.lastTime) || time !== this.lastTime;
                    if (Number.isFinite(this.lastTime) && time < this.lastTime) {
                        const rewindIdx = this.candles.findIndex(c => c.time >= time);
                        if (rewindIdx >= 0) {
                            this.candles = this.candles.slice(0, rewindIdx);
                            this.atrs = this.atrs.slice(0, rewindIdx);
                        }
                        this.lastTime = NaN;
                        this.unconfirmedHighs = [];
                        this.unconfirmedLows = [];
                        this.confirmedSwings = [];
                        this.rmaATR = NaN;
                        this.activeHighLevel = NaN;
                        this.activeLowLevel = NaN;
                        this.currentDir = 0;
                        this.marketTrend = 0;
                    }

                    const candle = { index: this.candles.length, time, open, high, low, close, volume };
                    if (isNewBar) {
                        this.candles.push(candle);
                        this.lastTime = time;
                    } else if (this.candles.length > 0) {
                        this.candles[this.candles.length - 1] = candle;
                    } else {
                        this.candles.push(candle);
                    }

                    const currentIndex = this.candles.length - 1;

                    // 3. ATR Calculation (RMA smoothing)
                    const prevClose = currentIndex > 0 ? this.candles[currentIndex - 1].close : open;
                    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
                    if (!Number.isFinite(this.rmaATR) || currentIndex === 0) {
                        this.rmaATR = tr;
                    } else if (currentIndex < atrPeriod) {
                        this.rmaATR = (this.rmaATR * currentIndex + tr) / (currentIndex + 1);
                    } else if (isNewBar) {
                        this.rmaATR = (this.rmaATR * (atrPeriod - 1) + tr) / atrPeriod;
                    }

                    if (isNewBar) {
                        this.atrs.push(this.rmaATR);
                    } else if (this.atrs.length > 0) {
                        this.atrs[this.atrs.length - 1] = this.rmaATR;
                    } else {
                        this.atrs.push(this.rmaATR);
                    }

                    // 4. Step 1: Candidate Pivot Detection (left/right bars)
                    if (currentIndex >= pivotLeft + pivotRight) {
                        const testIdx = currentIndex - pivotRight;
                        const testCandle = this.candles[testIdx];
                        const atrAtPivot = this.atrs[testIdx] || this.rmaATR;
                        const minMove = atrAtPivot * atrMultiplier;

                        let isPH = true;
                        for (let k = testIdx - pivotLeft; k <= testIdx + pivotRight; k++) {
                            if (k !== testIdx && this.candles[k].high > testCandle.high) {
                                isPH = false;
                                break;
                            }
                        }

                        let isPL = true;
                        for (let k = testIdx - pivotLeft; k <= testIdx + pivotRight; k++) {
                            if (k !== testIdx && this.candles[k].low < testCandle.low) {
                                isPL = false;
                                break;
                            }
                        }

                        if (isPH && !this.unconfirmedHighs.some(h => h.index === testIdx)) {
                            this.unconfirmedHighs.push({ index: testIdx, price: testCandle.high, minMove, confirmed: false });
                        }
                        if (isPL && !this.unconfirmedLows.some(l => l.index === testIdx)) {
                            this.unconfirmedLows.push({ index: testIdx, price: testCandle.low, minMove, confirmed: false });
                        }
                    }

                    // 5. Steps 2 & 3: Filter Noise & Confirm by Strength (Move from peak/trough >= ATR * X)
                    let signalHH = NaN, signalLH = NaN, signalHL = NaN, signalLL = NaN;

                    for (let i = 0; i < this.unconfirmedHighs.length; i++) {
                        const cand = this.unconfirmedHighs[i];
                        if (!cand.confirmed && currentIndex > cand.index) {
                            let lowestAfter = Infinity;
                            for (let k = cand.index + 1; k <= currentIndex; k++) {
                                if (this.candles[k].low < lowestAfter) lowestAfter = this.candles[k].low;
                            }
                            if (cand.price - lowestAfter >= cand.minMove) {
                                cand.confirmed = true;
                                const prevHigh = this.confirmedSwings.filter(s => s.type === 1).pop();
                                const isHH = !prevHigh || cand.price >= prevHigh.price;
                                const sObj = { type: 1, price: cand.price, index: cand.index, label: isHH ? 'HH' : 'LH', confIdx: currentIndex, crossed: false };

                                const lastS = this.confirmedSwings[this.confirmedSwings.length - 1];
                                if (lastS && lastS.type === 1) {
                                    if (cand.price >= lastS.price) {
                                        this.confirmedSwings[this.confirmedSwings.length - 1] = sObj;
                                        if (showSwingLabels) {
                                            if (isHH) signalHH = cand.price;
                                            else signalLH = cand.price;
                                        }
                                        this.activeHighLevel = cand.price;
                                    }
                                } else {
                                    this.confirmedSwings.push(sObj);
                                    if (showSwingLabels) {
                                        if (isHH) signalHH = cand.price;
                                        else signalLH = cand.price;
                                    }
                                    this.activeHighLevel = cand.price;
                                    this.currentDir = -1; // Now moving down towards Low
                                }
                            }
                        }
                    }

                    for (let i = 0; i < this.unconfirmedLows.length; i++) {
                        const cand = this.unconfirmedLows[i];
                        if (!cand.confirmed && currentIndex > cand.index) {
                            let highestAfter = -Infinity;
                            for (let k = cand.index + 1; k <= currentIndex; k++) {
                                if (this.candles[k].high > highestAfter) highestAfter = this.candles[k].high;
                            }
                            if (highestAfter - cand.price >= cand.minMove) {
                                cand.confirmed = true;
                                const prevLow = this.confirmedSwings.filter(s => s.type === -1).pop();
                                const isLL = !prevLow || cand.price <= prevLow.price;
                                const sObj = { type: -1, price: cand.price, index: cand.index, label: isLL ? 'LL' : 'HL', confIdx: currentIndex, crossed: false };

                                const lastS = this.confirmedSwings[this.confirmedSwings.length - 1];
                                if (lastS && lastS.type === -1) {
                                    if (cand.price <= lastS.price) {
                                        this.confirmedSwings[this.confirmedSwings.length - 1] = sObj;
                                        if (showSwingLabels) {
                                            if (isLL) signalLL = cand.price;
                                            else signalHL = cand.price;
                                        }
                                        this.activeLowLevel = cand.price;
                                    }
                                } else {
                                    this.confirmedSwings.push(sObj);
                                    if (showSwingLabels) {
                                        if (isLL) signalLL = cand.price;
                                        else signalHL = cand.price;
                                    }
                                    this.activeLowLevel = cand.price;
                                    this.currentDir = 1; // Now moving up towards High
                                }
                            }
                        }
                    }

                    // 6. Step 4: BOS & MSS (Market Structure Shift) Detection
                    let signalBOSBull = NaN;
                    let signalBOSBear = NaN;
                    let signalMSSBull = NaN;
                    let signalMSSBear = NaN;

                    const breakPriceBull = useCloseBreak ? close : high;
                    const breakPriceBear = useCloseBreak ? close : low;

                    // Bullish Breakout of Active High Level
                    if (Number.isFinite(this.activeHighLevel) && breakPriceBull > this.activeHighLevel) {
                        const isMSS = this.marketTrend === -1;
                        this.marketTrend = 1;

                        if (isMSS && showMSS) {
                            signalMSSBull = this.activeHighLevel;
                        } else if (!isMSS && showBOS) {
                            signalBOSBull = this.activeHighLevel;
                        }
                        this.activeHighLevel = NaN; // Break consumed
                    }

                    // Bearish Breakdown of Active Low Level
                    if (Number.isFinite(this.activeLowLevel) && breakPriceBear < this.activeLowLevel) {
                        const isMSS = this.marketTrend === 1;
                        this.marketTrend = -1;

                        if (isMSS && showMSS) {
                            signalMSSBear = this.activeLowLevel;
                        } else if (!isMSS && showBOS) {
                            signalBOSBear = this.activeLowLevel;
                        }
                        this.activeLowLevel = NaN; // Break consumed
                    }

                    // 7. Continuous Zigzag Path Value
                    let plotZigzag = NaN;
                    if (showZigzag && this.confirmedSwings.length > 0) {
                        if (this.currentDir === -1) {
                            // Moving down from High
                            plotZigzag = low;
                        } else {
                            // Moving up from Low
                            plotZigzag = high;
                        }
                    }

                    // 8. Structure Level Lines (Break line on transition)
                    this.prevActiveHigh = this.activeHighLevel;
                    this.prevActiveLow = this.activeLowLevel;

                    let plotHighLevel = showStructureLines && Number.isFinite(this.activeHighLevel) ? this.activeHighLevel : NaN;
                    let plotLowLevel = showStructureLines && Number.isFinite(this.activeLowLevel) ? this.activeLowLevel : NaN;

                    // 9. Strong / Weak High-Low Trailing Levels
                    this.trailingTop = Math.max(high, this.trailingTop);
                    this.trailingBottom = Math.min(low, this.trailingBottom);

                    let plotStrongWeakHigh = NaN;
                    let plotStrongWeakLow = NaN;
                    if (showStrongWeak) {
                        plotStrongWeakHigh = this.trailingTop;
                        plotStrongWeakLow = this.trailingBottom;
                    }

                    // 10. Assemble Output Array matching buildMetainfo().plots exactly
                    const result = [];

                    // Line plots (5 plots)
                    result.push(plotZigzag);
                    result.push(plotHighLevel);
                    result.push(plotLowLevel);
                    result.push(plotStrongWeakHigh);
                    result.push(plotStrongWeakLow);

                    // Swing shapes (4 shapes)
                    result.push(signalHH);
                    result.push(signalLH);
                    result.push(signalHL);
                    result.push(signalLL);

                    // Break shapes (4 shapes)
                    result.push(signalBOSBull);
                    result.push(signalBOSBear);
                    result.push(signalMSSBull);
                    result.push(signalMSSBear);

                    // History Cleanup
                    if (this.candles.length > 2000) {
                        this.candles = this.candles.slice(-1000);
                        this.atrs = this.atrs.slice(-1000);
                        if (this.confirmedSwings.length > 100) this.confirmedSwings = this.confirmedSwings.slice(-50);
                        if (this.unconfirmedHighs.length > 50) this.unconfirmedHighs = this.unconfirmedHighs.filter(h => !h.confirmed).slice(-20);
                        if (this.unconfirmedLows.length > 50) this.unconfirmedLows = this.unconfirmedLows.filter(l => !l.confirmed).slice(-20);
                    }

                    return result;
                };
            }
        };
    }

    // Export globally
    root.createMSS_1 = createMSS_1;
})(typeof window !== 'undefined' ? window : globalThis);
