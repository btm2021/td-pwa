/**
 * ATRBot ER-Adaptive Custom Study
 * 
 * Converted from PineScript v5:
 * indicator(title="ATRBot ER-Adaptive", shorttitle="ATRBot-ER", overlay=true)
 * 
 * Core Features:
 * - MA selection: EMA, VWMA, VIDYA (Variable Index Dynamic Average via CMO)
 * - Kaufman Efficiency Ratio (ER) based adaptive ATR multiplier
 * - ER non-linear curve power mapping: multMin + (multMax - multMin) * (1 - ER)^power
 * - ER slope guard to prevent trend exhaustion trap when ER declines rapidly after peak
 * - Ratcheting Trail2 line with Trend Fill cloud
 */

(function (root) {
    'use strict';

    function createATRBotER(PineJS) {
        return {
            name: "ATRBot ER-Adaptive",
            metainfo: {
                _metainfoVersion: 51,
                id: "atrbot_er@tv-basicstudies-1",
                name: "ATRBot ER-Adaptive",
                description: "ATRBot ER-Adaptive Dynamic Trail with Efficiency Ratio",
                shortDescription: "ATRBot-ER",
                is_hidden_study: false,
                is_price_study: true,
                isCustomIndicator: true,

                plots: [
                    { id: "plot_0", type: "line" }, // Trail1 (MA)
                    { id: "plot_1", type: "line" }, // Trail2 (ATR Trail)
                    { id: "plot_2", type: "line" }, // Trail1 for green fill
                    { id: "plot_3", type: "line" }  // Trail1 for red fill
                ],

                defaults: {
                    styles: {
                        plot_0: {
                            linestyle: 0,
                            linewidth: 2,
                            plottype: 0,
                            trackPrice: false,
                            transparency: 0,
                            visible: true,
                            color: "#26a69a"
                        },
                        plot_1: {
                            linestyle: 0,
                            linewidth: 2,
                            plottype: 0,
                            trackPrice: false,
                            transparency: 0,
                            visible: true,
                            color: "#ef5350"
                        },
                        plot_2: {
                            linestyle: 0,
                            linewidth: 1,
                            plottype: 0,
                            trackPrice: false,
                            transparency: 100,
                            visible: true,
                            color: "#26a69a"
                        },
                        plot_3: {
                            linestyle: 0,
                            linewidth: 1,
                            plottype: 0,
                            trackPrice: false,
                            transparency: 100,
                            visible: true,
                            color: "#ef5350"
                        }
                    },
                    filledAreasStyle: {
                        fillarea_0: {
                            color: "#26a69a",
                            transparency: 80,
                            visible: true
                        },
                        fillarea_1: {
                            color: "#ef5350",
                            transparency: 80,
                            visible: true
                        }
                    },
                    inputs: {
                        source: "close",
                        maLen: 30,
                        maType: "EMA",
                        vidyaCmoLen: 9,
                        atrLen: 14,
                        multBase: 2.0,
                        multMin: 1.0,
                        multMax: 3.5,
                        erLen: 20,
                        erSmooth: 5,
                        erPower: 2.0,
                        erSlopeGuard: true,
                        erSlopeLen: 3
                    }
                },

                inputs: [
                    // Source & MA
                    { id: "source", name: "Source", defval: "close", type: "source", options: ["open", "high", "low", "close", "hl2", "hlc3", "ohlc4"] },
                    { id: "maLen", name: "MA Length", defval: 30, type: "integer", min: 1, max: 1000 },
                    { id: "maType", name: "MA Type", defval: "EMA", type: "text", options: ["EMA", "VWMA", "VIDYA"] },
                    { id: "vidyaCmoLen", name: "VIDYA — CMO Period", defval: 9, type: "integer", min: 2, max: 500 },

                    // ATR & Multiplier
                    { id: "atrLen", name: "ATR Length", defval: 14, type: "integer", min: 1, max: 500 },
                    { id: "multBase", name: "Base Multiplier", defval: 2.0, type: "float", min: 0.1, max: 10.0, step: 0.1 },
                    { id: "multMin", name: "Mult Min (strong trend)", defval: 1.0, type: "float", min: 0.1, max: 10.0, step: 0.1 },
                    { id: "multMax", name: "Mult Max (noise)", defval: 3.5, type: "float", min: 0.1, max: 20.0, step: 0.1 },

                    // Efficiency Ratio
                    { id: "erLen", name: "ER Period", defval: 20, type: "integer", min: 2, max: 500 },
                    { id: "erSmooth", name: "ER Smooth (EMA)", defval: 5, type: "integer", min: 1, max: 100 },
                    { id: "erPower", name: "ER Curve Power (1=linear, 2=quadratic)", defval: 2.0, type: "float", min: 1.0, max: 4.0, step: 0.5 },
                    { id: "erSlopeGuard", name: "ER Slope Guard (avoid trend exhaustion trap)", defval: true, type: "bool" },
                    { id: "erSlopeLen", name: "Slope Lookback", defval: 3, type: "integer", min: 1, max: 50 }
                ],

                styles: {
                    plot_0: { title: "Trail 1 (MA)", histogramBase: 0, joinPoints: true },
                    plot_1: { title: "Trail 2 (ATR Trail)", histogramBase: 0, joinPoints: true },
                    plot_2: { title: "Trail 1 Green", histogramBase: 0, joinPoints: true },
                    plot_3: { title: "Trail 1 Red", histogramBase: 0, joinPoints: true }
                },

                filledAreas: [
                    {
                        id: "fillarea_0",
                        objAId: "plot_2",
                        objBId: "plot_1",
                        type: "plot_plot",
                        title: "Trend Fill Bull (Trail1 > Trail2)"
                    },
                    {
                        id: "fillarea_1",
                        objAId: "plot_3",
                        objBId: "plot_1",
                        type: "plot_plot",
                        title: "Trend Fill Bear (Trail1 < Trail2)"
                    }
                ],

                precision: 4,
                format: {
                    type: "price",
                    precision: 4
                }
            },

            constructor: function () {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const maLen = Math.max(1, Math.round(this._input(1)));
                    const atrLen = Math.max(1, Math.round(this._input(4)));
                    const erLen = Math.max(2, Math.round(this._input(8)));
                    const minDepth = Math.max(maLen, atrLen, erLen) * 3 + 50;

                    if (typeof this._context.setMinimumAdditionalDepth === 'function') {
                        this._context.setMinimumAdditionalDepth(minDepth);
                    }

                    this.last_time = NaN;

                    // History buffers
                    this.srcHistory = [];
                    this.volHistory = [];
                    this.erSmoothHistory = [];

                    // Previous bar committed states
                    this.prev_close = NaN;
                    this.prev_atr = NaN;
                    this.prev_ema = NaN;
                    this.prev_vidya = NaN;
                    this.prev_er_smooth = NaN;
                    this.prev_trail1 = NaN;
                    this.prev_trail2 = NaN;

                    // Current bar working states
                    this.curr_close = NaN;
                    this.curr_atr = NaN;
                    this.curr_ema = NaN;
                    this.curr_vidya = NaN;
                    this.curr_er_smooth = NaN;
                    this.curr_trail1 = NaN;
                    this.curr_trail2 = NaN;
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // Read inputs
                    const source_type = String(this._input(0) || 'close').toLowerCase();
                    const maLen = Math.max(1, Math.round(this._input(1)));
                    const maType = String(this._input(2) || 'EMA').toUpperCase();
                    const vidyaCmoLen = Math.max(2, Math.round(this._input(3)));

                    const atrLen = Math.max(1, Math.round(this._input(4)));
                    const multBase = Math.max(0.1, Number(this._input(5)) || 2.0);
                    const multMin = Math.max(0.1, Number(this._input(6)) || 1.0);
                    const multMax = Math.max(0.1, Number(this._input(7)) || 3.5);

                    const erLen = Math.max(2, Math.round(this._input(8)));
                    const erSmooth = Math.max(1, Math.round(this._input(9)));
                    const erPower = Math.max(1.0, Number(this._input(10)) || 2.0);
                    const erSlopeGuard = Boolean(this._input(11));
                    const erSlopeLen = Math.max(1, Math.round(this._input(12)));

                    // Get OHLCVT
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);
                    const time = PineJS.Std.time(this._context);
                    const volume = PineJS.Std.volume ? (PineJS.Std.volume(this._context) || 0) : 0;

                    if (![high, low, close, time].every(Number.isFinite)) {
                        return [NaN, NaN, NaN, NaN];
                    }

                    // Resolve Source
                    let src;
                    switch (source_type) {
                        case 'open': src = open; break;
                        case 'high': src = high; break;
                        case 'low': src = low; break;
                        case 'hl2': src = (high + low) / 2; break;
                        case 'hlc3': src = (high + low + close) / 3; break;
                        case 'ohlc4': src = (open + high + low + close) / 4; break;
                        default: src = close; break;
                    }

                    // Handle new bar vs intra-bar update
                    const isNewBar = isNaN(this.last_time) || time !== this.last_time;
                    if (isNewBar) {
                        if (!isNaN(this.last_time) && !isNaN(this.curr_trail2)) {
                            this.prev_close = this.curr_close;
                            this.prev_atr = this.curr_atr;
                            this.prev_ema = this.curr_ema;
                            this.prev_vidya = this.curr_vidya;
                            this.prev_er_smooth = this.curr_er_smooth;
                            this.prev_trail1 = this.curr_trail1;
                            this.prev_trail2 = this.curr_trail2;
                            this.erSmoothHistory.push(this.curr_er_smooth);
                        }

                        this.srcHistory.push(src);
                        this.volHistory.push(volume);
                        this.last_time = time;
                    } else {
                        // Intra-bar update of current bar
                        const lastIdx = this.srcHistory.length - 1;
                        if (lastIdx >= 0) {
                            this.srcHistory[lastIdx] = src;
                            this.volHistory[lastIdx] = volume;
                        }
                    }

                    const historyLen = this.srcHistory.length;

                    // ─── 1. MA CALCULATIONS (Trail1) ──────────────────────────────────

                    // 1A. EMA
                    const emaAlpha = 2.0 / (maLen + 1);
                    const currEma = isNaN(this.prev_ema)
                        ? src
                        : this.prev_ema + emaAlpha * (src - this.prev_ema);

                    // 1B. VWMA
                    let currVwma = src;
                    if (historyLen >= 1) {
                        const count = Math.min(historyLen, maLen);
                        let sumPv = 0;
                        let sumV = 0;
                        for (let i = 0; i < count; i++) {
                            const idx = historyLen - 1 - i;
                            const barSrc = this.srcHistory[idx];
                            const barVol = this.volHistory[idx] || 0;
                            sumPv += barSrc * barVol;
                            sumV += barVol;
                        }
                        currVwma = sumV > 0 ? sumPv / sumV : currEma;
                    }

                    // 1C. VIDYA (Variable Index Dynamic Average via CMO)
                    // PineScript:
                    // cmo_raw = ta.cmo(src, vidyaCmoLen)
                    // cmo_norm = math.abs(cmo_raw) / 100.0
                    // alpha_base = 2.0 / (maLen + 1)
                    // vidya_val := na(vidya_val[1]) ? src : vidya_val[1] + alpha_base * cmo_norm * (src - vidya_val[1])
                    let sumUp = 0;
                    let sumDown = 0;
                    const cmoBars = Math.min(historyLen - 1, vidyaCmoLen);
                    for (let i = 0; i < cmoBars; i++) {
                        const idx = historyLen - 1 - i;
                        const diff = this.srcHistory[idx] - this.srcHistory[idx - 1];
                        if (diff > 0) sumUp += diff;
                        else if (diff < 0) sumDown -= diff;
                    }
                    const totalDiff = sumUp + sumDown;
                    const cmoRaw = totalDiff > 0 ? 100.0 * (sumUp - sumDown) / totalDiff : 0.0;
                    const cmoNorm = Math.abs(cmoRaw) / 100.0;
                    const alphaBase = 2.0 / (maLen + 1);
                    const currVidya = isNaN(this.prev_vidya)
                        ? src
                        : this.prev_vidya + alphaBase * cmoNorm * (src - this.prev_vidya);

                    // Select Trail1
                    let trail1;
                    if (maType === 'VWMA') {
                        trail1 = currVwma;
                    } else if (maType === 'VIDYA') {
                        trail1 = currVidya;
                    } else {
                        trail1 = currEma;
                    }

                    // ─── 2. ATR BASE ──────────────────────────────────────────────────
                    // Wilder RMA True Range
                    const tr = isNaN(this.prev_close)
                        ? high - low
                        : Math.max(
                            high - low,
                            Math.abs(high - this.prev_close),
                            Math.abs(low - this.prev_close)
                        );
                    const currAtr = isNaN(this.prev_atr)
                        ? tr
                        : (this.prev_atr * (atrLen - 1) + tr) / atrLen;

                    // ─── 3. EFFICIENCY RATIO (Kaufman ER) ─────────────────────────────
                    // netChange = math.abs(src - src[erLen])
                    // pathLen   = math.sum(math.abs(src - src[1]), erLen)
                    // er_raw    = pathLen > 1e-10 ? netChange / pathLen : 0.0
                    let netChange = 0;
                    let pathLen = 0;
                    if (historyLen > 1) {
                        const lookback = Math.min(historyLen - 1, erLen);
                        const pastSrc = this.srcHistory[historyLen - 1 - lookback];
                        netChange = Math.abs(src - pastSrc);

                        for (let i = 0; i < lookback; i++) {
                            const idx = historyLen - 1 - i;
                            pathLen += Math.abs(this.srcHistory[idx] - this.srcHistory[idx - 1]);
                        }
                    }
                    const erRaw = pathLen > 1e-10 ? netChange / pathLen : 0.0;

                    // Smoothed ER via EMA
                    const erAlpha = 2.0 / (erSmooth + 1);
                    const currErSmooth = isNaN(this.prev_er_smooth)
                        ? erRaw
                        : this.prev_er_smooth + erAlpha * (erRaw - this.prev_er_smooth);

                    // ─── 4. ER SLOPE GUARD & MULTIPLIER ──────────────────────────────
                    // er_slope = er_smooth - er_smooth[erSlopeLen]
                    let erSmoothLookback = currErSmooth;
                    if (this.erSmoothHistory.length >= erSlopeLen) {
                        erSmoothLookback = this.erSmoothHistory[this.erSmoothHistory.length - erSlopeLen];
                    } else if (this.erSmoothHistory.length > 0) {
                        erSmoothLookback = this.erSmoothHistory[0];
                    }
                    const erSlope = currErSmooth - erSmoothLookback;

                    // Guard fires when: ER was high (> 0.55, strong trend) but now declining (< -0.08)
                    const guardActive = erSlopeGuard && (currErSmooth > 0.55) && (erSlope < -0.08);

                    // Adaptive mult via non-linear mapping (1 - ER)^power
                    const noiseFactor = Math.pow(Math.max(0, 1.0 - currErSmooth), erPower);
                    const multEr = multMin + (multMax - multMin) * noiseFactor;

                    // When slope guard fires: hold mult at least at multBase (don't compress further)
                    const multActive = guardActive ? Math.max(multEr, multBase) : multEr;

                    // ─── 5. TRAIL2 CORE LOGIC ─────────────────────────────────────────
                    // SL2 = ta.atr(atrLen) * mult_active
                    // iff_1  = Trail1 > nz(Trail2[1], 0) ? Trail1 - SL2 : Trail1 + SL2
                    // iff_2  = Trail1 < nz(Trail2[1], 0) and Trail1[1] < nz(Trail2[1], 0) ? math.min(nz(Trail2[1], 0), Trail1 + SL2) : iff_1
                    // Trail2 := Trail1 > nz(Trail2[1], 0) and Trail1[1] > nz(Trail2[1], 0) ? math.max(nz(Trail2[1], 0), Trail1 - SL2) : iff_2
                    const sl2 = currAtr * multActive;

                    const prevTrail2 = isNaN(this.prev_trail2) ? 0 : this.prev_trail2;
                    const prevTrail1 = isNaN(this.prev_trail1) ? trail1 : this.prev_trail1;

                    let trail2;
                    if (trail1 > prevTrail2) {
                        if (prevTrail1 > prevTrail2 && prevTrail2 > 0) {
                            trail2 = Math.max(prevTrail2, trail1 - sl2);
                        } else {
                            trail2 = trail1 - sl2;
                        }
                    } else {
                        if (trail1 < prevTrail2 && prevTrail1 < prevTrail2 && prevTrail2 > 0) {
                            trail2 = Math.min(prevTrail2, trail1 + sl2);
                        } else {
                            trail2 = trail1 + sl2;
                        }
                    }

                    // Save current working tick
                    this.curr_close = close;
                    this.curr_atr = currAtr;
                    this.curr_ema = currEma;
                    this.curr_vidya = currVidya;
                    this.curr_er_smooth = currErSmooth;
                    this.curr_trail1 = trail1;
                    this.curr_trail2 = trail2;

                    // Memory management
                    if (this.srcHistory.length > 3000) {
                        const trimCount = 1000;
                        this.srcHistory = this.srcHistory.slice(trimCount);
                        this.volHistory = this.volHistory.slice(trimCount);
                        if (this.erSmoothHistory.length > trimCount) {
                            this.erSmoothHistory = this.erSmoothHistory.slice(trimCount);
                        }
                    }

                    // ─── 6. PLOTS & CLOUD FILL ────────────────────────────────────────
                    // isUp = Trail1 > Trail2
                    // fill(t1, t2, color = isUp ? green : red)
                    const isUp = trail1 > trail2;
                    const trail1Green = isUp ? trail1 : NaN;
                    const trail1Red = !isUp ? trail1 : NaN;

                    return [
                        trail1,       // plot_0: Trail1 (MA line)
                        trail2,       // plot_1: Trail2 (ATR Trail line)
                        trail1Green,  // plot_2: Green Fill boundary
                        trail1Red     // plot_3: Red Fill boundary
                    ];
                };
            }
        };
    }

    root.createATRBotER = createATRBotER;

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { createATRBotER };
    }
})(typeof window !== 'undefined' ? window : globalThis);
