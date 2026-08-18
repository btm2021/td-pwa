/*
 * TradingView Advanced Charts adapter for the ForexFlow Supply/Demand core.
 * Source algorithm: https://github.com/bmarshall511/forexflow
 * Source revision: 7c60bbf5a4ae59150bd3bc425a06a4934cdd0af0
 * SPDX-License-Identifier: AGPL-3.0-only
 */

(function registerForexFlowSupplyDemandStudy(root) {
    'use strict';

    const MAX_ZONES_PER_TYPE = 5;
    const TYPES = ['demand', 'supply'];
    const COLORS = {
        demand: '#26A69A',
        supply: '#EF5350',
    };

    function emptyPlots() {
        return new Array(MAX_ZONES_PER_TYPE * TYPES.length * 2).fill(NaN);
    }

    function createEmptySlots() {
        return {
            demand: new Array(MAX_ZONES_PER_TYPE).fill(null),
            supply: new Array(MAX_ZONES_PER_TYPE).fill(null),
        };
    }

    function cloneSlots(slots) {
        return {
            demand: slots.demand.slice(),
            supply: slots.supply.slice(),
        };
    }

    function reconcileTypeSlots(previousSlots, desiredZones) {
        const slots = previousSlots.slice();
        const desiredIds = new Set(desiredZones.map((zone) => zone.id));
        const blockedThisBar = new Array(slots.length).fill(false);

        for (let i = 0; i < slots.length; i++) {
            if (slots[i] !== null && !desiredIds.has(slots[i])) {
                slots[i] = null;
                blockedThisBar[i] = true;
            }
        }

        const assigned = new Set(slots.filter((id) => id !== null));
        for (const zone of desiredZones) {
            if (assigned.has(zone.id)) continue;

            const availableIndex = slots.findIndex(
                (id, index) => id === null && !blockedThisBar[index]
            );
            if (availableIndex === -1) break;

            slots[availableIndex] = zone.id;
            assigned.add(zone.id);
        }

        return slots;
    }

    function reconcileSlots(previousSlots, desiredByType) {
        return {
            demand: reconcileTypeSlots(previousSlots.demand, desiredByType.demand),
            supply: reconcileTypeSlots(previousSlots.supply, desiredByType.supply),
        };
    }

    function normalizePreset(value) {
        const preset = String(value || 'Standard').toLowerCase();
        if (preset === 'conservative' || preset === 'aggressive') return preset;
        return 'standard';
    }

    function finiteNumber(value, fallback) {
        return Number.isFinite(value) ? value : fallback;
    }

    function buildMetainfo() {
        const plots = [];
        const styles = {};
        const defaultStyles = {};
        const filledAreas = [];
        const filledAreasStyle = {};

        for (const type of TYPES) {
            const title = type === 'demand' ? 'Demand' : 'Supply';
            const color = COLORS[type];

            for (let slot = 0; slot < MAX_ZONES_PER_TYPE; slot++) {
                const proximalId = `${type}_proximal_${slot}`;
                const distalId = `${type}_distal_${slot}`;
                const fillId = `${type}_fill_${slot}`;

                plots.push({ id: proximalId, type: 'line' });
                plots.push({ id: distalId, type: 'line' });

                styles[proximalId] = {
                    title: `${title} ${slot + 1} Proximal`,
                    histogramBase: 0,
                    joinPoints: false,
                };
                styles[distalId] = {
                    title: `${title} ${slot + 1} Distal`,
                    histogramBase: 0,
                    joinPoints: false,
                };

                defaultStyles[proximalId] = {
                    linestyle: 0,
                    linewidth: 2,
                    plottype: 0,
                    trackPrice: false,
                    transparency: 5,
                    visible: true,
                    color,
                };
                defaultStyles[distalId] = {
                    linestyle: 2,
                    linewidth: 1,
                    plottype: 0,
                    trackPrice: false,
                    transparency: 15,
                    visible: true,
                    color,
                };

                filledAreas.push({
                    id: fillId,
                    objAId: proximalId,
                    objBId: distalId,
                    type: 'plot_plot',
                    title: `${title} Zone ${slot + 1}`,
                });
                filledAreasStyle[fillId] = {
                    color,
                    transparency: 84,
                    visible: true,
                };
            }
        }

        return {
            _metainfoVersion: 51,
            id: 'forexflow_supply_demand@tv-basicstudies-1',
            name: 'ForexFlow Supply & Demand',
            description: 'ForexFlow Supply & Demand',
            shortDescription: 'FXFlow S/D',
            is_hidden_study: false,
            is_price_study: true,
            linkedToSeries: true,
            isCustomIndicator: true,
            format: { type: 'inherit' },
            plots,
            filledAreas,
            defaults: {
                styles: defaultStyles,
                filledAreasStyle,
                inputs: {
                    preset: 'Standard',
                    lookback: 300,
                    maxZonesPerType: 5,
                    minScore: 1.5,
                    showTested: false,
                },
            },
            inputs: [
                {
                    id: 'preset',
                    name: 'Detection Preset',
                    defval: 'Standard',
                    type: 'text',
                    options: ['Conservative', 'Standard', 'Aggressive'],
                },
                {
                    id: 'lookback',
                    name: 'Lookback Candles',
                    defval: 300,
                    type: 'integer',
                    min: 50,
                    max: 500,
                },
                {
                    id: 'maxZonesPerType',
                    name: 'Maximum Zones Per Type',
                    defval: 5,
                    type: 'integer',
                    min: 1,
                    max: MAX_ZONES_PER_TYPE,
                },
                {
                    id: 'minScore',
                    name: 'Minimum Score (0-5)',
                    defval: 1.5,
                    type: 'float',
                    min: 0,
                    max: 5,
                    step: 0.5,
                },
                {
                    id: 'showTested',
                    name: 'Show Tested Zones',
                    defval: false,
                    type: 'bool',
                },
            ],
            styles,
        };
    }

    function createForexFlowSupplyDemand(PineJS) {
        const core = root.ForexFlowSupplyDemandCore;
        if (!core) {
            throw new Error(
                'ForexFlowSupplyDemandCore is missing. Load forexflow-sd-core.js before forexflow-sd.js.'
            );
        }

        return {
            name: 'ForexFlow Supply & Demand',
            metainfo: buildMetainfo(),

            constructor: function ForexFlowSupplyDemandStudy() {
                this.init = function init(context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;
                    this.lastTime = NaN;
                    this.committedCandles = [];
                    this.currentCandle = null;
                    this.committedSlots = createEmptySlots();
                    this.currentSlots = createEmptySlots();
                    this.loggedCalculationError = false;

                    const requestedLookback = Math.round(finiteNumber(this._input(1), 300));
                    const depth = Math.max(50, Math.min(core.maxCandles, requestedLookback));
                    if (typeof this._context.setMinimumAdditionalDepth === 'function') {
                        this._context.setMinimumAdditionalDepth(depth + 20);
                    }
                };

                this.main = function main(context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const time = PineJS.Std.time(this._context);
                    const open = PineJS.Std.open(this._context);
                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const close = PineJS.Std.close(this._context);

                    if (![time, open, high, low, close].every(Number.isFinite)) {
                        return emptyPlots();
                    }

                    // Replay/jump flows may move the study clock backwards without
                    // constructing a new study instance. Drop every committed bar
                    // at or after the rewind point so future candles cannot leak
                    // into the recalculated zones.
                    if (Number.isFinite(this.lastTime) && time < this.lastTime) {
                        const rewindIndex = this.committedCandles.findIndex(
                            (candle) => candle.time >= time
                        );
                        if (rewindIndex >= 0) {
                            this.committedCandles = this.committedCandles.slice(0, rewindIndex);
                        }
                        this.lastTime = NaN;
                        this.currentCandle = null;
                        this.committedSlots = createEmptySlots();
                        this.currentSlots = createEmptySlots();
                    }

                    const lookback = Math.max(
                        50,
                        Math.min(core.maxCandles, Math.round(finiteNumber(this._input(1), 300)))
                    );
                    const maximumZones = Math.max(
                        1,
                        Math.min(
                            MAX_ZONES_PER_TYPE,
                            Math.round(finiteNumber(this._input(2), MAX_ZONES_PER_TYPE))
                        )
                    );
                    const minimumScore = Math.max(
                        0,
                        Math.min(5, finiteNumber(this._input(3), 1.5))
                    );
                    const showTested = Boolean(this._input(4));
                    const presetName = normalizePreset(this._input(0));
                    const config = core.getPresetConfig(presetName);
                    const isNewBar = !Number.isFinite(this.lastTime) || time !== this.lastTime;

                    if (isNewBar) {
                        if (this.currentCandle !== null) {
                            this.committedCandles.push(this.currentCandle);
                            this.committedSlots = cloneSlots(this.currentSlots);
                        }
                        this.lastTime = time;
                    }

                    const maximumCommitted = Math.max(0, lookback - 1);
                    if (this.committedCandles.length > maximumCommitted) {
                        this.committedCandles = this.committedCandles.slice(-maximumCommitted);
                    }

                    const currentCandle = { time, open, high, low, close };
                    this.currentCandle = currentCandle;
                    const candles = maximumCommitted > 0
                        ? this.committedCandles.slice(-maximumCommitted)
                        : [];
                    candles.push(currentCandle);

                    let zones;
                    try {
                        zones = core.detectZones(candles, config, close);
                    } catch (error) {
                        if (!this.loggedCalculationError) {
                            console.error('[ForexFlow S/D] Zone calculation failed:', error);
                            this.loggedCalculationError = true;
                        }
                        return emptyPlots();
                    }

                    const visibleZones = zones.filter((zone) =>
                        zone.scores.total >= minimumScore &&
                        zone.status !== 'invalidated' &&
                        (showTested || zone.testCount === 0)
                    );
                    const desiredByType = {
                        demand: visibleZones
                            .filter((zone) => zone.type === 'demand')
                            .slice(0, maximumZones),
                        supply: visibleZones
                            .filter((zone) => zone.type === 'supply')
                            .slice(0, maximumZones),
                    };

                    this.currentSlots = reconcileSlots(
                        cloneSlots(this.committedSlots),
                        desiredByType
                    );

                    const zoneById = new Map(visibleZones.map((zone) => [zone.id, zone]));
                    const result = [];

                    for (const type of TYPES) {
                        for (const zoneId of this.currentSlots[type]) {
                            const zone = zoneId === null ? null : zoneById.get(zoneId);
                            result.push(zone ? zone.proximalLine : NaN);
                            result.push(zone ? zone.distalLine : NaN);
                        }
                    }

                    return result;
                };
            },
        };
    }

    root.createForexFlowSupplyDemand = createForexFlowSupplyDemand;
})(typeof window !== 'undefined' ? window : globalThis);
