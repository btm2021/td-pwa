// ATR Vector
// Robust state-space ATR trend: level + velocity + adaptive uncertainty.
// It intentionally avoids oscillators, bands, regression windows, and a large
// set of thresholds that require symbol-by-symbol tuning.

function createATRVector(PineJS) {
    return {
        name: "ATR Vector",
        metainfo: {
            _metainfoVersion: 51,
            id: "atr_vector@tv-basicstudies-4",
            name: "ATR Vector",
            description: "Robust state-space ATR trend",
            shortDescription: "ATR Vector",
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,

            plots: [
                { id: "plot_trail1", type: "line" },
                { id: "plot_trail2", type: "line" },
                { id: "plot_up", type: "line" },
                { id: "plot_down", type: "line" }
            ],

            defaults: {
                styles: {
                    plot_trail1: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#F5F7FA"
                    },
                    plot_trail2: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: "#FFB300"
                    },
                    plot_up: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#22AB94"
                    },
                    plot_down: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#F23645"
                    }
                },
                filledAreasStyle: {
                    fillarea_up: {
                        color: "#22AB94",
                        transparency: 84,
                        visible: true
                    },
                    fillarea_down: {
                        color: "#F23645",
                        transparency: 84,
                        visible: true
                    }
                },
                inputs: {
                    av_atr_period: 14,
                    av_atr_multiplier: 2.0,
                    av_model_period: 20
                }
            },

            inputs: [
                {
                    id: "av_atr_period",
                    name: "ATR Period",
                    defval: 14,
                    type: "integer",
                    min: 1,
                    max: 500
                },
                {
                    id: "av_atr_multiplier",
                    name: "ATR Multiplier",
                    defval: 2.0,
                    type: "float",
                    min: 0.1,
                    max: 10.0,
                    step: 0.1
                },
                {
                    id: "av_model_period",
                    name: "Model Period",
                    defval: 20,
                    type: "integer",
                    min: 3,
                    max: 200
                }
            ],

            styles: {
                plot_trail1: {
                    title: "Trail1 (Filtered Price State)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_trail2: {
                    title: "Trail2 (Adaptive ATR State)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_up: {
                    title: "Up Trend Fill",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_down: {
                    title: "Down Trend Fill",
                    histogramBase: 0,
                    joinPoints: true
                }
            },

            filledAreas: [
                {
                    id: "fillarea_up",
                    objAId: "plot_up",
                    objBId: "plot_trail2",
                    type: "plot_plot",
                    title: "Up Trend"
                },
                {
                    id: "fillarea_down",
                    objAId: "plot_down",
                    objBId: "plot_trail2",
                    type: "plot_plot",
                    title: "Down Trend"
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

                const atrPeriod = Math.max(1, Math.round(this._input(0)));
                const modelPeriod = Math.max(3, Math.round(this._input(2)));
                if (typeof this._context.setMinimumAdditionalDepth === "function") {
                    this._context.setMinimumAdditionalDepth(
                        atrPeriod + 6 * modelPeriod + 10
                    );
                }

                this.last_time = NaN;

                // State committed from the previous closed bar.
                this.prev_close = NaN;
                this.prev_atr = NaN;
                this.prev_level = NaN;
                this.prev_velocity = 0;
                this.prev_uncertainty = 0;
                this.prev_evidence = 0;
                this.prev_trail = NaN;
                this.prev_direction = 0;
                this.prev_bias = 0;

                // Latest state of the current open bar. Recomputed from the
                // committed state on every tick, preventing intrabar drift.
                this.current_close = NaN;
                this.current_atr = NaN;
                this.current_level = NaN;
                this.current_velocity = 0;
                this.current_uncertainty = 0;
                this.current_evidence = 0;
                this.current_trail = NaN;
                this.current_direction = 0;
                this.current_bias = 0;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const atrPeriod = Math.max(1, Math.round(this._input(0)));
                const atrMultiplier = Math.max(0.1, this._input(1));
                const modelPeriod = Math.max(3, Math.round(this._input(2)));

                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                const time = PineJS.Std.time(this._context);

                const isNewBar = isNaN(this.last_time) || time !== this.last_time;
                if (isNewBar) {
                    if (!isNaN(this.last_time) && !isNaN(this.current_close)) {
                        this.prev_close = this.current_close;
                        this.prev_atr = this.current_atr;
                        this.prev_level = this.current_level;
                        this.prev_velocity = this.current_velocity;
                        this.prev_uncertainty = this.current_uncertainty;
                        this.prev_evidence = this.current_evidence;
                        this.prev_trail = this.current_trail;
                        this.prev_direction = this.current_direction;
                        this.prev_bias = this.current_bias;
                    }
                    this.last_time = time;
                }

                // Original ATR Bot foundation: True Range + Wilder RMA.
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

                // Local linear state model:
                // price(t) = level(t) + velocity(t), observed with noise.
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

                // Soft clipping limits a single wick/gap without creating a
                // discontinuity like hard min/max clipping would.
                const robustInnovation = innovationScale * Math.tanh(
                    innovation / innovationScale
                );
                const level = predictedLevel + alpha * robustInnovation;
                const velocityDamping = 1 - 0.25 * alpha;
                const velocity = velocityDamping * this.prev_velocity +
                    beta * robustInnovation;
                const uncertainty = (1 - alpha) * this.prev_uncertainty +
                    alpha * Math.abs(innovation);

                // Direction is accumulated evidence from the hidden velocity,
                // normalized by ATR so defaults transfer across price scales.
                const safeAtr = Math.max(atr, Math.abs(close) * 1e-9, 1e-12);
                const velocityEvidence = Math.tanh(3 * velocity / safeAtr);
                const evidence = (1 - alpha) * this.prev_evidence +
                    alpha * velocityEvidence;

                // Fixed internal hysteresis removes threshold parameters from
                // the UI while keeping entry harder than exit.
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

                // Bias keeps a continuous two-line trend while the stricter
                // direction state is temporarily neutral.
                let bias = direction !== 0 ? direction : this.prev_bias;
                if (bias === 0) bias = evidence < 0 ? -1 : 1;
                if (direction === 0) {
                    if (evidence >= exitThreshold) bias = 1;
                    else if (evidence <= -exitThreshold) bias = -1;
                }

                const trail1 = level + velocity;
                const uncertaintyRatio = uncertainty / (safeAtr + uncertainty);
                const adaptiveDistance = atr * atrMultiplier *
                    (1 + 0.6 * uncertaintyRatio);

                let trail2;
                if (bias === 1) {
                    const candidate = Math.min(
                        trail1 - adaptiveDistance,
                        close - 0.25 * atr
                    );
                    const canRatchet = this.prev_bias === 1 &&
                        !isNaN(this.prev_trail) && this.prev_trail < close;
                    trail2 = canRatchet
                        ? Math.max(this.prev_trail, candidate)
                        : candidate;
                } else {
                    const candidate = Math.max(
                        trail1 + adaptiveDistance,
                        close + 0.25 * atr
                    );
                    const canRatchet = this.prev_bias === -1 &&
                        !isNaN(this.prev_trail) && this.prev_trail > close;
                    trail2 = canRatchet
                        ? Math.min(this.prev_trail, candidate)
                        : candidate;
                }

                // A crossed trail invalidates the confirmed direction, but the
                // bias/fill remains continuous until evidence chooses a side.
                if (direction === 1 && close < trail2) direction = 0;
                if (direction === -1 && close > trail2) direction = 0;

                this.current_close = close;
                this.current_atr = atr;
                this.current_level = level;
                this.current_velocity = velocity;
                this.current_uncertainty = uncertainty;
                this.current_evidence = evidence;
                this.current_trail = trail2;
                this.current_direction = direction;
                this.current_bias = bias;

                const upTrend = bias === 1 ? trail1 : NaN;
                const downTrend = bias === -1 ? trail1 : NaN;
                return [trail1, trail2, upTrend, downTrend];
            };
        }
    };
}
