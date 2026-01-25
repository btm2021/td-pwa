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
