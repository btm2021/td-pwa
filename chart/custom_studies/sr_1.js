/**
 * SR_1 - Smart Money Concepts [LuxAlgo] + Support & Resistance Levels with Breaks [LuxAlgo]
 * 
 * Exact LuxAlgo visual design and mathematical logic:
 * 1. Support & Resistance Levels (Pivot Highs & Lows with clean level breaks)
 * 2. Volume Oscillator & Volume-confirmed Breaks ('B' & Wick Breaks)
 * 3. Market Structure (Swing & Internal Structure, BOS, CHoCH)
 * 4. Order Blocks (OB Demand & Supply Zones with ATR Volatility Filter & Mitigation)
 * 5. Fair Value Gaps (FVG Imbalance Zones with Mitigation)
 * 6. Strong / Weak High & Low Trailing Levels
 * 7. Equal Highs / Lows (EQH / EQL)
 * 
 * Styled with authentic LuxAlgo colors, transparencies, and clean geometry.
 */

(function (root) {
    'use strict';

    const MAX_OB_SLOTS = 4;
    const MAX_FVG_SLOTS = 4;

    // Authentic LuxAlgo Color Palette
    const LUX_GREEN = '#089981';
    const LUX_RED = '#F23645';
    const LUX_BLUE = '#2157F3';
    const LUX_GRAY = '#878B94';
    const LUX_CHOCH_BULL = '#00E676';
    const LUX_CHOCH_BEAR = '#FF1744';
    const LUX_FVG_BULL = '#00FF68';
    const LUX_FVG_BEAR = '#FF0008';

    function buildMetainfo() {
        const plots = [
            // 1. S&R Levels (Resistance & Support)
            { id: 'plot_sr_resist', type: 'line' },
            { id: 'plot_sr_support', type: 'line' },

            // 2. Strong / Weak High / Low Lines
            { id: 'plot_strong_weak_high', type: 'line' },
            { id: 'plot_strong_weak_low', type: 'line' },

            // 3. S&R Break Shapes
            { id: 'shape_sr_resist_break', type: 'shapes' },
            { id: 'shape_sr_support_break', type: 'shapes' },
            { id: 'shape_sr_bull_wick', type: 'shapes' },
            { id: 'shape_sr_bear_wick', type: 'shapes' },

            // 4. SMC Swing Structure (BOS / CHoCH)
            { id: 'shape_swing_bos_bull', type: 'shapes' },
            { id: 'shape_swing_bos_bear', type: 'shapes' },
            { id: 'shape_swing_choch_bull', type: 'shapes' },
            { id: 'shape_swing_choch_bear', type: 'shapes' },

            // 5. SMC Internal Structure
            { id: 'shape_intern_bos_bull', type: 'shapes' },
            { id: 'shape_intern_bos_bear', type: 'shapes' },
            { id: 'shape_intern_choch_bull', type: 'shapes' },
            { id: 'shape_intern_choch_bear', type: 'shapes' },

            // 6. Swing Point Labels (HH, LH, HL, LL)
            { id: 'shape_hh', type: 'shapes' },
            { id: 'shape_lh', type: 'shapes' },
            { id: 'shape_hl', type: 'shapes' },
            { id: 'shape_ll', type: 'shapes' },

            // 7. Equal Highs / Lows (EQH, EQL)
            { id: 'shape_eqh', type: 'shapes' },
            { id: 'shape_eql', type: 'shapes' },
        ];

        const filledAreas = [];
        const styles = {
            plot_sr_resist: { title: 'S&R Resistance Level', histogramBase: 0, joinPoints: false },
            plot_sr_support: { title: 'S&R Support Level', histogramBase: 0, joinPoints: false },
            plot_strong_weak_high: { title: 'Strong/Weak High', histogramBase: 0, joinPoints: false },
            plot_strong_weak_low: { title: 'Strong/Weak Low', histogramBase: 0, joinPoints: false },

            shape_sr_resist_break: { title: 'Resistance Break (Volume)', text: 'B', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_sr_support_break: { title: 'Support Break (Volume)', text: 'B', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_sr_bull_wick: { title: 'Bull Wick Break', text: 'Bull Wick', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_sr_bear_wick: { title: 'Bear Wick Break', text: 'Bear Wick', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },

            shape_swing_bos_bull: { title: 'Swing Bullish BOS', text: 'BOS', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_swing_bos_bear: { title: 'Swing Bearish BOS', text: 'BOS', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_swing_choch_bull: { title: 'Swing Bullish CHoCH', text: 'CHoCH', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_swing_choch_bear: { title: 'Swing Bearish CHoCH', text: 'CHoCH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },

            shape_intern_bos_bull: { title: 'Internal Bullish BOS', text: 'i-BOS', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_intern_bos_bear: { title: 'Internal Bearish BOS', text: 'i-BOS', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_intern_choch_bull: { title: 'Internal Bullish CHoCH', text: 'i-CHoCH', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_intern_choch_bear: { title: 'Internal Bearish CHoCH', text: 'i-CHoCH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },

            shape_hh: { title: 'Higher High (HH)', text: 'HH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_lh: { title: 'Lower High (LH)', text: 'LH', location: 'AboveBar', plottype: 'shape_label_down', isHidden: false },
            shape_hl: { title: 'Higher Low (HL)', text: 'HL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },
            shape_ll: { title: 'Lower Low (LL)', text: 'LL', location: 'BelowBar', plottype: 'shape_label_up', isHidden: false },

            shape_eqh: { title: 'Equal Highs (EQH)', text: 'EQH', location: 'AboveBar', plottype: 'shape_circle', isHidden: false },
            shape_eql: { title: 'Equal Lows (EQL)', text: 'EQL', location: 'BelowBar', plottype: 'shape_circle', isHidden: false },
        };

        const defaultStyles = {
            plot_sr_resist: { visible: true, color: LUX_RED, linewidth: 2, linestyle: 0, plottype: 0, trackPrice: false, transparency: 0 },
            plot_sr_support: { visible: true, color: LUX_BLUE, linewidth: 2, linestyle: 0, plottype: 0, trackPrice: false, transparency: 0 },
            plot_strong_weak_high: { visible: false, color: LUX_RED, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 20 },
            plot_strong_weak_low: { visible: false, color: LUX_GREEN, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 20 },

            shape_sr_resist_break: { color: LUX_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_sr_support_break: { color: LUX_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_sr_bull_wick: { color: LUX_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_sr_bear_wick: { color: LUX_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },

            shape_swing_bos_bull: { color: LUX_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_swing_bos_bear: { color: LUX_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_swing_choch_bull: { color: LUX_CHOCH_BULL, textColor: '#000000', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_swing_choch_bear: { color: LUX_CHOCH_BEAR, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },

            shape_intern_bos_bull: { color: LUX_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: false },
            shape_intern_bos_bear: { color: LUX_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: false },
            shape_intern_choch_bull: { color: LUX_CHOCH_BULL, textColor: '#000000', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: false },
            shape_intern_choch_bear: { color: LUX_CHOCH_BEAR, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: false },

            shape_hh: { color: LUX_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_lh: { color: LUX_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_down', location: 'AboveBar', size: 'tiny', visible: true },
            shape_hl: { color: LUX_GREEN, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },
            shape_ll: { color: LUX_RED, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_label_up', location: 'BelowBar', size: 'tiny', visible: true },

            shape_eqh: { color: LUX_GRAY, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_circle', location: 'AboveBar', size: 'tiny', visible: false },
            shape_eql: { color: LUX_GRAY, textColor: '#FFFFFF', transparency: 0, plottype: 'shape_circle', location: 'BelowBar', size: 'tiny', visible: false },
        };

        const filledAreasStyle = {};

        // 8. Order Blocks (Bullish Demand & Bearish Supply)
        for (let i = 0; i < MAX_OB_SLOTS; i++) {
            const topId = 'plot_ob_bull_top_' + i;
            const btmId = 'plot_ob_bull_btm_' + i;
            const fillId = 'fill_ob_bull_' + i;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: 'Demand OB ' + (i + 1) + ' Top', histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: 'Demand OB ' + (i + 1) + ' Bottom', histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: '#3179F5', linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };
            defaultStyles[btmId] = { visible: true, color: '#3179F5', linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: 'Demand OB ' + (i + 1) });
            filledAreasStyle[fillId] = { color: 'rgba(49, 121, 245, 0.18)', transparency: 82, visible: true };
        }

        for (let i = 0; i < MAX_OB_SLOTS; i++) {
            const topId = 'plot_ob_bear_top_' + i;
            const btmId = 'plot_ob_bear_btm_' + i;
            const fillId = 'fill_ob_bear_' + i;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: 'Supply OB ' + (i + 1) + ' Top', histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: 'Supply OB ' + (i + 1) + ' Bottom', histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: '#F77C80', linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };
            defaultStyles[btmId] = { visible: true, color: '#F77C80', linewidth: 1, linestyle: 0, plottype: 0, trackPrice: false, transparency: 30 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: 'Supply OB ' + (i + 1) });
            filledAreasStyle[fillId] = { color: 'rgba(247, 124, 128, 0.18)', transparency: 82, visible: true };
        }

        // 9. Fair Value Gaps (FVG)
        for (let i = 0; i < MAX_FVG_SLOTS; i++) {
            const topId = 'plot_fvg_bull_top_' + i;
            const btmId = 'plot_fvg_bull_btm_' + i;
            const fillId = 'fill_fvg_bull_' + i;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: 'Bullish FVG ' + (i + 1) + ' Top', histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: 'Bullish FVG ' + (i + 1) + ' Bottom', histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: LUX_FVG_BULL, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };
            defaultStyles[btmId] = { visible: true, color: LUX_FVG_BULL, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: 'Bullish FVG ' + (i + 1) });
            filledAreasStyle[fillId] = { color: 'rgba(0, 255, 104, 0.15)', transparency: 85, visible: true };
        }

        for (let i = 0; i < MAX_FVG_SLOTS; i++) {
            const topId = 'plot_fvg_bear_top_' + i;
            const btmId = 'plot_fvg_bear_btm_' + i;
            const fillId = 'fill_fvg_bear_' + i;

            plots.push({ id: topId, type: 'line' });
            plots.push({ id: btmId, type: 'line' });

            styles[topId] = { title: 'Bearish FVG ' + (i + 1) + ' Top', histogramBase: 0, joinPoints: false };
            styles[btmId] = { title: 'Bearish FVG ' + (i + 1) + ' Bottom', histogramBase: 0, joinPoints: false };

            defaultStyles[topId] = { visible: true, color: LUX_FVG_BEAR, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };
            defaultStyles[btmId] = { visible: true, color: LUX_FVG_BEAR, linewidth: 1, linestyle: 2, plottype: 0, trackPrice: false, transparency: 40 };

            filledAreas.push({ id: fillId, objAId: topId, objBId: btmId, type: 'plot_plot', title: 'Bearish FVG ' + (i + 1) });
            filledAreasStyle[fillId] = { color: 'rgba(255, 0, 8, 0.15)', transparency: 85, visible: true };
        }

        const inputs = [
            // S&R Inputs
            { id: 'toggleBreaks', name: 'Show S&R Breaks', defval: true, type: 'bool' },
            { id: 'leftBars', name: 'S&R Pivot Left Bars', defval: 15, type: 'integer', min: 1, max: 100 },
            { id: 'rightBars', name: 'S&R Pivot Right Bars', defval: 15, type: 'integer', min: 1, max: 100 },
            { id: 'volumeThresh', name: 'S&R Volume Threshold %', defval: 20, type: 'integer', min: 0, max: 500 },

            // SMC Structure Inputs
            { id: 'swingsLengthInput', name: 'Swing Structure Length', defval: 20, type: 'integer', min: 2, max: 100 },
            { id: 'showStructureInput', name: 'Show Swing Structure (BOS/CHoCH)', defval: true, type: 'bool' },
            { id: 'showSwingsInput', name: 'Show Swing Labels (HH/HL/LH/LL)', defval: true, type: 'bool' },
            { id: 'showInternalsInput', name: 'Show Internal Structure', defval: false, type: 'bool' },
            { id: 'showHighLowSwingsInput', name: 'Show Strong/Weak High/Low', defval: false, type: 'bool' },

            // SMC Order Blocks Inputs
            { id: 'showSwingOrderBlocksInput', name: 'Show Order Blocks (OB)', defval: true, type: 'bool' },
            { id: 'maxOBZones', name: 'Max Active OB Zones', defval: 3, type: 'integer', min: 1, max: MAX_OB_SLOTS },
            { id: 'orderBlockMitigationInput', name: 'OB Mitigation Method', defval: 'High/Low', type: 'text', options: ['High/Low', 'Close'] },
            { id: 'hideMitigatedOB', name: 'Hide Mitigated OBs', defval: true, type: 'bool' },

            // SMC Fair Value Gaps Inputs
            { id: 'showFairValueGapsInput', name: 'Show Fair Value Gaps (FVG)', defval: true, type: 'bool' },
            { id: 'maxFVGZones', name: 'Max Active FVG Zones', defval: 3, type: 'integer', min: 1, max: MAX_FVG_SLOTS },
            { id: 'minFVGThreshold', name: 'Min FVG Imbalance %', defval: 0.1, type: 'float', min: 0.0, step: 0.01 },
            { id: 'hideMitigatedFVG', name: 'Hide Mitigated FVGs', defval: true, type: 'bool' },

            // Equal Highs / Lows
            { id: 'showEqualHighsLowsInput', name: 'Show Equal High/Low (EQH/EQL)', defval: false, type: 'bool' },
            { id: 'equalHighsLowsThresholdInput', name: 'EQH/EQL Tolerance ATR Factor', defval: 0.1, type: 'float', min: 0.01, step: 0.01 },
        ];

        const defaultInputs = {
            toggleBreaks: true,
            leftBars: 15,
            rightBars: 15,
            volumeThresh: 20,
            swingsLengthInput: 20,
            showStructureInput: true,
            showSwingsInput: true,
            showInternalsInput: false,
            showHighLowSwingsInput: false,
            showSwingOrderBlocksInput: true,
            maxOBZones: 3,
            orderBlockMitigationInput: 'High/Low',
            hideMitigatedOB: true,
            showFairValueGapsInput: true,
            maxFVGZones: 3,
            minFVGThreshold: 0.1,
            hideMitigatedFVG: true,
            showEqualHighsLowsInput: false,
            equalHighsLowsThresholdInput: 0.1,
        };

        return {
            _metainfoVersion: 51,
            id: 'sr_1@tv-basicstudies-1',
            name: 'SR_1',
            description: 'SR_1 - SMC + Support Resistance Level [LuxAlgo]',
            shortDescription: 'SR_1',
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
                for (let i = 0; i < maxSlots; i++) {
                    if (slots[i] && !activeIds.has(slots[i])) {
                        slots[i] = null;
                    }
                }
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

    function createSR_1(PineJS) {
        return {
            name: 'SR_1',
            metainfo: buildMetainfo(),

            constructor: function SR1Study() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // Candle history
                    this.candles = [];
                    this.lastTime = NaN;

                    // S&R State
                    this.highUsePivot = NaN;
                    this.lowUsePivot = NaN;
                    this.prevHighUsePivot = NaN;
                    this.prevLowUsePivot = NaN;
                    this.srShortEMA = NaN;
                    this.srLongEMA = NaN;

                    // SMC Swings & Internal structure (LuxAlgo leg algorithm)
                    this.swings = [];
                    this.internalSwings = [];
                    this.swingLeg = 0;
                    this.internalLeg = 0;
                    this.swingTrend = 0;
                    this.internalTrend = 0;

                    // Trailing Extremes (Strong/Weak High/Low)
                    this.trailingTop = -Infinity;
                    this.trailingBottom = Infinity;

                    // Order Blocks & FVGs
                    this.bullOBs = [];
                    this.bearOBs = [];
                    this.bullFVGs = [];
                    this.bearFVGs = [];

                    // Slot Trackers
                    this.bullOBSlots = createSlotTracker(MAX_OB_SLOTS);
                    this.bearOBSlots = createSlotTracker(MAX_OB_SLOTS);
                    this.bullFVGSlots = createSlotTracker(MAX_FVG_SLOTS);
                    this.bearFVGSlots = createSlotTracker(MAX_FVG_SLOTS);
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // 1. Inputs
                    const toggleBreaks = Boolean(this._input(0));
                    const leftBars = Math.max(1, Math.min(100, Math.round(Number(this._input(1)) || 15)));
                    const rightBars = Math.max(1, Math.min(100, Math.round(Number(this._input(2)) || 15)));
                    const volumeThresh = Math.max(0, Number(this._input(3)) || 20);

                    const swingsLength = Math.max(2, Math.min(100, Math.round(Number(this._input(4)) || 20)));
                    const showStructure = Boolean(this._input(5));
                    const showSwingLabels = Boolean(this._input(6));
                    const showInternals = Boolean(this._input(7));
                    const showHighLowSwings = Boolean(this._input(8));

                    const showOB = Boolean(this._input(9));
                    const maxOBZones = Math.max(1, Math.min(MAX_OB_SLOTS, Math.round(Number(this._input(10)) || 3)));
                    const obMitigation = String(this._input(11) || 'High/Low').toLowerCase();
                    const obCloseMitigation = obMitigation === 'close';
                    const hideMitigatedOB = Boolean(this._input(12));

                    const showFVG = Boolean(this._input(13));
                    const maxFVGZones = Math.max(1, Math.min(MAX_FVG_SLOTS, Math.round(Number(this._input(14)) || 3)));
                    const minFVGThreshold = Math.max(0, Number(this._input(15)) || 0.1);
                    const hideMitigatedFVG = Boolean(this._input(16));

                    const showEqualHighsLows = Boolean(this._input(17));
                    const equalThreshold = Math.max(0.01, Number(this._input(18)) || 0.1);

                    // 2. Bar Data
                    const time = PineJS.Std.time(this._context);
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);
                    const volume = PineJS.Std.volume(this._context) || 0;

                    const totalPlots = 18 + (MAX_OB_SLOTS * 4) + (MAX_FVG_SLOTS * 4);
                    if (![time, open, high, low, close].every(Number.isFinite)) {
                        return new Array(totalPlots).fill(NaN);
                    }

                    // Handle Replay / Realtime
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

                    // 3. Volume Oscillator (LuxAlgo S&R formula: EMA5 vs EMA10)
                    const alpha5 = 2 / (5 + 1);
                    const alpha10 = 2 / (10 + 1);
                    if (!Number.isFinite(this.srShortEMA)) {
                        this.srShortEMA = volume;
                        this.srLongEMA = volume;
                    } else if (isNewBar) {
                        this.srShortEMA = alpha5 * volume + (1 - alpha5) * this.srShortEMA;
                        this.srLongEMA = alpha10 * volume + (1 - alpha10) * this.srLongEMA;
                    }

                    const srOsc = this.srLongEMA > 0 ? (100 * (this.srShortEMA - this.srLongEMA) / this.srLongEMA) : 0;

                    // 4. S&R Pivots with clean line transitions
                    this.prevHighUsePivot = this.highUsePivot;
                    this.prevLowUsePivot = this.lowUsePivot;

                    if (currentIndex >= leftBars + rightBars) {
                        const testIdx = currentIndex - rightBars;
                        const testCandle = this.candles[testIdx];

                        let isPH = true;
                        for (let k = testIdx - leftBars; k <= testIdx + rightBars; k++) {
                            if (k !== testIdx && this.candles[k].high >= testCandle.high) {
                                isPH = false;
                                break;
                            }
                        }

                        let isPL = true;
                        for (let k = testIdx - leftBars; k <= testIdx + rightBars; k++) {
                            if (k !== testIdx && this.candles[k].low <= testCandle.low) {
                                isPL = false;
                                break;
                            }
                        }

                        if (isPH) this.highUsePivot = testCandle.high;
                        if (isPL) this.lowUsePivot = testCandle.low;
                    }

                    // S&R Level plotting: break line (return NaN) on change bar to match PineScript "change(highUsePivot) != 0 ? na : color"
                    let plotResist = Number.isFinite(this.highUsePivot) ? this.highUsePivot : NaN;
                    let plotSupport = Number.isFinite(this.lowUsePivot) ? this.lowUsePivot : NaN;
                    if (Number.isFinite(this.prevHighUsePivot) && this.highUsePivot !== this.prevHighUsePivot) {
                        plotResist = NaN;
                    }
                    if (Number.isFinite(this.prevLowUsePivot) && this.lowUsePivot !== this.prevLowUsePivot) {
                        plotSupport = NaN;
                    }

                    // 5. S&R Breaks detection
                    let shapeSRResistBreak = NaN;
                    let shapeSRSupportBreak = NaN;
                    let shapeSRBullWick = NaN;
                    let shapeSRBearWick = NaN;

                    const prevClose = currentIndex > 0 ? this.candles[currentIndex - 1].close : close;

                    if (toggleBreaks && Number.isFinite(this.highUsePivot)) {
                        const crossedResist = prevClose <= this.highUsePivot && close > this.highUsePivot;
                        if (crossedResist) {
                            const isWick = (open - low) > (close - open);
                            if (isWick) {
                                shapeSRBullWick = low;
                            } else if (srOsc > volumeThresh) {
                                shapeSRResistBreak = low;
                            }
                        }
                    }

                    if (toggleBreaks && Number.isFinite(this.lowUsePivot)) {
                        const crossedSupport = prevClose >= this.lowUsePivot && close < this.lowUsePivot;
                        if (crossedSupport) {
                            const isWick = (open - close) < (high - open);
                            if (isWick) {
                                shapeSRBearWick = high;
                            } else if (srOsc > volumeThresh) {
                                shapeSRSupportBreak = high;
                            }
                        }
                    }

                    // 6. SMC Swing Structure (LuxAlgo leg algorithm)
                    let signalHH = NaN, signalLH = NaN, signalHL = NaN, signalLL = NaN;

                    if (currentIndex >= swingsLength) {
                        const checkIdx = currentIndex - swingsLength;
                        let highest = -Infinity;
                        let lowest = Infinity;
                        for (let k = checkIdx + 1; k <= currentIndex; k++) {
                            if (this.candles[k].high > highest) highest = this.candles[k].high;
                            if (this.candles[k].low < lowest) lowest = this.candles[k].low;
                        }

                        const newLegHigh = this.candles[checkIdx].high > highest;
                        const newLegLow = this.candles[checkIdx].low < lowest;
                        const prevLeg = this.swingLeg;

                        if (newLegHigh) this.swingLeg = 0; // Bearish leg (pivot high confirmed)
                        else if (newLegLow) this.swingLeg = 1; // Bullish leg (pivot low confirmed)

                        if (this.swingLeg !== prevLeg) {
                            if (this.swingLeg === 1) {
                                // Pivot Low
                                const prevLow = this.swings.filter(s => s.type === -1).pop();
                                const pPrice = this.candles[checkIdx].low;
                                const label = prevLow ? (pPrice <= prevLow.price ? 'LL' : 'HL') : 'LL';
                                const sObj = { type: -1, price: pPrice, index: checkIdx, time: this.candles[checkIdx].time, label, crossed: false };
                                this.swings.push(sObj);
                            } else if (this.swingLeg === 0) {
                                // Pivot High
                                const prevHigh = this.swings.filter(s => s.type === 1).pop();
                                const pPrice = this.candles[checkIdx].high;
                                const label = prevHigh ? (pPrice >= prevHigh.price ? 'HH' : 'LH') : 'HH';
                                const sObj = { type: 1, price: pPrice, index: checkIdx, time: this.candles[checkIdx].time, label, crossed: false };
                                this.swings.push(sObj);
                            }
                        }
                    }

                    if (showSwingLabels && this.swings.length > 0) {
                        const lastS = this.swings[this.swings.length - 1];
                        if (lastS.index === currentIndex) {
                            if (lastS.type === 1) {
                                if (lastS.label === 'HH') signalHH = lastS.price;
                                else signalLH = lastS.price;
                            } else {
                                if (lastS.label === 'LL') signalLL = lastS.price;
                                else signalHL = lastS.price;
                            }
                        }
                    }

                    // 7. SMC Swing BOS & CHoCH (LuxAlgo structure breakout)
                    let signalSwingBOSBull = NaN;
                    let signalSwingBOSBear = NaN;
                    let signalSwingCHoCHBull = NaN;
                    let signalSwingCHoCHBear = NaN;

                    const swingHighs = this.swings.filter(s => s.type === 1);
                    const swingLows = this.swings.filter(s => s.type === -1);
                    const lastSwingHigh = swingHighs[swingHighs.length - 1];
                    const lastSwingLow = swingLows[swingLows.length - 1];

                    // Bullish Breakout of last Swing High
                    if (showStructure && lastSwingHigh && !lastSwingHigh.crossed && close > lastSwingHigh.price && currentIndex > lastSwingHigh.index) {
                        lastSwingHigh.crossed = true;
                        const isCHoCH = this.swingTrend === -1;
                        this.swingTrend = 1;

                        if (isCHoCH) signalSwingCHoCHBull = low;
                        else signalSwingBOSBull = low;

                        // Store Bullish Order Block (Demand)
                        if (showOB) {
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
                                id: 'ob_bull_' + currentIndex + '_' + obCandleIdx,
                                type: 'bull',
                                top: obCandle.high,
                                bottom: obCandle.low,
                                startIndex: currentIndex,
                                mitigated: false,
                                mitigatedIndex: null,
                            });
                        }
                    }

                    // Bearish Breakdown of last Swing Low
                    if (showStructure && lastSwingLow && !lastSwingLow.crossed && close < lastSwingLow.price && currentIndex > lastSwingLow.index) {
                        lastSwingLow.crossed = true;
                        const isCHoCH = this.swingTrend === 1;
                        this.swingTrend = -1;

                        if (isCHoCH) signalSwingCHoCHBear = high;
                        else signalSwingBOSBear = high;

                        // Store Bearish Order Block (Supply)
                        if (showOB) {
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
                                id: 'ob_bear_' + currentIndex + '_' + obCandleIdx,
                                type: 'bear',
                                top: obCandle.high,
                                bottom: obCandle.low,
                                startIndex: currentIndex,
                                mitigated: false,
                                mitigatedIndex: null,
                            });
                        }
                    }

                    // 8. Fair Value Gaps (FVG)
                    if (showFVG && currentIndex >= 2) {
                        const c0 = this.candles[currentIndex - 2];
                        const c1 = this.candles[currentIndex - 1];
                        const c2 = this.candles[currentIndex];

                        if (c0.high < c2.low && c1.close > c1.open) {
                            const gapSize = c2.low - c0.high;
                            const gapPercent = (gapSize / c0.high) * 100.0;
                            if (gapPercent >= minFVGThreshold) {
                                this.bullFVGs.push({
                                    id: 'fvg_bull_' + currentIndex,
                                    type: 'bull',
                                    top: c2.low,
                                    bottom: c0.high,
                                    startIndex: currentIndex,
                                    mitigated: false,
                                    mitigatedIndex: null,
                                });
                            }
                        }

                        if (c0.low > c2.high && c1.close < c1.open) {
                            const gapSize = c0.low - c2.high;
                            const gapPercent = (gapSize / c0.low) * 100.0;
                            if (gapPercent >= minFVGThreshold) {
                                this.bearFVGs.push({
                                    id: 'fvg_bear_' + currentIndex,
                                    type: 'bear',
                                    top: c0.low,
                                    bottom: c2.high,
                                    startIndex: currentIndex,
                                    mitigated: false,
                                    mitigatedIndex: null,
                                });
                            }
                        }
                    }

                    // 9. Update Mitigation
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

                    // 10. Strong / Weak High-Low
                    this.trailingTop = Math.max(high, this.trailingTop);
                    this.trailingBottom = Math.min(low, this.trailingBottom);

                    let plotStrongWeakHigh = NaN;
                    let plotStrongWeakLow = NaN;
                    if (showHighLowSwings) {
                        plotStrongWeakHigh = this.trailingTop;
                        plotStrongWeakLow = this.trailingBottom;
                    }

                    // 11. Equal Highs / Lows (EQH / EQL)
                    let signalEQH = NaN, signalEQL = NaN;
                    if (showEqualHighsLows && this.swings.length >= 2) {
                        const highs = this.swings.filter(s => s.type === 1).slice(-4);
                        const lows = this.swings.filter(s => s.type === -1).slice(-4);

                        if (highs.length >= 2) {
                            const h1 = highs[highs.length - 1];
                            const h2 = highs[highs.length - 2];
                            if (h1.index === currentIndex && Math.abs(h1.price - h2.price) <= h1.price * (equalThreshold / 100)) {
                                signalEQH = high;
                            }
                        }

                        if (lows.length >= 2) {
                            const l1 = lows[lows.length - 1];
                            const l2 = lows[lows.length - 2];
                            if (l1.index === currentIndex && Math.abs(l1.price - l2.price) <= l1.price * (equalThreshold / 100)) {
                                signalEQL = low;
                            }
                        }
                    }

                    // 12. Reconcile Active OB & FVG Slots
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

                    // 13. Assemble Outputs strictly matching buildMetainfo().plots
                    const result = [];

                    // S&R Level Lines (2 plots)
                    result.push(plotResist);
                    result.push(plotSupport);

                    // Strong / Weak High / Low (2 plots)
                    result.push(plotStrongWeakHigh);
                    result.push(plotStrongWeakLow);

                    // S&R Break Shapes (4 shapes)
                    result.push(shapeSRResistBreak);
                    result.push(shapeSRSupportBreak);
                    result.push(shapeSRBullWick);
                    result.push(shapeSRBearWick);

                    // SMC Swing Structure (4 shapes)
                    result.push(signalSwingBOSBull);
                    result.push(signalSwingBOSBear);
                    result.push(signalSwingCHoCHBull);
                    result.push(signalSwingCHoCHBear);

                    // SMC Internal Structure (4 shapes)
                    result.push(NaN);
                    result.push(NaN);
                    result.push(NaN);
                    result.push(NaN);

                    // Swing Point Labels (4 shapes)
                    result.push(signalHH);
                    result.push(signalLH);
                    result.push(signalHL);
                    result.push(signalLL);

                    // Equal Highs / Lows (2 shapes)
                    result.push(signalEQH);
                    result.push(signalEQL);

                    // OB Bullish Slots (MAX_OB_SLOTS x 2)
                    for (let k = 0; k < MAX_OB_SLOTS; k++) {
                        const ob = bullOBSlotIds[k] ? bullOBMap.get(bullOBSlotIds[k]) : null;
                        result.push(ob ? ob.top : NaN);
                        result.push(ob ? ob.bottom : NaN);
                    }

                    // OB Bearish Slots (MAX_OB_SLOTS x 2)
                    for (let k = 0; k < MAX_OB_SLOTS; k++) {
                        const ob = bearOBSlotIds[k] ? bearOBMap.get(bearOBSlotIds[k]) : null;
                        result.push(ob ? ob.top : NaN);
                        result.push(ob ? ob.bottom : NaN);
                    }

                    // FVG Bullish Slots (MAX_FVG_SLOTS x 2)
                    for (let k = 0; k < MAX_FVG_SLOTS; k++) {
                        const fvg = bullFVGSlotIds[k] ? bullFVGMap.get(bullFVGSlotIds[k]) : null;
                        result.push(fvg ? fvg.top : NaN);
                        result.push(fvg ? fvg.bottom : NaN);
                    }

                    // FVG Bearish Slots (MAX_FVG_SLOTS x 2)
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
    root.createSR_1 = createSR_1;
})(typeof window !== 'undefined' ? window : globalThis);
