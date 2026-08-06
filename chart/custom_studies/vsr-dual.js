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
                { id: "plot_6", type: "line" }
            ],

            defaults: {
                styles: {
                    plot_0: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FFEB3B" },
                    plot_1: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FFEB3B" },
                    plot_2: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#00B0FF" },
                    plot_3: { linestyle: 0, linewidth: 0, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#00B0FF" },
                    plot_4: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#FF9800" },
                    plot_5: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#AB47BC" },
                    plot_6: { linestyle: 0, linewidth: 2, plottype: 0, trackPrice: false, transparency: 0, visible: true, color: "#00E5FF" }
                },
                filledAreasStyle: {
                    fillarea_0: { color: "#FFEB3B", transparency: 50, visible: true },
                    fillarea_1: { color: "#00B0FF", transparency: 65, visible: true }
                },
                inputs: {
                    vsr1_length: 10,
                    vsr1_threshold: 10.0,
                    vsr2_length: 20,
                    vsr2_threshold: 10.0,
                    ema_length: 20,
                    vidya_length: 20,
                    vidya_cmo_length: 9,
                    vwap_length: 20
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
                { id: "vwap_length", name: "Price VWAP Length", defval: 20, type: "integer", min: 1, max: 500 }
            ],

            styles: {
                plot_0: { title: "VSR 1 Upper", histogramBase: 0, joinPoints: false },
                plot_1: { title: "VSR 1 Lower", histogramBase: 0, joinPoints: false },
                plot_2: { title: "VSR 2 Upper", histogramBase: 0, joinPoints: false },
                plot_3: { title: "VSR 2 Lower", histogramBase: 0, joinPoints: false },
                plot_4: { title: "Price EMA", histogramBase: 0, joinPoints: true },
                plot_5: { title: "Price VIDYA", histogramBase: 0, joinPoints: true },
                plot_6: { title: "Price VWAP", histogramBase: 0, joinPoints: true }
            },

            filledAreas: [
                { id: "fillarea_0", objAId: "plot_0", objBId: "plot_1", type: "plot_plot", title: "VSR 1 Zone" },
                { id: "fillarea_1", objAId: "plot_2", objBId: "plot_3", type: "plot_plot", title: "VSR 2 Zone" }
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

                return [this.vsr1Upper, this.vsr1Lower, this.vsr2Upper, this.vsr2Lower, ema, vidya, vwap];
            };
        }
    };
}
