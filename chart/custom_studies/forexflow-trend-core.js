/*
 * ForexFlow market-structure/trend calculation core.
 *
 * Adapted from the ForexFlow trend detector at commit
 * 7c60bbf5a4ae59150bd3bc425a06a4934cdd0af0:
 * https://github.com/bmarshall511/forexflow
 *
 * Upstream and this adapted file are licensed under the GNU Affero General
 * Public License v3.0 (AGPL-3.0-only). This software is provided without
 * warranty. See the upstream LICENSE for the full license text.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

(function registerForexFlowTrendCore(root) {
    'use strict';

    const MAX_CANDLES = 500;
    const ATR_PERIOD = 14;

    const DEFAULT_CONFIG = Object.freeze({
        swingStrength: 5,
        minSegmentAtr: 0.5,
        maxSwingPoints: 20,
        lookbackCandles: 500,
    });

    const JPY_PAIRS = new Set([
        'USD_JPY',
        'EUR_JPY',
        'GBP_JPY',
        'AUD_JPY',
        'CAD_JPY',
        'CHF_JPY',
        'NZD_JPY',
        'SGD_JPY',
        'HKD_JPY',
        'ZAR_JPY',
        'TRY_JPY',
        'MXN_JPY',
        'CNH_JPY',
    ]);

    let nextId = 0;

    function uid() {
        return `sw_${Date.now()}_${++nextId}`;
    }

    function getDefaultConfig() {
        return { ...DEFAULT_CONFIG };
    }

    function getDefaultSwingStrength(timeframe) {
        switch (timeframe) {
            case 'M1':
            case 'M5':
            case 'M15':
            case 'M30':
                return 3;
            default:
                return 5;
        }
    }

    function getPipSize(instrument) {
        return JPY_PAIRS.has(instrument) ? 0.01 : 0.0001;
    }

    function priceToPips(instrument, priceDistance) {
        return Math.abs(priceDistance) / getPipSize(instrument);
    }

    function computeATR(candles, period) {
        const count = candles.length;
        if (count === 0) return [];

        const atr = new Array(count).fill(0);
        const trueRanges = new Array(count);
        trueRanges[0] = candles[0].high - candles[0].low;

        for (let i = 1; i < count; i++) {
            const candle = candles[i];
            const previousClose = candles[i - 1].close;
            trueRanges[i] = Math.max(
                candle.high - candle.low,
                Math.abs(candle.high - previousClose),
                Math.abs(candle.low - previousClose)
            );
        }

        if (count < period) {
            let partialSum = 0;
            for (let i = 0; i < count; i++) {
                partialSum += trueRanges[i];
                atr[i] = partialSum / (i + 1);
            }
            return atr;
        }

        let initialSum = 0;
        for (let i = 0; i < period; i++) {
            initialSum += trueRanges[i];
            atr[i] = initialSum / (i + 1);
        }
        atr[period - 1] = initialSum / period;

        for (let i = period; i < count; i++) {
            atr[i] = (atr[i - 1] * (period - 1) + trueRanges[i]) / period;
        }

        return atr;
    }

    function deduplicateSwings(swings) {
        if (swings.length <= 1) return swings;

        const result = [swings[0]];

        for (let i = 1; i < swings.length; i++) {
            const current = swings[i];
            const last = result[result.length - 1];

            if (current.type === last.type) {
                if (current.type === 'low' && current.price < last.price) {
                    result[result.length - 1] = current;
                } else if (current.type === 'high' && current.price > last.price) {
                    result[result.length - 1] = current;
                }
            } else {
                result.push(current);
            }
        }

        return result;
    }

    function detectSwingPoints(candles, strength) {
        const swings = [];
        const count = candles.length;

        for (let i = strength; i < count - strength; i++) {
            const candle = candles[i];
            let isSwingLow = true;

            for (let j = i - strength; j <= i + strength; j++) {
                if (j === i) continue;
                if (candles[j].close <= candle.close) {
                    isSwingLow = false;
                    break;
                }
            }

            let isSwingHigh = true;
            for (let j = i - strength; j <= i + strength; j++) {
                if (j === i) continue;
                if (candles[j].close >= candle.close) {
                    isSwingHigh = false;
                    break;
                }
            }

            if (isSwingLow) {
                swings.push({
                    id: uid(),
                    type: 'low',
                    price: candle.low,
                    time: candle.time,
                    label: 'L',
                    candleIndex: i,
                });
            } else if (isSwingHigh) {
                swings.push({
                    id: uid(),
                    type: 'high',
                    price: candle.high,
                    time: candle.time,
                    label: 'H',
                    candleIndex: i,
                });
            }
        }

        return deduplicateSwings(swings);
    }

    function filterSwingsByAtr(swings, atrValues, minSegmentAtr) {
        if (swings.length <= 2 || minSegmentAtr <= 0) return swings;

        const result = [swings[0]];

        for (let i = 1; i < swings.length; i++) {
            const current = swings[i];
            const previous = result[result.length - 1];
            const atrAtSwing = atrValues[current.candleIndex]
                ?? atrValues[atrValues.length - 1]
                ?? 0;

            if (atrAtSwing <= 0) {
                result.push(current);
                continue;
            }

            const distance = Math.abs(current.price - previous.price);
            if (distance >= atrAtSwing * minSegmentAtr) {
                result.push(current);
            }
        }

        return result;
    }

    function collectSwingPoints(candles, timeframe, config, atrValues) {
        const strength = config.swingStrength || getDefaultSwingStrength(timeframe);
        const rawSwings = detectSwingPoints(candles, strength);
        const filteredSwings = filterSwingsByAtr(
            rawSwings,
            atrValues,
            config.minSegmentAtr
        );
        return filteredSwings.slice(-config.maxSwingPoints);
    }

    // Presentation helper: detectTrend intentionally returns an empty result until
    // ten candles and three filtered swings exist. The TradingView adapter uses this
    // helper to draw each pivot as soon as its right-side confirmation bars exist,
    // without changing detectTrend's upstream result contract.
    function getFilteredSwingPoints(candles, timeframe, config) {
        if (candles.length > MAX_CANDLES) candles = candles.slice(-MAX_CANDLES);

        const atrValues = computeATR(candles, ATR_PERIOD);
        const swings = collectSwingPoints(candles, timeframe, config, atrValues);
        labelSwingPoints(swings);
        return swings;
    }

    function buildSegments(swings, instrument) {
        const segments = [];

        for (let i = 0; i < swings.length - 1; i++) {
            const from = swings[i];
            const to = swings[i + 1];
            const direction = to.price > from.price ? 'up' : 'down';

            segments.push({
                id: uid(),
                from,
                to,
                direction,
                rangePips: priceToPips(instrument, Math.abs(to.price - from.price)),
                candleCount: Math.abs(to.candleIndex - from.candleIndex),
                isBreakout: false,
            });
        }

        return segments;
    }

    function checkUptrend(lows, highs, currentPrice, terminationBuffer) {
        if (lows.length < 2 || highs.length < 2) return null;

        const previousLow = lows[lows.length - 2];
        const lastLow = lows[lows.length - 1];
        if (lastLow.price <= previousLow.price) return null;

        const previousHigh = highs[highs.length - 2];
        const lastHigh = highs[highs.length - 1];
        if (lastHigh.price <= previousHigh.price) return null;
        if (lastLow.time <= previousHigh.time) return null;

        if (currentPrice < lastLow.price - terminationBuffer) {
            return {
                direction: 'up',
                status: 'terminated',
                controllingSwing: lastLow,
            };
        }

        return {
            direction: 'up',
            status: 'confirmed',
            controllingSwing: lastLow,
        };
    }

    function checkDowntrend(lows, highs, currentPrice, terminationBuffer) {
        if (lows.length < 2 || highs.length < 2) return null;

        const previousHigh = highs[highs.length - 2];
        const lastHigh = highs[highs.length - 1];
        if (lastHigh.price >= previousHigh.price) return null;

        const previousLow = lows[lows.length - 2];
        const lastLow = lows[lows.length - 1];
        if (lastLow.price >= previousLow.price) return null;
        if (lastHigh.time <= previousLow.time) return null;

        if (currentPrice > lastHigh.price + terminationBuffer) {
            return {
                direction: 'down',
                status: 'terminated',
                controllingSwing: lastHigh,
            };
        }

        return {
            direction: 'down',
            status: 'confirmed',
            controllingSwing: lastHigh,
        };
    }

    function identifyTrend(swings, currentPrice, terminationBuffer) {
        if (swings.length < 4) {
            return { direction: null, status: 'forming', controllingSwing: null };
        }

        const recentLows = [];
        const recentHighs = [];

        for (
            let i = swings.length - 1;
            i >= 0 && (recentLows.length < 3 || recentHighs.length < 3);
            i--
        ) {
            const swing = swings[i];
            if (swing.type === 'low' && recentLows.length < 3) {
                recentLows.unshift(swing);
            }
            if (swing.type === 'high' && recentHighs.length < 3) {
                recentHighs.unshift(swing);
            }
        }

        const uptrend = checkUptrend(
            recentLows,
            recentHighs,
            currentPrice,
            terminationBuffer
        );
        if (uptrend) return uptrend;

        const downtrend = checkDowntrend(
            recentLows,
            recentHighs,
            currentPrice,
            terminationBuffer
        );
        if (downtrend) return downtrend;

        return { direction: null, status: 'forming', controllingSwing: null };
    }

    function labelSwingPoints(swings) {
        let lastHigh = null;
        let lastLow = null;

        for (const swing of swings) {
            if (swing.type === 'high') {
                swing.label = lastHigh
                    ? (swing.price > lastHigh.price ? 'HH' : 'LH')
                    : 'H';
                lastHigh = swing;
            } else {
                swing.label = lastLow
                    ? (swing.price > lastLow.price ? 'HL' : 'LL')
                    : 'L';
                lastLow = swing;
            }
        }
    }

    function markBreakoutSegment(segments, swings, direction) {
        if (!direction || segments.length < 3) return;

        const targetLabel = direction === 'up' ? 'HH' : 'LL';
        const breakoutSwing = swings.find((swing) => swing.label === targetLabel);
        if (!breakoutSwing) return;

        const breakoutSegment = segments.find(
            (segment) => segment.to.id === breakoutSwing.id
        );
        if (breakoutSegment) breakoutSegment.isBreakout = true;
    }

    function emptyTrend(instrument, timeframe, currentPrice, candlesAnalyzed) {
        return {
            instrument,
            timeframe,
            direction: null,
            status: 'forming',
            swingPoints: [],
            segments: [],
            controllingSwing: null,
            controllingSwingDistancePips: null,
            currentPrice,
            candlesAnalyzed,
            computedAt: new Date().toISOString(),
        };
    }

    function detectTrend(candles, instrument, timeframe, config, currentPrice) {
        if (candles.length > MAX_CANDLES) {
            console.warn(
                `[detectTrend] Input has ${candles.length} candles, exceeding ` +
                `MAX_CANDLES (${MAX_CANDLES}). Slicing to most recent ${MAX_CANDLES}.`
            );
            candles = candles.slice(-MAX_CANDLES);
        }

        const count = candles.length;
        if (count < 10) {
            return emptyTrend(instrument, timeframe, currentPrice, count);
        }

        const atrValues = computeATR(candles, ATR_PERIOD);
        const currentAtr = atrValues[atrValues.length - 1] ?? 0;
        const swings = collectSwingPoints(candles, timeframe, config, atrValues);

        if (swings.length < 3) {
            return emptyTrend(instrument, timeframe, currentPrice, count);
        }

        const segments = buildSegments(swings, instrument);

        if (swings.length >= 2) {
            const lastSwing = swings[swings.length - 1];
            const lastCandle = candles[count - 1];
            const trailingDirection = currentPrice > lastSwing.price ? 'up' : 'down';
            const trailingDistance = Math.abs(currentPrice - lastSwing.price);

            if (currentAtr > 0 && trailingDistance > currentAtr * 0.2) {
                const nowPoint = {
                    id: uid(),
                    type: trailingDirection === 'up' ? 'high' : 'low',
                    price: currentPrice,
                    time: lastCandle.time,
                    label: 'H',
                    candleIndex: count - 1,
                };

                segments.push({
                    id: uid(),
                    from: lastSwing,
                    to: nowPoint,
                    direction: trailingDirection,
                    rangePips: priceToPips(instrument, trailingDistance),
                    candleCount: Math.abs(count - 1 - lastSwing.candleIndex),
                    isBreakout: false,
                });
            }
        }

        const trend = identifyTrend(swings, currentPrice, currentAtr * 0.25);
        labelSwingPoints(swings);
        markBreakoutSegment(segments, swings, trend.direction);

        const controllingSwingDistancePips = trend.controllingSwing
            ? priceToPips(
                instrument,
                Math.abs(currentPrice - trend.controllingSwing.price)
            )
            : null;

        return {
            instrument,
            timeframe,
            direction: trend.direction,
            status: trend.status,
            swingPoints: swings,
            segments,
            controllingSwing: trend.controllingSwing,
            controllingSwingDistancePips,
            currentPrice,
            candlesAnalyzed: count,
            computedAt: new Date().toISOString(),
        };
    }

    root.ForexFlowTrendCore = Object.freeze({
        sourceRevision: '7c60bbf5a4ae59150bd3bc425a06a4934cdd0af0',
        maxCandles: MAX_CANDLES,
        defaultConfig: DEFAULT_CONFIG,
        getDefaultConfig,
        getDefaultSwingStrength,
        computeATR,
        detectSwingPoints,
        getFilteredSwingPoints,
        detectTrend,
    });
})(typeof window !== 'undefined' ? window : globalThis);
