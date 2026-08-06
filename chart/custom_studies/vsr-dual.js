// VSR Dual Zones Custom Study
// Two independently configured VSR price zones, rendered in a separate pane.

function createVSRDual(PineJS) {
    return {
        name: "VSR Dual Zones",
        metainfo: {
            _metainfoVersion: 51,
            id: "vsr_dual@tv-basicstudies-1",
            name: "VSR Dual Zones",
            description: "Two Volume Spike Reversal zones with independent lengths and thresholds",
            shortDescription: "VSR Dual Zones",
            is_hidden_study: false,
            is_price_study: false,
            isCustomIndicator: true,

            plots: [
                { id: "plot_0", type: "line" },
                { id: "plot_1", type: "line" },
                { id: "plot_2", type: "line" },
                { id: "plot_3", type: "line" },
                { id: "plot_4", type: "line" },
                { id: "plot_5", type: "line" },
                { id: "plot_6", type: "line" },
                { id: "plot_7", type: "line" },
                { id: "plot_8", type: "line" },
                { id: "plot_9", type: "line" },
                { id: "plot_10", type: "line" },
                { id: "plot_11", type: "line" },
                { id: "plot_12", type: "line" },
                { id: "plot_13", type: "line" }
            ],

            defaults: {
                styles: {
                    plot_0: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FFEB3B" },
                    plot_1: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FFEB3B" },
                    plot_2: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#00B0FF" },
                    plot_3: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#00B0FF" },
                    plot_4: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FF9800" },
                    plot_5: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#AB47BC" },
                    plot_6: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#00E5FF" },
                    plot_7: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#EC407A" },
                    plot_8: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FF1744" },
                    plot_9: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FF1744" },
                    plot_10: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#26A69A" },
                    plot_11: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#EF5350" },
                    plot_12: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 100, visible: true, color: "#26A69A" },
                    plot_13: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 100, visible: true, color: "#EF5350" }
                },
                filledAreasStyle: {
                    fillarea_0: { color: "#FFEB3B", transparency: 50, visible: true },
                    fillarea_1: { color: "#00B0FF", transparency: 65, visible: true },
                    fillarea_2: { color: "#FF1744", transparency: 25, visible: true },
                    fillarea_3: { color: "#26A69A", transparency: 85, visible: true },
                    fillarea_4: { color: "#EF5350", transparency: 85, visible: true }
                },
                inputs: {
                    vsr1_length: 10,
                    vsr1_threshold: 10.0,
                    vsr2_length: 20,
                    vsr2_threshold: 10.0,
                    ema_length: 20,
                    vidya_length: 20,
                    vidya_cmo_length: 9,
                    vwap_length: 20,
                    zigzag_depth: 5,
                    atrbot_atr_length: 14,
                    atrbot_multiplier: 2.0,
                    atrbot_ema_length: 30
                }
            },

            inputs: [
                { id: "vsr1_length", name: "VSR 1 Length", defval: 10, type: "integer", min: 1, max: 500 },
                { id: "vsr1_threshold", name: "VSR 1 Threshold", defval: 10.0, type: "float", min: 1.0, max: 20.0, step: 0.1 },
                { id: "vsr2_length", name: "VSR 2 Length", defval: 20, type: "integer", min: 1, max: 500 },
                { id: "vsr2_threshold", name: "VSR 2 Threshold", defval: 10.0, type: "float", min: 1.0, max: 20.0, step: 0.1 },
                { id: "ema_length", name: "Price EMA Length", defval: 20, type: "integer", min: 1, max: 500 },
                { id: "vidya_length", name: "Price VIDYA Length", defval: 20, type: "integer", min: 1, max: 500 },
                { id: "vidya_cmo_length", name: "VIDYA CMO Length", defval: 9, type: "integer", min: 1, max: 500 },
                { id: "vwap_length", name: "Price VWAP Length", defval: 20, type: "integer", min: 1, max: 500 },
                { id: "zigzag_depth", name: "ZigZag Depth", defval: 5, type: "integer", min: 1, max: 100 },
                { id: "atrbot_atr_length", name: "ATR Bot ATR Length", defval: 14, type: "integer", min: 1, max: 500 },
                { id: "atrbot_multiplier", name: "ATR Bot Multiplier", defval: 2.0, type: "float", min: 0.1, max: 10.0, step: 0.1 },
                { id: "atrbot_ema_length", name: "ATR Bot EMA Length", defval: 30, type: "integer", min: 1, max: 500 }
            ],

            styles: {
                plot_0: { title: "VSR 1 Upper", histogramBase: 0, joinPoints: false },
                plot_1: { title: "VSR 1 Lower", histogramBase: 0, joinPoints: false },
                plot_2: { title: "VSR 2 Upper", histogramBase: 0, joinPoints: false },
                plot_3: { title: "VSR 2 Lower", histogramBase: 0, joinPoints: false },
                plot_4: { title: "Price EMA", histogramBase: 0, joinPoints: true },
                plot_5: { title: "Price VIDYA", histogramBase: 0, joinPoints: true },
                plot_6: { title: "Price VWAP", histogramBase: 0, joinPoints: true },
                plot_7: { title: "ZigZag", histogramBase: 0, joinPoints: true },
                plot_8: { title: "VSR Overlap Upper", histogramBase: 0, joinPoints: false },
                plot_9: { title: "VSR Overlap Lower", histogramBase: 0, joinPoints: false },
                plot_10: { title: "ATR Bot EMA", histogramBase: 0, joinPoints: true },
                plot_11: { title: "ATR Bot Trail", histogramBase: 0, joinPoints: true },
                plot_12: { title: "ATR Bot Green Fill", histogramBase: 0, joinPoints: true },
                plot_13: { title: "ATR Bot Red Fill", histogramBase: 0, joinPoints: true }
            },

            filledAreas: [
                { id: "fillarea_0", objAId: "plot_0", objBId: "plot_1", type: "plot_plot", title: "VSR 1 Zone" },
                { id: "fillarea_1", objAId: "plot_2", objBId: "plot_3", type: "plot_plot", title: "VSR 2 Zone" },
                { id: "fillarea_2", objAId: "plot_8", objBId: "plot_9", type: "plot_plot", title: "VSR Zone Overlap" },
                { id: "fillarea_3", objAId: "plot_12", objBId: "plot_11", type: "plot_plot", title: "ATR Bot Uptrend" },
                { id: "fillarea_4", objAId: "plot_13", objBId: "plot_11", type: "plot_plot", title: "ATR Bot Downtrend" }
            ],

            precision: 4,
            format: { type: "price", precision: 4 }
        },

        constructor: function () {
            this.init = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                this.prevVolume = NaN;
                this.prevHigh = NaN;
                this.prevLow = NaN;
                this.prevClose = NaN;
                this.prevStdev1 = NaN;
                this.prevStdev2 = NaN;
                this.volumeChanges1 = [];
                this.volumeChanges2 = [];
                this.vsr1Upper = NaN;
                this.vsr1Lower = NaN;
                this.vsr2Upper = NaN;
                this.vsr2Lower = NaN;
                this.emaPrev = NaN;
                this.vidyaPrev = NaN;
                this.vidyaPrevClose = NaN;
                this.vidyaGains = [];
                this.vidyaLosses = [];
                this.vwapBuffer = [];
                this.zigzagHighs = [];
                this.zigzagLows = [];
                this.lastZigzagType = null;
                this.atrBotEmaPrev = NaN;
                this.atrBotAtrPrev = NaN;
                this.atrBotPrevClose = NaN;
                this.atrBotTrail2Prev = NaN;
                this.atrBotTrail1Prev = NaN;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const vsr1Length = this._input(0);
                const vsr1Threshold = this._input(1);
                const vsr2Length = this._input(2);
                const vsr2Threshold = this._input(3);
                const emaLength = this._input(4);
                const vidyaLength = this._input(5);
                const vidyaCmoLength = this._input(6);
                const vwapLength = this._input(7);
                const zigzagDepth = this._input(8);
                const atrBotAtrLength = this._input(9);
                const atrBotMultiplier = this._input(10);
                const atrBotEmaLength = this._input(11);
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                const volume = PineJS.Std.volume(this._context);

                let change = 0;
                if (!isNaN(this.prevVolume) && this.prevVolume !== 0) {
                    change = volume / this.prevVolume - 1;
                }

                const updateStdev = function (buffer, length, value) {
                    buffer.push(value);
                    if (buffer.length > length) buffer.shift();
                    if (buffer.length < 2) return 0;

                    const mean = buffer.reduce((sum, item) => sum + item, 0) / buffer.length;
                    const variance = buffer.reduce((sum, item) => sum + Math.pow(item - mean, 2), 0) / buffer.length;
                    return Math.sqrt(variance);
                };

                const stdev1 = updateStdev(this.volumeChanges1, vsr1Length, change);
                const stdev2 = updateStdev(this.volumeChanges2, vsr2Length, change);

                const updateZone = function (signal, threshold, upper, lower, prevHigh, prevLow, prevClose) {
                    if (signal <= threshold || isNaN(prevHigh)) return { upper: upper, lower: lower };

                    const proposedUpper = Math.max(prevHigh, prevClose);
                    const proposedLower = Math.min(prevLow, prevClose);
                    const overlaps = !isNaN(upper) && !isNaN(lower)
                        && proposedLower <= upper && lower <= proposedUpper;

                    if (overlaps) {
                        return {
                            upper: Math.max(upper, proposedUpper),
                            lower: Math.min(lower, proposedLower)
                        };
                    }

                    return { upper: proposedUpper, lower: proposedLower };
                };

                // Both score calculations match VSR. Each one uses its own previous-bar stdev.
                const signal1 = !isNaN(this.prevStdev1) && this.prevStdev1 !== 0 && this.volumeChanges1.length >= 2
                    ? Math.abs(change / this.prevStdev1)
                    : 0;
                const signal2 = !isNaN(this.prevStdev2) && this.prevStdev2 !== 0 && this.volumeChanges2.length >= 2
                    ? Math.abs(change / this.prevStdev2)
                    : 0;

                const zone1 = updateZone(
                    signal1, vsr1Threshold, this.vsr1Upper, this.vsr1Lower,
                    this.prevHigh, this.prevLow, this.prevClose
                );
                const zone2 = updateZone(
                    signal2, vsr2Threshold, this.vsr2Upper, this.vsr2Lower,
                    this.prevHigh, this.prevLow, this.prevClose
                );

                this.vsr1Upper = zone1.upper;
                this.vsr1Lower = zone1.lower;
                this.vsr2Upper = zone2.upper;
                this.vsr2Lower = zone2.lower;
                this.prevVolume = volume;
                this.prevHigh = high;
                this.prevLow = low;
                this.prevClose = close;
                this.prevStdev1 = stdev1;
                this.prevStdev2 = stdev2;

                let overlapUpper = NaN;
                let overlapLower = NaN;
                if (!isNaN(this.vsr1Upper) && !isNaN(this.vsr1Lower)
                    && !isNaN(this.vsr2Upper) && !isNaN(this.vsr2Lower)
                    && this.vsr1Lower <= this.vsr2Upper && this.vsr2Lower <= this.vsr1Upper) {
                    overlapUpper = Math.min(this.vsr1Upper, this.vsr2Upper);
                    overlapLower = Math.max(this.vsr1Lower, this.vsr2Lower);
                }

                const emaAlpha = 2 / (emaLength + 1);
                const ema = isNaN(this.emaPrev)
                    ? close
                    : emaAlpha * close + (1 - emaAlpha) * this.emaPrev;
                this.emaPrev = ema;

                let vidya;
                if (isNaN(this.vidyaPrevClose)) {
                    vidya = close;
                } else {
                    const priceChange = close - this.vidyaPrevClose;
                    this.vidyaGains.push(priceChange > 0 ? priceChange : 0);
                    this.vidyaLosses.push(priceChange < 0 ? Math.abs(priceChange) : 0);
                    if (this.vidyaGains.length > vidyaCmoLength) {
                        this.vidyaGains.shift();
                        this.vidyaLosses.shift();
                    }

                    let cmo = 0;
                    if (this.vidyaGains.length >= vidyaCmoLength) {
                        const gains = this.vidyaGains.reduce((sum, value) => sum + value, 0);
                        const losses = this.vidyaLosses.reduce((sum, value) => sum + value, 0);
                        const total = gains + losses;
                        if (total !== 0) cmo = ((gains - losses) / total) * 100;
                    }

                    const vidyaAlpha = (2 / (vidyaLength + 1)) * (Math.abs(cmo) / 100);
                    vidya = vidyaAlpha * close + (1 - vidyaAlpha) * this.vidyaPrev;
                }
                this.vidyaPrev = vidya;
                this.vidyaPrevClose = close;

                const typicalPrice = (high + low + close) / 3;
                this.vwapBuffer.push({ price: typicalPrice, volume: volume });
                if (this.vwapBuffer.length > vwapLength) this.vwapBuffer.shift();

                let sumPriceVolume = 0;
                let sumVolume = 0;
                for (let i = 0; i < this.vwapBuffer.length; i++) {
                    sumPriceVolume += this.vwapBuffer[i].price * this.vwapBuffer[i].volume;
                    sumVolume += this.vwapBuffer[i].volume;
                }
                const vwap = sumVolume !== 0 ? sumPriceVolume / sumVolume : typicalPrice;

                const zigzagWindow = zigzagDepth * 2 + 1;
                this.zigzagHighs.push(high);
                this.zigzagLows.push(low);
                while (this.zigzagHighs.length > zigzagWindow) {
                    this.zigzagHighs.shift();
                    this.zigzagLows.shift();
                }

                let zigzag = NaN;
                if (this.zigzagHighs.length === zigzagWindow) {
                    const pivotIndex = zigzagDepth;
                    const pivotHigh = this.zigzagHighs[pivotIndex];
                    const pivotLow = this.zigzagLows[pivotIndex];
                    let isPivotHigh = true;
                    let isPivotLow = true;

                    for (let i = 0; i < zigzagWindow; i++) {
                        if (i === pivotIndex) continue;
                        if (pivotHigh <= this.zigzagHighs[i]) isPivotHigh = false;
                        if (pivotLow >= this.zigzagLows[i]) isPivotLow = false;
                    }

                    // Keep alternating high/low pivots so the joined plot forms a ZigZag.
                    if (isPivotHigh && this.lastZigzagType !== 'high') {
                        zigzag = pivotHigh;
                        this.lastZigzagType = 'high';
                    } else if (isPivotLow && this.lastZigzagType !== 'low') {
                        zigzag = pivotLow;
                        this.lastZigzagType = 'low';
                    }
                }

                const atrBotEmaAlpha = 2 / (atrBotEmaLength + 1);
                const atrBotTrail1 = isNaN(this.atrBotEmaPrev)
                    ? close
                    : atrBotEmaAlpha * close + (1 - atrBotEmaAlpha) * this.atrBotEmaPrev;
                const atrBotTr = isNaN(this.atrBotPrevClose)
                    ? high - low
                    : Math.max(
                        high - low,
                        Math.abs(high - this.atrBotPrevClose),
                        Math.abs(low - this.atrBotPrevClose)
                    );
                const atrBotAtr = isNaN(this.atrBotAtrPrev)
                    ? atrBotTr
                    : (this.atrBotAtrPrev * (atrBotAtrLength - 1) + atrBotTr) / atrBotAtrLength;
                const atrBotDistance = atrBotAtr * atrBotMultiplier;
                const atrBotTrail2Prev = isNaN(this.atrBotTrail2Prev) ? 0 : this.atrBotTrail2Prev;
                const atrBotTrail1Prev = isNaN(this.atrBotTrail1Prev) ? atrBotTrail1 : this.atrBotTrail1Prev;
                let atrBotTrail2;

                if (atrBotTrail1 > atrBotTrail2Prev) {
                    atrBotTrail2 = atrBotTrail1Prev > atrBotTrail2Prev
                        ? Math.max(atrBotTrail2Prev, atrBotTrail1 - atrBotDistance)
                        : atrBotTrail1 - atrBotDistance;
                } else {
                    atrBotTrail2 = atrBotTrail1 < atrBotTrail2Prev && atrBotTrail1Prev < atrBotTrail2Prev
                        ? Math.min(atrBotTrail2Prev, atrBotTrail1 + atrBotDistance)
                        : atrBotTrail1 + atrBotDistance;
                }

                const atrBotGreen = atrBotTrail1 > atrBotTrail2 ? atrBotTrail1 : NaN;
                const atrBotRed = atrBotTrail1 > atrBotTrail2 ? NaN : atrBotTrail1;
                this.atrBotEmaPrev = atrBotTrail1;
                this.atrBotAtrPrev = atrBotAtr;
                this.atrBotPrevClose = close;
                this.atrBotTrail1Prev = atrBotTrail1;
                this.atrBotTrail2Prev = atrBotTrail2;

                return [
                    this.vsr1Upper, this.vsr1Lower, this.vsr2Upper, this.vsr2Lower,
                    ema, vidya, vwap, zigzag, overlapUpper, overlapLower,
                    atrBotTrail1, atrBotTrail2, atrBotGreen, atrBotRed
                ];
            };
        }
    };
}
