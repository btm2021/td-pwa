/*
 * ForexFlow Supply/Demand calculation core.
 *
 * Adapted from the ForexFlow zone detector at commit
 * 7c60bbf5a4ae59150bd3bc425a06a4934cdd0af0:
 * https://github.com/bmarshall511/forexflow
 *
 * Upstream and this adapted file are licensed under the GNU Affero General
 * Public License v3.0 (AGPL-3.0-only). This software is provided without
 * warranty. See the upstream LICENSE for the full license text.
 *
 * SPDX-License-Identifier: AGPL-3.0-only
 */

(function registerForexFlowSupplyDemandCore(root) {
    'use strict';

    const MAX_CANDLES = 500;
    const MIN_DISPLACEMENT_ATR = 1.5;

    const PRESETS = Object.freeze({
        conservative: Object.freeze({
            preset: 'conservative',
            minLegBodyRatio: 0.65,
            minLegBodyAtr: 1.8,
            maxBaseBodyRatio: 0.3,
            maxBaseCandles: 3,
            minMoveOutMultiple: 3.0,
            atrPeriod: 14,
            freshTestedThreshold: 0.3,
            freshInvalidatedThreshold: 1.0,
            minLegCandles: 1,
        }),
        standard: Object.freeze({
            preset: 'standard',
            minLegBodyRatio: 0.45,
            minLegBodyAtr: 1.0,
            maxBaseBodyRatio: 0.4,
            maxBaseCandles: 4,
            minMoveOutMultiple: 2.0,
            atrPeriod: 14,
            freshTestedThreshold: 0.3,
            freshInvalidatedThreshold: 1.0,
            minLegCandles: 1,
        }),
        aggressive: Object.freeze({
            preset: 'aggressive',
            minLegBodyRatio: 0.4,
            minLegBodyAtr: 0.8,
            maxBaseBodyRatio: 0.5,
            maxBaseCandles: 6,
            minMoveOutMultiple: 1.5,
            atrPeriod: 14,
            freshTestedThreshold: 0.4,
            freshInvalidatedThreshold: 1.0,
            minLegCandles: 1,
        }),
    });

    function getPresetConfig(name) {
        const key = String(name || 'standard').toLowerCase();
        return { ...(PRESETS[key] || PRESETS.standard) };
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

    function classifyCandles(candles, config) {
        const atrValues = computeATR(candles, config.atrPeriod);

        return candles.map((candle, index) => {
            const bodySize = Math.abs(candle.close - candle.open);
            const range = candle.high - candle.low;
            const bodyRatio = range > 0 ? bodySize / range : 0;
            const bodyVsAtr = atrValues[index] > 0 ? bodySize / atrValues[index] : 0;
            let classification = 'neutral';

            if (
                bodyRatio >= config.minLegBodyRatio &&
                bodyVsAtr >= config.minLegBodyAtr
            ) {
                classification = 'leg';
            } else if (
                bodyRatio <= config.maxBaseBodyRatio &&
                bodyVsAtr < config.minLegBodyAtr * 0.8
            ) {
                classification = 'base';
            }

            return {
                ...candle,
                classification,
                bodySize,
                range,
                bodyRatio,
                bodyVsAtr,
                isBullish: candle.close >= candle.open,
            };
        });
    }

    function detectExplosiveMove(candles, startIndex, direction, minimumLegCandles) {
        let lastLegIndex = -1;
        let legCount = 0;
        let gapCount = 0;

        for (let i = startIndex; i < candles.length; i++) {
            const candle = candles[i];
            const isLeg = candle.classification === 'leg';
            const correctDirection = direction === 'up' ? candle.isBullish : !candle.isBullish;

            if (i === startIndex) {
                if (!isLeg || !correctDirection) break;
                legCount++;
                lastLegIndex = i;
                continue;
            }

            const previousClose = candles[i - 1].close;
            const closesInDirection = direction === 'up'
                ? candle.close > previousClose
                : candle.close < previousClose;

            if (!closesInDirection) break;

            if (isLeg && correctDirection) {
                legCount++;
                lastLegIndex = i;
                gapCount = 0;
            } else {
                gapCount++;
                if (gapCount > 1) break;
            }
        }

        return {
            startIndex,
            endIndex: lastLegIndex >= startIndex ? lastLegIndex : startIndex,
            isExplosive: legCount >= minimumLegCandles,
        };
    }

    function findBaseCluster(candles, legOutIndex, maximumBaseCandles) {
        const baseCandles = [];
        let baseStartIndex = legOutIndex - 1;

        for (let i = legOutIndex - 1; i >= 0; i--) {
            const candle = candles[i];
            if (candle.classification !== 'base') {
                baseStartIndex = i + 1;
                break;
            }

            baseCandles.unshift(candle);
            baseStartIndex = i;
            if (baseCandles.length > maximumBaseCandles || i === 0) return null;
        }

        if (baseCandles.length === 0) return null;

        const legInIndex = baseStartIndex - 1;
        if (legInIndex < 0) return null;

        const legIn = candles[legInIndex];
        const validLegIn = legIn.classification === 'leg' ||
            (legIn.bodyVsAtr >= 0.7 && legIn.bodyRatio >= 0.35);

        if (!validLegIn) return null;

        return {
            legInIndex,
            startIndex: baseStartIndex,
            endIndex: legOutIndex - 1,
            candles: baseCandles,
        };
    }

    function determineFormation(legInBullish, legOutBullish) {
        if (!legInBullish && legOutBullish) return { formation: 'DBR', type: 'demand' };
        if (legInBullish && legOutBullish) return { formation: 'RBR', type: 'demand' };
        if (legInBullish && !legOutBullish) return { formation: 'RBD', type: 'supply' };
        return { formation: 'DBD', type: 'supply' };
    }

    function placeLines(type, baseCandles) {
        if (baseCandles.length === 0) return null;

        let proximalLine = type === 'demand' ? -Infinity : Infinity;
        let distalLine = type === 'demand' ? Infinity : -Infinity;

        for (const candle of baseCandles) {
            if (type === 'demand') {
                proximalLine = Math.max(proximalLine, Math.max(candle.open, candle.close));
                distalLine = Math.min(distalLine, candle.low);
            } else {
                proximalLine = Math.min(proximalLine, Math.min(candle.open, candle.close));
                distalLine = Math.max(distalLine, candle.high);
            }
        }

        if (proximalLine === distalLine) return null;
        if (type === 'demand' && proximalLine <= distalLine) return null;
        if (type === 'supply' && proximalLine >= distalLine) return null;
        return { proximalLine, distalLine };
    }

    function computeFreshness(type, proximalLine, distalLine, candles, afterIndex) {
        const width = Math.abs(proximalLine - distalLine);
        if (width === 0) return { testCount: 0, penetrationPercent: 0 };

        let testCount = 0;
        let penetrationPercent = 0;
        let inZone = false;

        for (let i = afterIndex; i < candles.length; i++) {
            const candle = candles[i];
            const entersZone = type === 'demand'
                ? candle.low <= proximalLine
                : candle.high >= proximalLine;

            if (!entersZone) {
                inZone = false;
                continue;
            }

            if (!inZone) {
                testCount++;
                inZone = true;
            }

            const penetration = type === 'demand'
                ? proximalLine - candle.low
                : candle.high - proximalLine;
            penetrationPercent = Math.max(
                penetrationPercent,
                Math.min(penetration / width, 1)
            );
        }

        return { testCount, penetrationPercent };
    }

    function scoreCandidate(zone, candles, opposingZones, config) {
        const width = Math.abs(zone.proximalLine - zone.distalLine);
        let moveOutExtreme = zone.type === 'demand' ? -Infinity : Infinity;

        for (let i = zone.legOutStartIndex; i <= zone.legOutEndIndex; i++) {
            moveOutExtreme = zone.type === 'demand'
                ? Math.max(moveOutExtreme, candles[i].high)
                : Math.min(moveOutExtreme, candles[i].low);
        }

        const moveOutDistance = zone.type === 'demand'
            ? moveOutExtreme - zone.proximalLine
            : zone.proximalLine - moveOutExtreme;
        const moveOutMultiple = width > 0 ? moveOutDistance / width : 0;
        const moveOutScore = moveOutMultiple >= config.minMoveOutMultiple ? 1 : 0;

        let breakoutScore = 0;
        for (const opposing of opposingZones) {
            if (opposing.baseEndIndex >= zone.baseStartIndex) continue;
            if (
                zone.type === 'demand' &&
                opposing.type === 'supply' &&
                moveOutExtreme > opposing.proximalLine
            ) {
                breakoutScore = 1;
                break;
            }
            if (
                zone.type === 'supply' &&
                opposing.type === 'demand' &&
                moveOutExtreme < opposing.proximalLine
            ) {
                breakoutScore = 1;
                break;
            }
        }

        const timeScore = zone.baseCandles <= 3 ? 1 : zone.baseCandles <= 6 ? 0.5 : 0;
        const freshness = computeFreshness(
            zone.type,
            zone.proximalLine,
            zone.distalLine,
            candles,
            zone.legOutEndIndex + 1
        );
        const freshnessScore = freshness.testCount === 0
            ? 2
            : freshness.penetrationPercent <= config.freshTestedThreshold ? 1 : 0;
        const strengthScore = moveOutScore + breakoutScore;

        return {
            strength: strengthScore,
            time: timeScore,
            freshness: freshnessScore,
            total: strengthScore + timeScore + freshnessScore,
            testCount: freshness.testCount,
            penetrationPercent: freshness.penetrationPercent,
        };
    }

    function getZoneStatus(type, proximalLine, distalLine, currentPrice) {
        if (type === 'demand') {
            if (currentPrice > proximalLine) return 'active';
            if (currentPrice > distalLine) return 'tested';
            return 'invalidated';
        }

        if (currentPrice < proximalLine) return 'active';
        if (currentPrice < distalLine) return 'tested';
        return 'invalidated';
    }

    function overlapRatio(first, second) {
        const firstLow = Math.min(first.proximalLine, first.distalLine);
        const firstHigh = Math.max(first.proximalLine, first.distalLine);
        const secondLow = Math.min(second.proximalLine, second.distalLine);
        const secondHigh = Math.max(second.proximalLine, second.distalLine);
        const overlapLow = Math.max(firstLow, secondLow);
        const overlapHigh = Math.min(firstHigh, secondHigh);

        if (overlapHigh <= overlapLow) return 0;
        const smallerWidth = Math.min(firstHigh - firstLow, secondHigh - secondLow);
        return smallerWidth > 0 ? (overlapHigh - overlapLow) / smallerWidth : 0;
    }

    function detectZones(inputCandles, config, currentPrice) {
        const candles = inputCandles.length > MAX_CANDLES
            ? inputCandles.slice(-MAX_CANDLES)
            : inputCandles;

        if (candles.length < config.atrPeriod + 3) return [];

        const classified = classifyCandles(candles, config);
        const atrValues = computeATR(candles, config.atrPeriod);
        const rawCandidates = [];
        const usedIndices = new Set();

        const tryAddCandidate = (move, base, direction) => {
            const legIn = classified[base.legInIndex];
            const formation = determineFormation(legIn.isBullish, direction === 'up');
            const lines = placeLines(formation.type, base.candles);
            if (!lines) return false;

            const localAtr = atrValues[base.endIndex] ?? atrValues[atrValues.length - 1] ?? 0;
            const width = Math.abs(lines.proximalLine - lines.distalLine);
            if (localAtr > 0 && width > localAtr * 1.5) return false;
            if (formation.type === 'demand' && currentPrice < lines.distalLine) return false;
            if (formation.type === 'supply' && currentPrice > lines.distalLine) return false;

            for (let i = base.legInIndex; i <= move.endIndex; i++) usedIndices.add(i);

            rawCandidates.push({
                type: formation.type,
                formation: formation.formation,
                proximalLine: lines.proximalLine,
                distalLine: lines.distalLine,
                baseStartIndex: base.startIndex,
                baseEndIndex: base.endIndex,
                baseCandles: base.candles.length,
                legOutStartIndex: move.startIndex,
                legOutEndIndex: move.endIndex,
                legInIndex: base.legInIndex,
            });
            return true;
        };

        for (let i = classified.length - 1; i >= config.atrPeriod + 2; i--) {
            if (usedIndices.has(i)) continue;
            const candle = classified[i];
            if (candle.classification !== 'leg') continue;

            const direction = candle.isBullish ? 'up' : 'down';
            const move = detectExplosiveMove(classified, i, direction, config.minLegCandles);
            if (!move.isExplosive) continue;

            const base = findBaseCluster(classified, move.startIndex, config.maxBaseCandles);
            if (base) tryAddCandidate(move, base, direction);
        }

        for (let i = config.atrPeriod + 1; i < classified.length - 2; i++) {
            if (usedIndices.has(i) || classified[i].classification !== 'base') continue;

            let clusterEnd = i;
            for (
                let j = i + 1;
                j < classified.length && clusterEnd - i + 1 < config.maxBaseCandles;
                j++
            ) {
                if (usedIndices.has(j) || classified[j].classification !== 'base') break;
                clusterEnd = j;
            }

            const baseLength = clusterEnd - i + 1;
            if (baseLength > config.maxBaseCandles) {
                i = clusterEnd;
                continue;
            }

            const legInIndex = i - 1;
            if (legInIndex < config.atrPeriod || usedIndices.has(legInIndex)) continue;
            const legIn = classified[legInIndex];
            if (legIn.bodyVsAtr < 0.5 || legIn.bodyRatio < 0.3) continue;

            const legOutStart = clusterEnd + 1;
            if (legOutStart >= classified.length) continue;

            const localAtr = atrValues[clusterEnd] ?? atrValues[atrValues.length - 1] ?? 0;
            if (localAtr === 0) continue;

            const baseCandles = classified.slice(i, clusterEnd + 1);
            const baseHigh = Math.max(...baseCandles.map((candle) => candle.high));
            const baseLow = Math.min(...baseCandles.map((candle) => candle.low));
            let maximumUp = 0;
            let maximumDown = 0;
            let upEndIndex = legOutStart;
            let downEndIndex = legOutStart;

            for (let j = legOutStart; j < Math.min(legOutStart + 5, classified.length); j++) {
                if (usedIndices.has(j)) break;
                const displacement = classified[j].high - baseHigh;
                if (displacement > maximumUp) {
                    maximumUp = displacement;
                    upEndIndex = j;
                }
            }

            for (let j = legOutStart; j < Math.min(legOutStart + 5, classified.length); j++) {
                if (usedIndices.has(j)) break;
                const displacement = baseLow - classified[j].low;
                if (displacement > maximumDown) {
                    maximumDown = displacement;
                    downEndIndex = j;
                }
            }

            const minimumDisplacement = localAtr * MIN_DISPLACEMENT_ATR;
            const base = {
                legInIndex,
                startIndex: i,
                endIndex: clusterEnd,
                candles: baseCandles,
            };

            if (maximumUp >= minimumDisplacement && maximumUp >= maximumDown) {
                if (tryAddCandidate(
                    { startIndex: legOutStart, endIndex: upEndIndex },
                    base,
                    'up'
                )) {
                    i = clusterEnd;
                    continue;
                }
            }

            if (maximumDown >= minimumDisplacement && maximumDown > maximumUp) {
                if (tryAddCandidate(
                    { startIndex: legOutStart, endIndex: downEndIndex },
                    base,
                    'down'
                )) {
                    i = clusterEnd;
                }
            }
        }

        const demandCandidates = rawCandidates.filter((zone) => zone.type === 'demand');
        const supplyCandidates = rawCandidates.filter((zone) => zone.type === 'supply');
        const zones = rawCandidates.map((candidate) => {
            const opposing = candidate.type === 'demand' ? supplyCandidates : demandCandidates;
            const scores = scoreCandidate(candidate, classified, opposing, config);
            const status = getZoneStatus(
                candidate.type,
                candidate.proximalLine,
                candidate.distalLine,
                currentPrice
            );
            const distanceFromPrice = Math.abs(
                candidate.type === 'demand'
                    ? currentPrice - candidate.proximalLine
                    : candidate.proximalLine - currentPrice
            );
            const startTime = candles[candidate.baseStartIndex].time;
            const endTime = candles[candidate.baseEndIndex].time;

            return {
                ...candidate,
                id: `${candidate.type}_${startTime}_${endTime}`,
                baseStartTime: startTime,
                baseEndTime: endTime,
                scores: {
                    strength: scores.strength,
                    time: scores.time,
                    freshness: scores.freshness,
                    total: scores.total,
                },
                status,
                testCount: scores.testCount,
                penetrationPercent: scores.penetrationPercent,
                ageInCandles: candles.length - 1 - candidate.baseEndIndex,
                distanceFromPrice,
            };
        });

        const sorted = zones.sort((first, second) =>
            second.scores.total - first.scores.total ||
            first.distanceFromPrice - second.distanceFromPrice
        );
        const deduplicated = [];

        for (const zone of sorted) {
            const duplicate = deduplicated.some((accepted) =>
                accepted.type === zone.type && overlapRatio(accepted, zone) > 0.2
            );
            if (!duplicate) deduplicated.push(zone);
        }

        return deduplicated;
    }

    root.ForexFlowSupplyDemandCore = Object.freeze({
        sourceRevision: '7c60bbf5a4ae59150bd3bc425a06a4934cdd0af0',
        maxCandles: MAX_CANDLES,
        presets: PRESETS,
        getPresetConfig,
        computeATR,
        classifyCandles,
        detectZones,
    });
})(typeof window !== 'undefined' ? window : globalThis);
