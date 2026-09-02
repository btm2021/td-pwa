export const calcEMA = (data, p) => {
    if (!data || data.length === 0) return [];
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
    if (!data || data.length === 0) return [];
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
    if (!data || data.length === 0) return [];
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
    if (!data || data.length < 2) return { up: [], lo: [], beg: [] };
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

// ============================================
// ATRBOT ER-ADAPTIVE (VERSION 2 - DUAL BIAS & ENTRY)
// ============================================

export const DEFAULT_BIAS_ATRBOT_ER = {
    params: {
        source: 'close',
        maLen: 55,
        maType: 'VIDYA',
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
    },
    style: {
        showTrail1: false, // Ẩn 2 trail
        showTrail2: false,
        trail1Color: '#00ff88',
        trail1Width: 2,
        trail2Color: '#ff4444',
        trail2Width: 2,
        showFill: true, // Chỉ hiện fill
        fillBullColor: 'rgba(0, 255, 136, 0.12)',
        fillBearColor: 'rgba(255, 68, 68, 0.12)'
    }
};

export const DEFAULT_ENTRY_ATRBOT_ER = {
    params: {
        source: 'close',
        maLen: 21,
        maType: 'VIDYA',
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
    },
    style: {
        showTrail1: true, // Hiện trail xanh
        showTrail2: true, // Hiện trail đỏ
        trail1Color: '#00ff88',
        trail1Width: 2,
        trail2Color: '#ff4444',
        trail2Width: 2,
        showFill: false, // Ẩn fill
        fillBullColor: 'rgba(0, 255, 136, 0.12)',
        fillBearColor: 'rgba(255, 68, 68, 0.12)'
    }
};

export const DEFAULT_DUAL_ATRBOT_CONFIG = {
    bias: DEFAULT_BIAS_ATRBOT_ER,
    entry: DEFAULT_ENTRY_ATRBOT_ER
};

const DUAL_ATRBOT_STORAGE_KEY = 'td_lightweight_atrbot_dual_config';

export function getStoredDualATRBotConfig() {
    try {
        const raw = typeof window !== 'undefined' ? localStorage.getItem(DUAL_ATRBOT_STORAGE_KEY) : null;
        if (raw) {
            const parsed = JSON.parse(raw);
            return {
                bias: {
                    params: { ...DEFAULT_BIAS_ATRBOT_ER.params, ...(parsed.bias?.params || {}) },
                    style: { ...DEFAULT_BIAS_ATRBOT_ER.style, ...(parsed.bias?.style || {}) }
                },
                entry: {
                    params: { ...DEFAULT_ENTRY_ATRBOT_ER.params, ...(parsed.entry?.params || {}) },
                    style: { ...DEFAULT_ENTRY_ATRBOT_ER.style, ...(parsed.entry?.style || {}) }
                }
            };
        }
    } catch (e) {
        console.warn('Error reading stored Dual ATRBot config', e);
    }
    return {
        bias: JSON.parse(JSON.stringify(DEFAULT_BIAS_ATRBOT_ER)),
        entry: JSON.parse(JSON.stringify(DEFAULT_ENTRY_ATRBOT_ER))
    };
}

export function saveStoredDualATRBotConfig(config) {
    try {
        if (typeof window !== 'undefined') {
            localStorage.setItem(DUAL_ATRBOT_STORAGE_KEY, JSON.stringify(config));
        }
    } catch (e) {
        console.warn('Error saving Dual ATRBot config to localStorage', e);
    }
}

// Backward compatibility exports
export const DEFAULT_ATRBOT_ER_PARAMS = DEFAULT_ENTRY_ATRBOT_ER.params;
export const DEFAULT_ATRBOT_ER_STYLE = DEFAULT_ENTRY_ATRBOT_ER.style;
export const getStoredATRBotConfig = getStoredDualATRBotConfig;
export const saveStoredATRBotConfig = saveStoredDualATRBotConfig;

export function hexToRgba(hex, alpha = 0.12) {
    if (!hex) return `rgba(0, 255, 136, ${alpha})`;
    if (hex.startsWith('rgba') || hex.startsWith('hsla')) return hex;
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    if (isNaN(num)) return hex;
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Calculates ATRBot ER-Adaptive (Version 2)
 * Matches PineScript v5 indicator "ATRBot ER-Adaptive"
 */
export function calcATRBotER(data, params = {}) {
    const config = { ...DEFAULT_ATRBOT_ER_PARAMS, ...params };
    const n = data?.length || 0;
    if (n === 0) return { trail1: [], trail2: [], er: [], mult: [], trend: [] };

    const {
        source,
        maLen,
        maType,
        vidyaCmoLen,
        atrLen,
        multBase,
        multMin,
        multMax,
        erLen,
        erSmooth,
        erPower,
        erSlopeGuard,
        erSlopeLen
    } = config;

    // 1. Resolve source series
    const src = new Float64Array(n);
    const vol = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const d = data[i];
        const h = d.high ?? d.close;
        const l = d.low ?? d.close;
        const c = d.close;
        const o = d.open ?? d.close;
        vol[i] = d.volume || 0;

        switch (source) {
            case 'open': src[i] = o; break;
            case 'high': src[i] = h; break;
            case 'low': src[i] = l; break;
            case 'hl2': src[i] = (h + l) / 2; break;
            case 'hlc3': src[i] = (h + l + c) / 3; break;
            case 'ohlc4': src[i] = (o + h + l + c) / 4; break;
            default: src[i] = c; break;
        }
    }

    // 2. MA calculations (Trail1)
    const trail1 = new Float64Array(n);
    const emaAlpha = 2.0 / (maLen + 1);

    if (maType === 'VWMA') {
        let sumPv = 0, sumV = 0;
        for (let i = 0; i < n; i++) {
            sumPv += src[i] * vol[i];
            sumV += vol[i];
            if (i >= maLen) {
                sumPv -= src[i - maLen] * vol[i - maLen];
                sumV -= vol[i - maLen];
            }
            trail1[i] = sumV > 0 ? sumPv / sumV : src[i];
        }
    } else if (maType === 'VIDYA') {
        const alphaBase = 2.0 / (maLen + 1);
        let prevVidya = src[0];
        trail1[0] = prevVidya;

        for (let i = 1; i < n; i++) {
            let sumUp = 0, sumDown = 0;
            const start = Math.max(1, i - vidyaCmoLen + 1);
            for (let j = start; j <= i; j++) {
                const diff = src[j] - src[j - 1];
                if (diff > 0) sumUp += diff;
                else if (diff < 0) sumDown -= diff;
            }
            const totalDiff = sumUp + sumDown;
            const cmoRaw = totalDiff > 0 ? 100.0 * (sumUp - sumDown) / totalDiff : 0.0;
            const cmoNorm = Math.abs(cmoRaw) / 100.0;
            const currVidya = prevVidya + alphaBase * cmoNorm * (src[i] - prevVidya);
            trail1[i] = currVidya;
            prevVidya = currVidya;
        }
    } else {
        // Default EMA
        let prevEma = src[0];
        trail1[0] = prevEma;
        for (let i = 1; i < n; i++) {
            const currEma = prevEma + emaAlpha * (src[i] - prevEma);
            trail1[i] = currEma;
            prevEma = currEma;
        }
    }

    // 3. ATR calculation (Wilder RMA)
    const atr = new Float64Array(n);
    atr[0] = (data[0].high ?? data[0].close) - (data[0].low ?? data[0].close);
    for (let i = 1; i < n; i++) {
        const h = data[i].high ?? data[i].close;
        const l = data[i].low ?? data[i].close;
        const prevC = data[i - 1].close;
        const tr = Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC));
        atr[i] = (atr[i - 1] * (atrLen - 1) + tr) / atrLen;
    }

    // 4. Efficiency Ratio (Kaufman ER) & Smoothed ER
    const erSmoothArr = new Float64Array(n);
    const erAlpha = 2.0 / (erSmooth + 1);
    let prevErSmooth = 0;

    for (let i = 0; i < n; i++) {
        let netChange = 0;
        let pathLen = 0;
        if (i > 0) {
            const lookback = Math.min(i, erLen);
            netChange = Math.abs(src[i] - src[i - lookback]);
            for (let j = i - lookback + 1; j <= i; j++) {
                pathLen += Math.abs(src[j] - src[j - 1]);
            }
        }
        const erRaw = pathLen > 1e-10 ? netChange / pathLen : 0.0;
        const currErSmooth = i === 0 ? erRaw : prevErSmooth + erAlpha * (erRaw - prevErSmooth);
        erSmoothArr[i] = currErSmooth;
        prevErSmooth = currErSmooth;
    }

    // 5. ER Slope Guard & Adaptive Multiplier & Trail 2
    const trail2 = new Float64Array(n);
    const multArr = new Float64Array(n);
    const trend = new Int8Array(n);

    let prevTrail2 = 0;
    let prevTrail1 = trail1[0];

    for (let i = 0; i < n; i++) {
        const currErSmooth = erSmoothArr[i];
        const lookbackIdx = Math.max(0, i - erSlopeLen);
        const erSlope = currErSmooth - erSmoothArr[lookbackIdx];

        const guardActive = erSlopeGuard && (currErSmooth > 0.55) && (erSlope < -0.08);
        const noiseFactor = Math.pow(Math.max(0, 1.0 - currErSmooth), erPower);
        const multEr = multMin + (multMax - multMin) * noiseFactor;
        const multActive = guardActive ? Math.max(multEr, multBase) : multEr;
        multArr[i] = multActive;

        const sl2 = atr[i] * multActive;
        const t1 = trail1[i];

        let t2;
        if (i === 0) {
            t2 = t1 - sl2;
        } else {
            if (t1 > prevTrail2) {
                if (prevTrail1 > prevTrail2 && prevTrail2 > 0) {
                    t2 = Math.max(prevTrail2, t1 - sl2);
                } else {
                    t2 = t1 - sl2;
                }
            } else {
                if (t1 < prevTrail2 && prevTrail1 < prevTrail2 && prevTrail2 > 0) {
                    t2 = Math.min(prevTrail2, t1 + sl2);
                } else {
                    t2 = t1 + sl2;
                }
            }
        }

        trail2[i] = t2;
        trend[i] = t1 > t2 ? 1 : -1;
        prevTrail2 = t2;
        prevTrail1 = t1;
    }

    return {
        trail1: Array.from(trail1),
        trail2: Array.from(trail2),
        er: Array.from(erSmoothArr),
        mult: Array.from(multArr),
        trend: Array.from(trend)
    };
}
