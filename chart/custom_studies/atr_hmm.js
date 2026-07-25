// ATR HMM
// ATR trail controlled by an online three-state Hidden Markov Model:
// Bear (0), Range (1), Bull (2).

function createATRHMM(PineJS) {
    return {
        name: "ATR HMM",
        metainfo: {
            _metainfoVersion: 51,
            id: "atr_hmm@tv-basicstudies-1",
            name: "ATR HMM",
            description: "ATR trend controlled by a three-regime HMM",
            shortDescription: "ATR HMM",
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,

            plots: [
                { id: "plot_trail1", type: "line" },
                { id: "plot_trail2", type: "line" },
                { id: "plot_bull", type: "line" },
                { id: "plot_bear", type: "line" },
                { id: "plot_range", type: "line" }
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
                    plot_bull: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#22AB94"
                    },
                    plot_bear: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#F23645"
                    },
                    plot_range: {
                        linestyle: 0,
                        linewidth: 1,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 100,
                        visible: true,
                        color: "#787B86"
                    }
                },
                filledAreasStyle: {
                    fillarea_bull: {
                        color: "#22AB94",
                        transparency: 84,
                        visible: true
                    },
                    fillarea_bear: {
                        color: "#F23645",
                        transparency: 84,
                        visible: true
                    },
                    fillarea_range: {
                        color: "#787B86",
                        transparency: 88,
                        visible: true
                    }
                },
                inputs: {
                    ah_atr_period: 14,
                    ah_atr_multiplier: 2.0,
                    ah_regime_persistence: 0.94
                }
            },

            inputs: [
                {
                    id: "ah_atr_period",
                    name: "ATR Period",
                    defval: 14,
                    type: "integer",
                    min: 1,
                    max: 500
                },
                {
                    id: "ah_atr_multiplier",
                    name: "ATR Multiplier",
                    defval: 2.0,
                    type: "float",
                    min: 0.1,
                    max: 10.0,
                    step: 0.1
                },
                {
                    id: "ah_regime_persistence",
                    name: "Regime Persistence",
                    defval: 0.94,
                    type: "float",
                    min: 0.50,
                    max: 0.995,
                    step: 0.005
                }
            ],

            styles: {
                plot_trail1: {
                    title: "Trail1 (Filtered Price)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_trail2: {
                    title: "Trail2 (HMM ATR Trail)",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_bull: {
                    title: "Bull Regime",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_bear: {
                    title: "Bear Regime",
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_range: {
                    title: "Range Regime",
                    histogramBase: 0,
                    joinPoints: true
                }
            },

            filledAreas: [
                {
                    id: "fillarea_bull",
                    objAId: "plot_bull",
                    objBId: "plot_trail2",
                    type: "plot_plot",
                    title: "Bull Regime"
                },
                {
                    id: "fillarea_bear",
                    objAId: "plot_bear",
                    objBId: "plot_trail2",
                    type: "plot_plot",
                    title: "Bear Regime"
                },
                {
                    id: "fillarea_range",
                    objAId: "plot_range",
                    objBId: "plot_trail2",
                    type: "plot_plot",
                    title: "Range Regime"
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
                if (typeof this._context.setMinimumAdditionalDepth === "function") {
                    this._context.setMinimumAdditionalDepth(atrPeriod * 8 + 20);
                }

                this.last_time = NaN;

                // Committed values from the previous closed bar.
                this.prev_close = NaN;
                this.prev_atr = NaN;
                this.prev_trail1 = NaN;
                this.prev_observation = 0;
                this.prev_prob_bear = 1 / 3;
                this.prev_prob_range = 1 / 3;
                this.prev_prob_bull = 1 / 3;
                this.prev_trail2 = NaN;
                this.prev_bias = 0;

                // Latest calculation for the current open bar.
                this.current_close = NaN;
                this.current_atr = NaN;
                this.current_trail1 = NaN;
                this.current_observation = 0;
                this.current_prob_bear = 1 / 3;
                this.current_prob_range = 1 / 3;
                this.current_prob_bull = 1 / 3;
                this.current_trail2 = NaN;
                this.current_bias = 0;
                this.current_regime = 1;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const atrPeriod = Math.max(1, Math.round(this._input(0)));
                const atrMultiplier = Math.max(0.1, this._input(1));
                const persistence = Math.min(0.995, Math.max(0.50, this._input(2)));

                const high = PineJS.Std.high(this._context);
                const low = PineJS.Std.low(this._context);
                const close = PineJS.Std.close(this._context);
                const time = PineJS.Std.time(this._context);

                const isNewBar = isNaN(this.last_time) || time !== this.last_time;
                if (isNewBar) {
                    if (!isNaN(this.last_time) && !isNaN(this.current_close)) {
                        this.prev_close = this.current_close;
                        this.prev_atr = this.current_atr;
                        this.prev_trail1 = this.current_trail1;
                        this.prev_observation = this.current_observation;
                        this.prev_prob_bear = this.current_prob_bear;
                        this.prev_prob_range = this.current_prob_range;
                        this.prev_prob_bull = this.current_prob_bull;
                        this.prev_trail2 = this.current_trail2;
                        this.prev_bias = this.current_bias;
                    }
                    this.last_time = time;
                }

                // ATR foundation from the original bot.
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
                const safeAtr = Math.max(atr, Math.abs(close) * 1e-9, 1e-12);

                // A short derived smoothing horizon keeps one-bar returns from
                // being treated as independent regime changes.
                const observationPeriod = Math.max(3, Math.round(atrPeriod / 2));
                const observationAlpha = 2 / (observationPeriod + 1);
                const normalizedReturn = isNaN(this.prev_close)
                    ? 0
                    : Math.max(-4, Math.min(4, (close - this.prev_close) / safeAtr));
                const observation = (1 - observationAlpha) * this.prev_observation +
                    observationAlpha * normalizedReturn;

                // Transition model: Bull and Bear must pass through Range;
                // direct one-bar Bull <-> Bear jumps have zero prior probability.
                const transition = 1 - persistence;
                const halfTransition = transition / 2;
                const priorBear = this.prev_prob_bear * persistence +
                    this.prev_prob_range * halfTransition;
                const priorRange = this.prev_prob_bear * transition +
                    this.prev_prob_range * persistence +
                    this.prev_prob_bull * transition;
                const priorBull = this.prev_prob_range * halfTransition +
                    this.prev_prob_bull * persistence;

                // Continuous Gaussian emission likelihoods. Means describe
                // directional ATR-normalized movement in each hidden regime.
                const gaussian = function (value, mean, sigma) {
                    const z = (value - mean) / sigma;
                    return Math.exp(-0.5 * z * z) / sigma;
                };
                const emissionBear = gaussian(observation, -0.35, 0.55);
                const emissionRange = gaussian(observation, 0.0, 0.22);
                const emissionBull = gaussian(observation, 0.35, 0.55);

                let probabilityBear = priorBear * emissionBear;
                let probabilityRange = priorRange * emissionRange;
                let probabilityBull = priorBull * emissionBull;
                const probabilitySum = probabilityBear + probabilityRange + probabilityBull;

                if (probabilitySum > 1e-15 && Number.isFinite(probabilitySum)) {
                    probabilityBear /= probabilitySum;
                    probabilityRange /= probabilitySum;
                    probabilityBull /= probabilitySum;
                } else {
                    probabilityBear = 1 / 3;
                    probabilityRange = 1 / 3;
                    probabilityBull = 1 / 3;
                }

                let regime = 1;
                if (probabilityBear > probabilityRange && probabilityBear > probabilityBull) {
                    regime = 0;
                } else if (probabilityBull > probabilityRange && probabilityBull > probabilityBear) {
                    regime = 2;
                }

                // Trail1 is a derived EMA of close. Its period is tied to ATR,
                // so no extra MA parameter is introduced.
                const trail1Period = Math.max(2, Math.round(atrPeriod / 2));
                const trail1Alpha = 2 / (trail1Period + 1);
                const trail1 = isNaN(this.prev_trail1)
                    ? close
                    : trail1Alpha * close + (1 - trail1Alpha) * this.prev_trail1;

                // Bull/Bear regimes choose direction. Range preserves the last
                // directional bias and expands the stop to avoid chop.
                let bias = this.prev_bias;
                if (regime === 2) bias = 1;
                else if (regime === 0) bias = -1;
                else if (bias === 0) bias = probabilityBull >= probabilityBear ? 1 : -1;

                const directionalConfidence = Math.abs(probabilityBull - probabilityBear);
                const rangeExpansion = 1 + 0.80 * probabilityRange;
                const lowConfidenceExpansion = 1 + 0.35 * (1 - directionalConfidence);
                const atrDistance = atr * atrMultiplier *
                    rangeExpansion * lowConfidenceExpansion;

                let trail2;
                if (bias === 1) {
                    const candidate = Math.min(
                        trail1 - atrDistance,
                        close - 0.25 * atr
                    );
                    const canRatchet = this.prev_bias === 1 &&
                        !isNaN(this.prev_trail2) && this.prev_trail2 < close;
                    trail2 = canRatchet
                        ? Math.max(this.prev_trail2, candidate)
                        : candidate;
                } else {
                    const candidate = Math.max(
                        trail1 + atrDistance,
                        close + 0.25 * atr
                    );
                    const canRatchet = this.prev_bias === -1 &&
                        !isNaN(this.prev_trail2) && this.prev_trail2 > close;
                    trail2 = canRatchet
                        ? Math.min(this.prev_trail2, candidate)
                        : candidate;
                }

                this.current_close = close;
                this.current_atr = atr;
                this.current_trail1 = trail1;
                this.current_observation = observation;
                this.current_prob_bear = probabilityBear;
                this.current_prob_range = probabilityRange;
                this.current_prob_bull = probabilityBull;
                this.current_trail2 = trail2;
                this.current_bias = bias;
                this.current_regime = regime;

                const bullPlot = regime === 2 ? trail1 : NaN;
                const bearPlot = regime === 0 ? trail1 : NaN;
                const rangePlot = regime === 1 ? trail1 : NaN;

                return [trail1, trail2, bullPlot, bearPlot, rangePlot];
            };
        }
    };
}
