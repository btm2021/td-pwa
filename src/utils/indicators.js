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
