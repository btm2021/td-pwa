export const calcEMA = (data, p) => {
    const k = 2 / (p + 1);
    let r = [], pv = data[0].close;
    data.forEach(d => {
        const v = (d.close - pv) * k + pv;
        r.push(v);
        pv = v;
    });
    return r;
};

export const calcATR = (data, p) => {
    let tr = data.map((d, i) => i === 0 ? d.high - d.low : Math.max(d.high - d.low, Math.abs(d.high - data[i - 1].close), Math.abs(d.low - data[i - 1].close)));
    let r = new Array(data.length).fill(null), s = 0;
    tr.forEach((t, i) => {
        s += t;
        if (i >= p) s -= tr[i - p];
        if (i >= p - 1) r[i] = s / p;
    });
    return r;
};

export const calcATRBot = (data, ema, atr, m) => {
    let r = new Array(data.length).fill(null), pt = ema[0];
    let st = atr.findIndex(v => v !== null);
    if (st === -1) return r;
    for (let i = st; i < data.length; i++) {
        const t1 = ema[i], sl = (atr[i] || 0) * m, pt1 = i > 0 ? ema[i - 1] : t1;
        const d = t1 > pt ? t1 - sl : t1 + sl;
        const f = (t1 < pt && pt1 < pt) ? Math.min(pt, t1 + sl) : d;
        const t2 = (t1 > pt && pt1 > pt) ? Math.max(pt, t1 - sl) : f;
        r[i] = t2;
        pt = t2;
    }
    return r;
};

export const calcVSR = (data, l, t) => {
    let c = [0];
    for (let i = 1; i < data.length; i++) c.push(data[i].volume / data[i - 1].volume - 1);
    let sd = c.map((_, i) => {
        if (i < l) return 0;
        const sl = c.slice(i - l + 1, i + 1), av = sl.reduce((a, b) => a + b) / l;
        return Math.sqrt(sl.reduce((a, b) => a + Math.pow(b - av, 2), 0) / l);
    });
    let up = new Array(data.length).fill(null), lo = new Array(data.length).fill(null), bg = new Array(data.length).fill(false);
    let lu = null, ll = null;
    for (let i = 1; i < data.length; i++) {
        if (sd[i - 1] !== 0 && Math.abs(c[i] / sd[i - 1]) > t) {
            lu = Math.max(data[i - 1].high, data[i - 1].close);
            ll = Math.min(data[i - 1].low, data[i - 1].close);
            bg[i] = true;
        }
        up[i] = lu; lo[i] = ll;
    }
    return { up, lo, beg: bg };
};

export const calcVWAP = (data) => {
    let cumPV = 0, cumV = 0, r = [];
    let lastDate = null;
    data.forEach(d => {
        const date = new Date(d.time * 1000).getUTCDate();
        if (date !== lastDate) { cumPV = 0; cumV = 0; lastDate = date; }
        const hlc3 = (d.high + d.low + d.close) / 3;
        cumPV += hlc3 * d.volume;
        cumV += d.volume;
        r.push(cumV === 0 ? hlc3 : cumPV / cumV);
    });
    return r;
};

/**
 * calcZigZag - Nối đỉnh/đáy tại các điểm giao cắt ATRBot
 * - Bearish cross → HIGH của nến giao cắt
 * - Bullish cross → LOW của nến giao cắt
 */
export const calcZigZag = (data, botatr) => {
    let pivots = [];

    for (let i = 1; i < data.length; i++) {
        if (botatr[i] === null || botatr[i - 1] === null) continue;

        const prevAbove = data[i - 1].close > botatr[i - 1];
        const currAbove = data[i].close > botatr[i];

        // Crossover detected
        if (prevAbove !== currAbove) {
            // Bearish cross → HIGH, Bullish cross → LOW
            const type = currAbove ? 'low' : 'high';
            const value = currAbove ? data[i].low : data[i].high;

            pivots.push({ time: data[i].time, value, type });
        }
    }

    return pivots;
};

/**
 * calcAdaptiveZigZag - Adaptive Robust ZigZag using State-Space & ATR Normalization
 * @param {Array} data - Array of OHLCV candles [{ time, open, high, low, close, volume }]
 * @param {Object} options - { atrPeriod: 14, atrMultiplier: 2.0, modelPeriod: 20 }
 * @returns {Object} { pivots: Array, zigzagSeries: Array, levels: { swingHigh, swingLow } }
 */
export const calcAdaptiveZigZag = (data, options = {}) => {
    const atrPeriod = options.atrPeriod || 14;
    const atrMultiplier = options.atrMultiplier || 2.0;
    const modelPeriod = options.modelPeriod || 20;

    const alpha = 2 / (modelPeriod + 1);
    const beta = 0.5 * alpha;

    let prevClose = NaN;
    let prevAtr = NaN;
    let prevLevel = NaN;
    let prevVelocity = 0;
    let prevUncertainty = 0;
    let prevEvidence = 0;
    let prevTrail = NaN;
    let prevDirection = 0;
    let prevBias = 0;

    let legExtremumPrice = NaN;
    let legExtremumIdx = -1;
    let lastConfirmedHigh = NaN;
    let lastConfirmedLow = NaN;

    const pivots = [];
    const zigzagSeries = new Array(data.length).fill(null);

    for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const high = d.high;
        const low = d.low;
        const close = d.close;

        // 1. ATR
        const tr = isNaN(prevClose) ? high - low : Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
        const atr = isNaN(prevAtr) ? tr : (prevAtr * (atrPeriod - 1) + tr) / atrPeriod;

        // 2. State-Space
        const predictedLevel = isNaN(prevLevel) ? close : prevLevel + prevVelocity;
        const innovation = close - predictedLevel;
        const scale = Math.max(atr, prevUncertainty, Math.abs(close) * 1e-9, 1e-12);
        const robustInnovation = scale * Math.tanh(innovation / scale);

        const level = predictedLevel + alpha * robustInnovation;
        const velocity = (1 - 0.25 * alpha) * prevVelocity + beta * robustInnovation;
        const uncertainty = (1 - alpha) * prevUncertainty + alpha * Math.abs(innovation);

        // 3. Evidence
        const safeAtr = Math.max(atr, Math.abs(close) * 1e-9, 1e-12);
        const velocityEvidence = Math.tanh(3 * velocity / safeAtr);
        const evidence = (1 - alpha) * prevEvidence + alpha * velocityEvidence;

        // 4. Direction & Hysteresis
        let direction = prevDirection;
        if (direction === 0) {
            if (evidence >= 0.28) direction = 1;
            else if (evidence <= -0.28) direction = -1;
        } else if (direction === 1) {
            if (evidence <= -0.28) direction = -1;
            else if (evidence < 0.08) direction = 0;
        } else {
            if (evidence >= 0.28) direction = 1;
            else if (evidence > -0.08) direction = 0;
        }

        let bias = direction !== 0 ? direction : prevBias;
        if (bias === 0) bias = evidence < 0 ? -1 : 1;
        if (direction === 0) {
            if (evidence >= 0.08) bias = 1;
            else if (evidence <= -0.08) bias = -1;
        }

        // 5. Adaptive Trail Distance
        const trail1 = level + velocity;
        const uncertaintyRatio = uncertainty / (safeAtr + uncertainty);
        const adaptiveDistance = atr * atrMultiplier * (1 + 0.6 * uncertaintyRatio);

        let trail2;
        if (bias === 1) {
            const candidate = Math.min(trail1 - adaptiveDistance, close - 0.25 * atr);
            const canRatchet = prevBias === 1 && !isNaN(prevTrail) && prevTrail < close;
            trail2 = canRatchet ? Math.max(prevTrail, candidate) : candidate;
        } else {
            const candidate = Math.max(trail1 + adaptiveDistance, close + 0.25 * atr);
            const canRatchet = prevBias === -1 && !isNaN(prevTrail) && prevTrail > close;
            trail2 = canRatchet ? Math.min(prevTrail, candidate) : candidate;
        }

        // 6. Swing Pivot Locking & Level Rays
        if (isNaN(legExtremumPrice)) {
            legExtremumPrice = bias === 1 ? high : low;
            legExtremumIdx = i;
        }

        if (bias === 1 && prevBias === -1) {
            // Flipped to Bull -> Confirmed Swing Low!
            const swingLowPrice = legExtremumPrice;
            const swingLowIdx = legExtremumIdx;
            const label = isNaN(lastConfirmedLow) || swingLowPrice >= lastConfirmedLow ? 'HL' : 'LL';

            pivots.push({
                index: swingLowIdx,
                time: data[swingLowIdx].time,
                price: swingLowPrice,
                type: 'low',
                label
            });
            zigzagSeries[swingLowIdx] = swingLowPrice;

            lastConfirmedLow = swingLowPrice;
            legExtremumPrice = high;
            legExtremumIdx = i;
        } else if (bias === -1 && prevBias === 1) {
            // Flipped to Bear -> Confirmed Swing High!
            const swingHighPrice = legExtremumPrice;
            const swingHighIdx = legExtremumIdx;
            const label = isNaN(lastConfirmedHigh) || swingHighPrice >= lastConfirmedHigh ? 'HH' : 'LH';

            pivots.push({
                index: swingHighIdx,
                time: data[swingHighIdx].time,
                price: swingHighPrice,
                type: 'high',
                label
            });
            zigzagSeries[swingHighIdx] = swingHighPrice;

            lastConfirmedHigh = swingHighPrice;
            legExtremumPrice = low;
            legExtremumIdx = i;
        } else {
            if (bias === 1) {
                if (high >= legExtremumPrice) {
                    legExtremumPrice = high;
                    legExtremumIdx = i;
                }
            } else {
                if (low <= legExtremumPrice) {
                    legExtremumPrice = low;
                    legExtremumIdx = i;
                }
            }
        }

        prevClose = close;
        prevAtr = atr;
        prevLevel = level;
        prevVelocity = velocity;
        prevUncertainty = uncertainty;
        prevEvidence = evidence;
        prevTrail = trail2;
        prevDirection = direction;
        prevBias = bias;
    }

    // Compute Ray Extension from each pivot until touched/mitigated
    const levelRays = pivots.map((p, idx) => {
        let endIndex = data.length - 1;
        let touched = false;

        for (let j = p.index + 1; j < data.length; j++) {
            if (p.type === 'high' && data[j].high >= p.price) {
                endIndex = j;
                touched = true;
                break;
            } else if (p.type === 'low' && data[j].low <= p.price) {
                endIndex = j;
                touched = true;
                break;
            }
        }

        return {
            pivotIndex: p.index,
            startIndex: p.index,
            endIndex: endIndex,
            startTime: p.time,
            endTime: data[endIndex] ? data[endIndex].time : p.time,
            price: p.price,
            type: p.type,
            label: p.label,
            touched
        };
    });

    return {
        pivots,
        zigzagSeries,
        levelRays,
        lastConfirmedHigh,
        lastConfirmedLow
    };
};


