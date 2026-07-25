// VSR Beta (Volume Spike Reversal)
// Keeps the original VSR zone logic and marks the first bar of every new zone.

function createVSRBeta(PineJS) {
    return {
        name: "VSR Beta",
        metainfo: {
            _metainfoVersion: 51,
            id: "vsr_beta@tv-basicstudies-2",
            name: "VSR Beta",
            description: "Volume Spike Reversal Levels - New Zone Markers",
            shortDescription: "VSR Beta",
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,

            plots: [
                { id: "plot_upper", type: "line" },
                { id: "plot_lower", type: "line" },
                { id: "plot_new_upper", type: "line" },
                { id: "plot_new_middle", type: "line" },
                { id: "plot_new_lower", type: "line" }
            ],

            defaults: {
                styles: {
                    plot_upper: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#FFD54F"
                    },
                    plot_lower: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#FFD54F"
                    },
                    plot_new_upper: {
                        linestyle: 0,
                        linewidth: 4,
                        plottype: 2,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#00E5FF"
                    },
                    plot_new_middle: {
                        linestyle: 0,
                        linewidth: 4,
                        plottype: 2,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#00E5FF"
                    },
                    plot_new_lower: {
                        linestyle: 0,
                        linewidth: 4,
                        plottype: 2,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#00E5FF"
                    }
                },
                filledAreasStyle: {
                    fillarea_zone: {
                        color: "#FFD54F",
                        transparency: 72,
                        visible: true
                    }
                },
                inputs: {
                    vsr_length: 10,
                    vsr_threshold: 10.0
                }
            },

            inputs: [
                {
                    id: "vsr_length",
                    name: "Volume SD Length",
                    defval: 10,
                    type: "integer",
                    min: 1,
                    max: 500
                },
                {
                    id: "vsr_threshold",
                    name: "Volume Threshold",
                    defval: 10.0,
                    type: "float",
                    min: 1.0,
                    max: 20.0,
                    step: 0.1
                }
            ],

            styles: {
                plot_upper: {
                    title: "VSR Beta Upper",
                    histogramBase: 0,
                    joinPoints: false
                },
                plot_lower: {
                    title: "VSR Beta Lower",
                    histogramBase: 0,
                    joinPoints: false
                },
                plot_new_upper: {
                    title: "NEW Zone Upper Marker",
                    histogramBase: 0,
                    joinPoints: false
                },
                plot_new_middle: {
                    title: "NEW Zone Middle Marker",
                    histogramBase: 0,
                    joinPoints: false
                },
                plot_new_lower: {
                    title: "NEW Zone Lower Marker",
                    histogramBase: 0,
                    joinPoints: false
                }
            },

            filledAreas: [
                {
                    id: "fillarea_zone",
                    objAId: "plot_upper",
                    objBId: "plot_lower",
                    type: "plot_plot",
                    title: "VSR Beta Zone"
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

                this.prev_volume = NaN;
                this.prev_high = NaN;
                this.prev_low = NaN;
                this.prev_close = NaN;
                this.prev_stdev = NaN;
                this.vsr_upper = NaN;
                this.vsr_lower = NaN;
                this.volume_changes = [];
                this.new_zone_time = NaN;
                this.new_zone_upper = NaN;
                this.new_zone_middle = NaN;
                this.new_zone_lower = NaN;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const length = this._input(0);
                const threshold = this._input(1);
                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                const volume = PineJS.Std.volume(this._context);
                const time = PineJS.Std.time(this._context);

                let change = 0;
                if (!isNaN(this.prev_volume) && this.prev_volume !== 0) {
                    change = volume / this.prev_volume - 1;
                }

                this.volume_changes.push(change);
                if (this.volume_changes.length > length) {
                    this.volume_changes.shift();
                }

                let stdev = 0;
                if (this.volume_changes.length >= 2) {
                    const sum = this.volume_changes.reduce((total, value) => total + value, 0);
                    const mean = sum / this.volume_changes.length;
                    const variance = this.volume_changes.reduce((total, value) => {
                        return total + Math.pow(value - mean, 2);
                    }, 0) / this.volume_changes.length;
                    stdev = Math.sqrt(variance);
                }

                let signal = 0;
                if (!isNaN(this.prev_stdev) && this.prev_stdev !== 0 && this.volume_changes.length >= 2) {
                    signal = Math.abs(change / this.prev_stdev);
                }

                let newZoneUpper = time === this.new_zone_time ? this.new_zone_upper : NaN;
                let newZoneMiddle = time === this.new_zone_time ? this.new_zone_middle : NaN;
                let newZoneLower = time === this.new_zone_time ? this.new_zone_lower : NaN;

                if (signal > threshold && !isNaN(this.prev_high)) {
                    const proposedUpper = Math.max(this.prev_high, this.prev_close);
                    const proposedLower = Math.min(this.prev_low, this.prev_close);
                    const overlapsCurrentZone = !isNaN(this.vsr_upper) &&
                        !isNaN(this.vsr_lower) &&
                        proposedLower <= this.vsr_upper &&
                        this.vsr_lower <= proposedUpper;

                    if (overlapsCurrentZone) {
                        this.vsr_upper = Math.max(this.vsr_upper, proposedUpper);
                        this.vsr_lower = Math.min(this.vsr_lower, proposedLower);
                    } else {
                        this.vsr_upper = proposedUpper;
                        this.vsr_lower = proposedLower;
                        newZoneUpper = proposedUpper;
                        newZoneMiddle = (proposedUpper + proposedLower) / 2;
                        newZoneLower = proposedLower;
                        this.new_zone_time = time;
                        this.new_zone_upper = proposedUpper;
                        this.new_zone_middle = newZoneMiddle;
                        this.new_zone_lower = proposedLower;
                    }
                }

                this.prev_volume = volume;
                this.prev_high = high;
                this.prev_low = low;
                this.prev_close = close;
                this.prev_stdev = stdev;

                return [
                    this.vsr_upper,
                    this.vsr_lower,
                    newZoneUpper,
                    newZoneMiddle,
                    newZoneLower
                ];
            };
        }
    };
}
