/**
 * Smart Money Concepts (SMC) Custom Indicator for TradingView Charting Library
 * 
 * Based on Python package: joshyattridge/smart-money-concepts
 * https://github.com/joshyattridge/smart-money-concepts
 * 
 * Clean, readable, and professional visualization:
 * - Structure (BOS / CHoCH) with crisp, non-cluttered labels
 * - Swing Points (HH / LH / HL / LL) with tiny unobtrusive markers
 * - Order Blocks (OB) rendered strictly as active shaded boxes (no infinite past/future lines)
 * - Fair Value Gaps (FVG) rendered strictly as active shaded zones with threshold filter
 * - Optional Liquidity (EQH/EQL) and Daily High/Low (PDH/PDL)
 * - All parameters and style options fully customizable via settings dialog
 */

(function (root) {
    'use strict';

    const MAX_OB_SLOTS = 4;
    const MAX_FVG_SLOTS = 4;

    // Professional Color Palette (LuxAlgo / ICT style)
    const COLOR_BULLISH = '#089981';
    const COLOR_BEARISH = '#F23645';
    const COLOR_CHOCH_BULL = '#00E676';
    const COLOR_CHOCH_BEAR = '#FF1744';
    const COLOR_FVG_BULL = '#2962FF';
    const COLOR_FVG_BEAR = '#FF9800';
    const COLOR_LIQ = '#E040FB';
    const COLOR_PDH = '#00BCD4';
    const COLOR_PDL = '#FF5722';

    function buildMetainfo() {
        const plots = [
            // 1. Structure Marker Shapes (HH, LH, HL, LL)
            { id: 'shape_hh', type: 'shapes' },
            { id: 'shape_lh', type: 'shapes' },
            { id: 'shape_hl', type: 'shapes' },
            { id: 'shape_ll', type: 'shapes' },

            // 2. BOS & CHoCH Marker Shapes
            { id: 'shape_bos_bull', type: 'shapes' },
            { id: 'shape_bos_bear', type: 'shapes' },
            { id: 'shape_choch_bull', type: 'shapes' },
            { id: 'shape_choch_bear', type: 'shapes' },

            // 3. Liquidity & Sweep Shapes
            { id: 'shape_eqh', type: 'shapes' },
            { id: 'shape_eql', type: 'shapes' },
            { id: 'shape_sweep_bull', type: 'shapes' },
            { id: 'shape_sweep_bear', type: 'shapes' },

            // 4. Optional reference lines (PDH / PDL)
            { id: 'plot_pdh', type: 'line' },
            { id: 'plot_pdl', type: 'line' },
        ];

        const filledAreas = [];
        const styles = {
            shape_hh: { title: 'Higher High (HH)', text: 'HH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_lh: { title: 'Lower High (LH)', text: 'LH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_hl: { title: 'Higher Low (HL)', text: 'HL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_ll: { title: 'Lower Low (LL)', text: 'LL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },

            shape_bos_bull: { title: 'Bullish BOS', text: 'BOS', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_bos_bear: { title: 'Bearish BOS', text: 'BOS', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_choch_bull: { title: 'Bullish CHoCH', text: 'CHoCH', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_choch_bear: { title: 'Bearish CHoCH', text: 'CHoCH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },

            shape_eqh: { title: 'Equal Highs (EQH)', text: 'EQH', location: 'AboveBar', plottype: 'shape_circle', isHidden: false },
            shape_eql: { title: 'Equal Lows (EQL)', text: 'EQL', location: 'BelowBar', plottype: 'shape_circle', isHidden: false },
            shape_sweep_bull: { title: 'Bullish Sweep', text: 'SWEEP', location: 'BelowBar', plottype: 'shape_diamond', isHidden: false },
            shape_sweep_bear: { title: 'Bearish Sweep', text: 'SWEEP', location: 'AboveBar', plottype: 'shape_diamond', isHidden: false },

            plot_pdh: { title: 'Previous Day High (PDH)', histogramBase: 0, joinPoints: false },
            plot_pdl: { title: 'Previous Day Low (PDL)', histogramBase: 0, joinPoints: false },
        };

        const defaultStyles = {
            shape_hh: { color: COLOR_BULLISH, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_lh: { color: COLOR_BEARISH, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_hl: { color: COLOR_BULLISH, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_ll: { color: COLOR_BEARISH, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },

            shape_bos_bull: { color: COLOR_BULLISH, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_bos_bear: { color: COLOR_BEARISH, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_choch_bull: { color: COLOR_CHOCH_BULL, textColor: '#000000', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_choch_bear: { color: COLOR_CHOCH_BEAR, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },

            shape_eqh: { color: COLOR_LIQ, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_circle', location: 'AboveBar', size: 'tiny', visible: true },
            shape_eql: { color: COLOR_LIQ, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_circle', location: 'BelowBar', size: 'tiny', visible: true },
            shape_sweep_bull: { color: COLOR_LIQ, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_diamond', location: 'BelowBar', size: 'tiny', visible: true },
            shape_sweep_bear: { color: COLOR_LIQ, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_diamond', location: 'AboveBar', size: 'tiny', visible: true },

            plot_pdh: { visible: false, color: COLOR_PDH, linewidth: 1, linestyle: 1, plottype: 0, trackPrice: false, transparency: 30 },
            plot_pdl: { visible: false, color: COLOR_PDL, linewidth: 1, linestyle: 1, plottype: 0, trackPrice: false, transparency: 30 },
        };

        const filledAreasStyle = {};

        // 5. Bullish Order Blocks (Slots)
        for (let i = 0; i < MAX_OB_SLOTS; i++) {
            const topId = `plot_ob_bull_top_${i}`;
            const btmId = `plot_ob_bull_btm_${i}`;
            const fillId = `fill_ob_bull_${i}`;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: `Demand OB ${i + 1} Top`, histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: `Demand OB ${i + 1} Bottom`, histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: COLOR_BULLISH, linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };
            defaultStyles[btmId] = { visible: true, color: COLOR_BULLISH, linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: `Demand OB ${i + 1}` });
            filledAreasStyle[fillId] = { color: 'rgba(8, 153, 129, 0.15)', transparency: 85, visible: true };
        }

        // 6. Bearish Order Blocks (Slots)
        for (let i = 0; i < MAX_OB_SLOTS; i++) {
            const topId = `plot_ob_bear_top_${i}`;
            const btmId = `plot_ob_bear_btm_${i}`;
            const fillId = `fill_ob_bear_${i}`;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: `Supply OB ${i + 1} Top`, histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: `Supply OB ${i + 1} Bottom`, histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: COLOR_BEARISH, linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };
            defaultStyles[btmId] = { visible: true, color: COLOR_BEARISH, linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: `Supply OB ${i + 1}` });
            filledAreasStyle[fillId] = { color: 'rgba(242, 54, 69, 0.15)', transparency: 85, visible: true };
        }

        // 7. Bullish Fair Value Gaps (Slots)
        for (let i = 0; i < MAX_FVG_SLOTS; i++) {
            const topId = `plot_fvg_bull_top_${i}`;
            const btmId = `plot_fvg_bull_btm_${i}`;
            const fillId = `fill_fvg_bull_${i}`;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: `Bullish FVG ${i + 1} Top`, histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: `Bullish FVG ${i + 1} Bottom`, histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: COLOR_FVG_BULL, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };
            defaultStyles[btmId] = { visible: true, color: COLOR_FVG_BULL, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: `Bullish FVG ${i + 1}` });
            filledAreasStyle[fillId] = { color: 'rgba(41, 98, 255, 0.12)', transparency: 88, visible: true };
        }

        // 8. Bearish Fair Value Gaps (Slots)
        for (let i = 0; i < MAX_FVG_SLOTS; i++) {
            const topId = `plot_fvg_bear_top_${i}`;
            const btmId = `plot_fvg_bear_btm_${i}`;
            const fillId = `fill_fvg_bear_${i}`;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: `Bearish FVG ${i + 1} Top`, histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: `Bearish FVG ${i + 1} Bottom`, histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: COLOR_FVG_BEAR, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };
            defaultStyles[btmId] = { visible: true, color: COLOR_FVG_BEAR, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: `Bearish FVG ${i + 1}` });
            filledAreasStyle[fillId] = { color: 'rgba(255, 152, 0, 0.12)', transparency: 88, visible: true };
        }

        const inputs = [
            // Structure Settings
            { id: 'swingLength', name: 'Swing Lookback (Pivots)', defval: 10, type: 'integer', min: 2, max: 100 },
            { id: 'breakConfirmation', name: 'Structure Break Confirmation', defval: 'Close', type: 'text', options: ['Close', 'Wick'] },
            { id: 'showSwingLabels', name: 'Show Swing Labels (HH/HL/LH/LL)', defval: true, type: 'bool' },
            { id: 'showBOS', name: 'Show BOS (Break of Structure)', defval: true, type: 'bool' },
            { id: 'showCHoCH', name: 'Show CHoCH (Change of Character)', defval: true, type: 'bool' },

            // Order Blocks Settings
            { id: 'showBullishOB', name: 'Show Demand Order Blocks (Bullish OB)', defval: true, type: 'bool' },
            { id: 'showBearishOB', name: 'Show Supply Order Blocks (Bearish OB)', defval: true, type: 'bool' },
            { id: 'maxOBZones', name: 'Max Active OB Zones Per Bias', defval: 3, type: 'integer', min: 1, max: MAX_OB_SLOTS },
            { id: 'obMitigation', name: 'OB Mitigation Method', defval: 'Wick', type: 'text', options: ['Wick', 'Close'] },
            { id: 'hideMitigatedOB', name: 'Hide Mitigated OBs', defval: true, type: 'bool' },

            // Fair Value Gaps Settings
            { id: 'showBullishFVG', name: 'Show Bullish FVG', defval: true, type: 'bool' },
            { id: 'showBearishFVG', name: 'Show Bearish FVG', defval: true, type: 'bool' },
            { id: 'maxFVGZones', name: 'Max Active FVG Zones Per Bias', defval: 3, type: 'integer', min: 1, max: MAX_FVG_SLOTS },
            { id: 'minFVGThreshold', name: 'Min FVG Imbalance %', defval: 0.1, type: 'float', min: 0.0, step: 0.01 },
            { id: 'joinConsecutiveFVG', name: 'Join Consecutive FVGs', defval: true, type: 'bool' },
            { id: 'hideMitigatedFVG', name: 'Hide Mitigated FVGs', defval: true, type: 'bool' },

            // Liquidity & Daily High/Low Settings
            { id: 'showLiquidity', name: 'Show Equal Highs/Lows (EQH/EQL)', defval: false, type: 'bool' },
            { id: 'liquidityRangePercent', name: 'Liquidity Tolerance Range %', defval: 0.3, type: 'float', min: 0.05, step: 0.05 },
            { id: 'showSweeps', name: 'Show Liquidity Sweeps', defval: false, type: 'bool' },
            { id: 'showPDHL', name: 'Show Previous Day High / Low (PDH/PDL)', defval: false, type: 'bool' },
        ];

        const defaultInputs = {
            swingLength: 10,
            breakConfirmation: 'Close',
            showSwingLabels: true,
            showBOS: true,
            showCHoCH: true,
            showBullishOB: true,
            showBearishOB: true,
            maxOBZones: 3,
            obMitigation: 'Wick',
            hideMitigatedOB: true,
            showBullishFVG: true,
            showBearishFVG: true,
            maxFVGZones: 3,
            minFVGThreshold: 0.1,
            joinConsecutiveFVG: true,
            hideMitigatedFVG: true,
            showLiquidity: false,
            liquidityRangePercent: 0.3,
            showSweeps: false,
            showPDHL: false,
        };

        return {
            _metainfoVersion: 51,
            id: 'smc@tv-basicstudies-1',
            name: 'Smart Money Concepts [SMC]',
            description: 'Smart Money Concepts (SMC) - ICT Methodology',
            shortDescription: 'SMC',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,
            format: { type: 'inherit' },
            plots: plots,
            filledAreas: filledAreas,
            defaults: {
                styles: defaultStyles,
                filledAreasStyle: filledAreasStyle,
                inputs: defaultInputs,
            },
            inputs: inputs,
            styles: styles,
            precision: 4,
        };
    }

    function createSlotTracker(maxSlots) {
        let slots = new Array(maxSlots).fill(null);
        return {
            reset: function () {
                slots = new Array(maxSlots).fill(null);
            },
            reconcile: function (activeZones) {
                const activeIds = new Set(activeZones.map(z => z.id));
                // Free slots whose zone is no longer active
                for (let i = 0; i < maxSlots; i++) {
                    if (slots[i] && !activeIds.has(slots[i])) {
                        slots[i] = null;
                    }
                }
                // Assign newly active zones to empty slots
                const assigned = new Set(slots.filter(id => id !== null));
                for (const zone of activeZones) {
                    if (assigned.has(zone.id)) continue;
                    const freeIdx = slots.indexOf(null);
                    if (freeIdx === -1) break;
                    slots[freeIdx] = zone.id;
                    assigned.add(zone.id);
                }
                return slots;
            }
        };
    }

    function createSMC(PineJS) {
        return {
            name: 'Smart Money Concepts [SMC]',
            metainfo: buildMetainfo(),

            constructor: function SMCStudy() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // History buffers
                    this.candles = [];
                    this.lastTime = NaN;

                    // Swings state
                    this.swings = [];
                    this.marketTrend = 0; // 1 = uptrend, -1 = downtrend

                    // Active Order Blocks
                    this.bullOBs = [];
                    this.bearOBs = [];

                    // Active Fair Value Gaps
                    this.bullFVGs = [];
                    this.bearFVGs = [];

                    // Slot Trackers for persistent, clean zone rendering
                    this.bullOBSlots = createSlotTracker(MAX_OB_SLOTS);
                    this.bearOBSlots = createSlotTracker(MAX_OB_SLOTS);
                    this.bullFVGSlots = createSlotTracker(MAX_FVG_SLOTS);
                    this.bearFVGSlots = createSlotTracker(MAX_FVG_SLOTS);

                    // Daily High/Low tracker
                    this.currentDay = -1;
                    this.currentDayHigh = NaN;
                    this.currentDayLow = NaN;
                    this.pdh = NaN;
                    this.pdl = NaN;
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // 1. Inputs
                    const swingLength = Math.max(2, Math.min(100, Math.round(Number(this._input(0)) || 10)));
                    const breakConfirmation = String(this._input(1) || 'Close').toLowerCase();
                    const useCloseBreak = breakConfirmation === 'close';

                    const showSwingLabels = Boolean(this._input(2));
                    const showBOS = Boolean(this._input(3));
                    const showCHoCH = Boolean(this._input(4));

                    const showBullishOB = Boolean(this._input(5));
                    const showBearishOB = Boolean(this._input(6));
                    const maxOBZones = Math.max(1, Math.min(MAX_OB_SLOTS, Math.round(Number(this._input(7)) || 3)));
                    const obMitigation = String(this._input(8) || 'Wick').toLowerCase();
                    const obCloseMitigation = obMitigation === 'close';
                    const hideMitigatedOB = Boolean(this._input(9));

                    const showBullishFVG = Boolean(this._input(10));
                    const showBearishFVG = Boolean(this._input(11));
                    const maxFVGZones = Math.max(1, Math.min(MAX_FVG_SLOTS, Math.round(Number(this._input(12)) || 3)));
                    const minFVGThreshold = Math.max(0, Number(this._input(13)) || 0.1);
                    const joinConsecutiveFVG = Boolean(this._input(14));
                    const hideMitigatedFVG = Boolean(this._input(15));

                    const showLiquidity = Boolean(this._input(16));
                    const liquidityRangePercent = (Math.max(0.01, Number(this._input(17)) || 0.3)) / 100.0;
                    const showSweeps = Boolean(this._input(18));

                    const showPDHL = Boolean(this._input(19));

                    // 2. Bar Data
                    const time = PineJS.Std.time(this._context);
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);
                    const volume = PineJS.Std.volume(this._context) || 0;

                    const totalPlots = 14 + (MAX_OB_SLOTS * 4) + (MAX_FVG_SLOTS * 4);
                    if (![time, open, high, low, close].every(Number.isFinite)) {
                        return new Array(totalPlots).fill(NaN);
                    }

                    // Handle Replay / Realtime updates
                    const isNewBar = !Number.isFinite(this.lastTime) || time !== this.lastTime;
                    if (Number.isFinite(this.lastTime) && time < this.lastTime) {
                        const rewindIdx = this.candles.findIndex(c => c.time >= time);
                        if (rewindIdx >= 0) this.candles = this.candles.slice(0, rewindIdx);
                        this.lastTime = NaN;
                        this.bullOBSlots.reset();
                        this.bearOBSlots.reset();
                        this.bullFVGSlots.reset();
                        this.bearFVGSlots.reset();
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

                    // 3. PDH / PDL tracking
                    if (showPDHL) {
                        const date = new Date(time);
                        const day = date.getUTCDate();
                        if (this.currentDay !== day) {
                            if (this.currentDay !== -1 && Number.isFinite(this.currentDayHigh) && Number.isFinite(this.currentDayLow)) {
                                this.pdh = this.currentDayHigh;
                                this.pdl = this.currentDayLow;
                            }
                            this.currentDay = day;
                            this.currentDayHigh = high;
                            this.currentDayLow = low;
                        } else {
                            this.currentDayHigh = Math.max(this.currentDayHigh || high, high);
                            this.currentDayLow = Math.min(this.currentDayLow || low, low);
                        }
                    }

                    // 4. Swing Highs / Lows (Pivots & HH/LH/HL/LL)
                    let signalHH = NaN, signalLH = NaN, signalHL = NaN, signalLL = NaN;

                    if (currentIndex >= swingLength * 2) {
                        const pivotIdx = currentIndex - swingLength;
                        const pivotCandle = this.candles[pivotIdx];

                        let isHigh = true;
                        for (let k = pivotIdx - swingLength; k <= pivotIdx + swingLength; k++) {
                            if (k !== pivotIdx && this.candles[k].high >= pivotCandle.high) {
                                isHigh = false;
                                break;
                            }
                        }

                        let isLow = true;
                        for (let k = pivotIdx - swingLength; k <= pivotIdx + swingLength; k++) {
                            if (k !== pivotIdx && this.candles[k].low <= pivotCandle.low) {
                                isLow = false;
                                break;
                            }
                        }

                        if (isHigh) {
                            const prevHigh = this.swings.filter(s => s.type === 1).pop();
                            const label = prevHigh ? (pivotCandle.high >= prevHigh.price ? 'HH' : 'LH') : 'HH';
                            const swingObj = { type: 1, price: pivotCandle.high, index: pivotIdx, time: pivotCandle.time, label };

                            const lastSwing = this.swings[this.swings.length - 1];
                            if (lastSwing && lastSwing.type === 1) {
                                if (pivotCandle.high > lastSwing.price) {
                                    this.swings[this.swings.length - 1] = swingObj;
                                }
                            } else {
                                this.swings.push(swingObj);
                            }
                        } else if (isLow) {
                            const prevLow = this.swings.filter(s => s.type === -1).pop();
                            const label = prevLow ? (pivotCandle.low <= prevLow.price ? 'LL' : 'HL') : 'LL';
                            const swingObj = { type: -1, price: pivotCandle.low, index: pivotIdx, time: pivotCandle.time, label };

                            const lastSwing = this.swings[this.swings.length - 1];
                            if (lastSwing && lastSwing.type === -1) {
                                if (pivotCandle.low < lastSwing.price) {
                                    this.swings[this.swings.length - 1] = swingObj;
                                }
                            } else {
                                this.swings.push(swingObj);
                            }
                        }
                    }

                    // Check if current candle is a registered swing point
                    if (showSwingLabels && this.swings.length > 0) {
                        const s = this.swings[this.swings.length - 1];
                        if (s.index === currentIndex) {
                            if (s.type === 1) {
                                if (s.label === 'HH') signalHH = s.price;
                                else signalLH = s.price;
                            } else {
                                if (s.label === 'LL') signalLL = s.price;
                                else signalHL = s.price;
                            }
                        }
                    }

                    // 5. Market Structure: BOS & CHoCH Detection
                    let signalBOSBull = NaN;
                    let signalBOSBear = NaN;
                    let signalCHoCHBull = NaN;
                    let signalCHoCHBear = NaN;

                    const breakPriceBull = useCloseBreak ? close : high;
                    const breakPriceBear = useCloseBreak ? close : low;

                    const swingHighs = this.swings.filter(s => s.type === 1);
                    const swingLows = this.swings.filter(s => s.type === -1);
                    const lastSwingHigh = swingHighs[swingHighs.length - 1];
                    const lastSwingLow = swingLows[swingLows.length - 1];

                    // Bullish Breakout
                    if (lastSwingHigh && !lastSwingHigh.crossed && breakPriceBull > lastSwingHigh.price && currentIndex > lastSwingHigh.index) {
                        lastSwingHigh.crossed = true;
                        const isCHoCH = this.marketTrend === -1;
                        this.marketTrend = 1;

                        if (isCHoCH && showCHoCH) {
                            signalCHoCHBull = low;
                        } else if (!isCHoCH && showBOS) {
                            signalBOSBull = low;
                        }

                        // Form Bullish Order Block (Demand zone)
                        if (showBullishOB) {
                            let lowestLow = Infinity;
                            let obCandleIdx = Math.max(0, currentIndex - 1);
                            const startIdx = Math.max(0, lastSwingHigh.index);

                            for (let k = startIdx; k <= currentIndex - 1; k++) {
                                if (this.candles[k].low <= lowestLow) {
                                    lowestLow = this.candles[k].low;
                                    obCandleIdx = k;
                                }
                            }

                            const obCandle = this.candles[obCandleIdx];
                            this.bullOBs.push({
                                id: `ob_bull_${currentIndex}_${obCandleIdx}`,
                                type: 'bull',
                                top: obCandle.high,
                                bottom: obCandle.low,
                                startIndex: currentIndex,
                                mitigated: false,
                                mitigatedIndex: null,
                            });
                        }
                    }

                    // Bearish Breakdown
                    if (lastSwingLow && !lastSwingLow.crossed && breakPriceBear < lastSwingLow.price && currentIndex > lastSwingLow.index) {
                        lastSwingLow.crossed = true;
                        const isCHoCH = this.marketTrend === 1;
                        this.marketTrend = -1;

                        if (isCHoCH && showCHoCH) {
                            signalCHoCHBear = high;
                        } else if (!isCHoCH && showBOS) {
                            signalBOSBear = high;
                        }

                        // Form Bearish Order Block (Supply zone)
                        if (showBearishOB) {
                            let highestHigh = -Infinity;
                            let obCandleIdx = Math.max(0, currentIndex - 1);
                            const startIdx = Math.max(0, lastSwingLow.index);

                            for (let k = startIdx; k <= currentIndex - 1; k++) {
                                if (this.candles[k].high >= highestHigh) {
                                    highestHigh = this.candles[k].high;
                                    obCandleIdx = k;
                                }
                            }

                            const obCandle = this.candles[obCandleIdx];
                            this.bearOBs.push({
                                id: `ob_bear_${currentIndex}_${obCandleIdx}`,
                                type: 'bear',
                                top: obCandle.high,
                                bottom: obCandle.low,
                                startIndex: currentIndex,
                                mitigated: false,
                                mitigatedIndex: null,
                            });
                        }
                    }

                    // 6. Fair Value Gaps (FVG)
                    if (currentIndex >= 2) {
                        const c0 = this.candles[currentIndex - 2];
                        const c1 = this.candles[currentIndex - 1];
                        const c2 = this.candles[currentIndex];

                        // Bullish FVG
                        if (c0.high < c2.low && c1.close > c1.open && showBullishFVG) {
                            const gapSize = c2.low - c0.high;
                            const gapPercent = (gapSize / c0.high) * 100.0;

                            if (gapPercent >= minFVGThreshold) {
                                let top = c2.low;
                                let bottom = c0.high;

                                if (joinConsecutiveFVG && this.bullFVGs.length > 0) {
                                    const lastFVG = this.bullFVGs[this.bullFVGs.length - 1];
                                    if (!lastFVG.mitigated && lastFVG.startIndex === currentIndex - 1) {
                                        lastFVG.top = Math.max(lastFVG.top, top);
                                        lastFVG.bottom = Math.min(lastFVG.bottom, bottom);
                                        lastFVG.startIndex = currentIndex;
                                        top = NaN;
                                    }
                                }

                                if (Number.isFinite(top)) {
                                    this.bullFVGs.push({
                                        id: `fvg_bull_${currentIndex}`,
                                        type: 'bull',
                                        top: top,
                                        bottom: bottom,
                                        startIndex: currentIndex,
                                        mitigated: false,
                                        mitigatedIndex: null,
                                    });
                                }
                            }
                        }

                        // Bearish FVG
                        if (c0.low > c2.high && c1.close < c1.open && showBearishFVG) {
                            const gapSize = c0.low - c2.high;
                            const gapPercent = (gapSize / c0.low) * 100.0;

                            if (gapPercent >= minFVGThreshold) {
                                let top = c0.low;
                                let bottom = c2.high;

                                if (joinConsecutiveFVG && this.bearFVGs.length > 0) {
                                    const lastFVG = this.bearFVGs[this.bearFVGs.length - 1];
                                    if (!lastFVG.mitigated && lastFVG.startIndex === currentIndex - 1) {
                                        lastFVG.top = Math.max(lastFVG.top, top);
                                        lastFVG.bottom = Math.min(lastFVG.bottom, bottom);
                                        lastFVG.startIndex = currentIndex;
                                        top = NaN;
                                    }
                                }

                                if (Number.isFinite(top)) {
                                    this.bearFVGs.push({
                                        id: `fvg_bear_${currentIndex}`,
                                        type: 'bear',
                                        top: top,
                                        bottom: bottom,
                                        startIndex: currentIndex,
                                        mitigated: false,
                                        mitigatedIndex: null,
                                    });
                                }
                            }
                        }
                    }

                    // 7. Update Mitigation States
                    for (let i = 0; i < this.bullOBs.length; i++) {
                        const ob = this.bullOBs[i];
                        if (!ob.mitigated && currentIndex > ob.startIndex) {
                            const testPrice = obCloseMitigation ? Math.min(open, close) : low;
                            if (testPrice <= ob.bottom) {
                                ob.mitigated = true;
                                ob.mitigatedIndex = currentIndex;
                            }
                        }
                    }

                    for (let i = 0; i < this.bearOBs.length; i++) {
                        const ob = this.bearOBs[i];
                        if (!ob.mitigated && currentIndex > ob.startIndex) {
                            const testPrice = obCloseMitigation ? Math.max(open, close) : high;
                            if (testPrice >= ob.top) {
                                ob.mitigated = true;
                                ob.mitigatedIndex = currentIndex;
                            }
                        }
                    }

                    for (let i = 0; i < this.bullFVGs.length; i++) {
                        const fvg = this.bullFVGs[i];
                        if (!fvg.mitigated && currentIndex > fvg.startIndex && low <= fvg.top) {
                            fvg.mitigated = true;
                            fvg.mitigatedIndex = currentIndex;
                        }
                    }

                    for (let i = 0; i < this.bearFVGs.length; i++) {
                        const fvg = this.bearFVGs[i];
                        if (!fvg.mitigated && currentIndex > fvg.startIndex && high >= fvg.bottom) {
                            fvg.mitigated = true;
                            fvg.mitigatedIndex = currentIndex;
                        }
                    }

                    // 8. Liquidity (EQH / EQL & Sweeps)
                    let signalEQH = NaN, signalEQL = NaN, signalSweepBull = NaN, signalSweepBear = NaN;
                    if (showLiquidity && this.swings.length >= 2) {
                        const highs = this.swings.filter(s => s.type === 1).slice(-4);
                        const lows = this.swings.filter(s => s.type === -1).slice(-4);

                        if (highs.length >= 2) {
                            const h1 = highs[highs.length - 1];
                            const h2 = highs[highs.length - 2];
                            if (h1.index === currentIndex && Math.abs(h1.price - h2.price) <= h1.price * liquidityRangePercent) {
                                signalEQH = high;
                            }
                        }

                        if (lows.length >= 2) {
                            const l1 = lows[lows.length - 1];
                            const l2 = lows[lows.length - 2];
                            if (l1.index === currentIndex && Math.abs(l1.price - l2.price) <= l1.price * liquidityRangePercent) {
                                signalEQL = low;
                            }
                        }

                        if (showSweeps && lastSwingHigh && high > lastSwingHigh.price && close < lastSwingHigh.price && currentIndex > lastSwingHigh.index) {
                            signalSweepBear = high;
                        }
                        if (showSweeps && lastSwingLow && low < lastSwingLow.price && close > lastSwingLow.price && currentIndex > lastSwingLow.index) {
                            signalSweepBull = low;
                        }
                    }

                    // 9. Slot Reconcile: Bullish & Bearish OBs
                    const activeBullOBs = this.bullOBs
                        .filter(ob => ob.startIndex <= currentIndex && (!hideMitigatedOB || !ob.mitigated || ob.mitigatedIndex >= currentIndex))
                        .slice(-maxOBZones);

                    const activeBearOBs = this.bearOBs
                        .filter(ob => ob.startIndex <= currentIndex && (!hideMitigatedOB || !ob.mitigated || ob.mitigatedIndex >= currentIndex))
                        .slice(-maxOBZones);

                    const bullOBSlotIds = this.bullOBSlots.reconcile(activeBullOBs);
                    const bearOBSlotIds = this.bearOBSlots.reconcile(activeBearOBs);

                    const bullOBMap = new Map(activeBullOBs.map(ob => [ob.id, ob]));
                    const bearOBMap = new Map(activeBearOBs.map(ob => [ob.id, ob]));

                    // 10. Slot Reconcile: Bullish & Bearish FVGs
                    const activeBullFVGs = this.bullFVGs
                        .filter(fvg => fvg.startIndex <= currentIndex && (!hideMitigatedFVG || !fvg.mitigated || fvg.mitigatedIndex >= currentIndex))
                        .slice(-maxFVGZones);

                    const activeBearFVGs = this.bearFVGs
                        .filter(fvg => fvg.startIndex <= currentIndex && (!hideMitigatedFVG || !fvg.mitigated || fvg.mitigatedIndex >= currentIndex))
                        .slice(-maxFVGZones);

                    const bullFVGSlotIds = this.bullFVGSlots.reconcile(activeBullFVGs);
                    const bearFVGSlotIds = this.bearFVGSlots.reconcile(activeBearFVGs);

                    const bullFVGMap = new Map(activeBullFVGs.map(fvg => [fvg.id, fvg]));
                    const bearFVGMap = new Map(activeBearFVGs.map(fvg => [fvg.id, fvg]));

                    // 11. Assemble Output Array strictly matching buildMetainfo().plots
                    const result = [];

                    // Shapes: Swings
                    result.push(signalHH);
                    result.push(signalLH);
                    result.push(signalHL);
                    result.push(signalLL);

                    // Shapes: BOS / CHoCH
                    result.push(signalBOSBull);
                    result.push(signalBOSBear);
                    result.push(signalCHoCHBull);
                    result.push(signalCHoCHBear);

                    // Shapes: Liquidity & Sweeps
                    result.push(signalEQH);
                    result.push(signalEQL);
                    result.push(signalSweepBull);
                    result.push(signalSweepBear);

                    // Reference Lines: PDH / PDL
                    result.push(showPDHL && Number.isFinite(this.pdh) ? this.pdh : NaN);
                    result.push(showPDHL && Number.isFinite(this.pdl) ? this.pdl : NaN);

                    // OB Bullish Slots
                    for (let k = 0; k < MAX_OB_SLOTS; k++) {
                        const ob = bullOBSlotIds[k] ? bullOBMap.get(bullOBSlotIds[k]) : null;
                        result.push(ob ? ob.top : NaN);
                        result.push(ob ? ob.bottom : NaN);
                    }

                    // OB Bearish Slots
                    for (let k = 0; k < MAX_OB_SLOTS; k++) {
                        const ob = bearOBSlotIds[k] ? bearOBMap.get(bearOBSlotIds[k]) : null;
                        result.push(ob ? ob.top : NaN);
                        result.push(ob ? ob.bottom : NaN);
                    }

                    // FVG Bullish Slots
                    for (let k = 0; k < MAX_FVG_SLOTS; k++) {
                        const fvg = bullFVGSlotIds[k] ? bullFVGMap.get(bullFVGSlotIds[k]) : null;
                        result.push(fvg ? fvg.top : NaN);
                        result.push(fvg ? fvg.bottom : NaN);
                    }

                    // FVG Bearish Slots
                    for (let k = 0; k < MAX_FVG_SLOTS; k++) {
                        const fvg = bearFVGSlotIds[k] ? bearFVGMap.get(bearFVGSlotIds[k]) : null;
                        result.push(fvg ? fvg.top : NaN);
                        result.push(fvg ? fvg.bottom : NaN);
                    }

                    // History Cleanup
                    if (this.candles.length > 2000) {
                        this.candles = this.candles.slice(-1000);
                        if (this.swings.length > 100) this.swings = this.swings.slice(-50);
                        if (this.bullOBs.length > 50) this.bullOBs = this.bullOBs.filter(o => !o.mitigated).slice(-20);
                        if (this.bearOBs.length > 50) this.bearOBs = this.bearOBs.filter(o => !o.mitigated).slice(-20);
                        if (this.bullFVGs.length > 50) this.bullFVGs = this.bullFVGs.filter(f => !f.mitigated).slice(-20);
                        if (this.bearFVGs.length > 50) this.bearFVGs = this.bearFVGs.filter(f => !f.mitigated).slice(-20);
                    }

                    return result;
                };
            }
        };
    }

    // Export globally
    root.createSMC = createSMC;
})(typeof window !== 'undefined' ? window : globalThis);

