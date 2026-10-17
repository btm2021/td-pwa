// Port 1:1 các indicator đang dùng trên chart, chạy trên mảng nến đã đóng.

export function loadCsv(text) {
    const lines = text.trim().split('\n').slice(1);
    const n = lines.length;
    const t = new Float64Array(n), o = new Float64Array(n), h = new Float64Array(n),
        l = new Float64Array(n), c = new Float64Array(n), v = new Float64Array(n);
    lines.forEach((line, i) => {
        const p = line.split(',');
        t[i] = +p[0]; o[i] = +p[1]; h[i] = +p[2]; l[i] = +p[3]; c[i] = +p[4]; v[i] = +p[5];
    });
    return { n, t, o, h, l, c, v };
}

export function source(bars, type) {
    const { n, o, h, l, c } = bars;
    const out = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        switch (type) {
            case 'open': out[i] = o[i]; break;
            case 'high': out[i] = h[i]; break;
            case 'low': out[i] = l[i]; break;
            case 'hl2': out[i] = (h[i] + l[i]) / 2; break;
            case 'hlc3': out[i] = (h[i] + l[i] + c[i]) / 3; break;
            case 'ohlc4': out[i] = (o[i] + h[i] + l[i] + c[i]) / 4; break;
            default: out[i] = c[i];
        }
    }
    return out;
}

export function trueRange(bars) {
    const { n, h, l, c } = bars;
    const tr = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        tr[i] = i === 0 ? h[i] - l[i]
            : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1]));
    }
    return tr;
}

export function ema(src, len) {
    const out = new Float64Array(src.length);
    const a = 2 / (len + 1);
    for (let i = 0; i < src.length; i++) out[i] = i === 0 ? src[i] : a * src[i] + (1 - a) * out[i - 1];
    return out;
}

export function rma(src, len) {
    const out = new Float64Array(src.length);
    for (let i = 0; i < src.length; i++) out[i] = i === 0 ? src[i] : (out[i - 1] * (len - 1) + src[i]) / len;
    return out;
}

// VIDYA đúng như atr-bot.js: alpha = 2/(len+1) * |CMO|, CMO trên `len` diff gần nhất
export function vidya(src, len) {
    const n = src.length;
    const out = new Float64Array(n);
    const base = 2 / (len + 1);
    for (let i = 0; i < n; i++) {
        const start = Math.max(1, i - len + 1);
        let up = 0, dn = 0;
        for (let j = start; j <= i; j++) {
            const d = src[j] - src[j - 1];
            if (d > 0) up += d; else dn -= d;
        }
        const tot = up + dn;
        const cmo = tot > 0 ? Math.abs((up - dn) / tot) : 0;
        out[i] = i === 0 ? src[i] : base * cmo * src[i] + (1 - base * cmo) * out[i - 1];
    }
    return out;
}

/**
 * ATR Bot (chart/custom_studies/atr-bot.js)
 * trail1 = MA(src), trail2 = ATR trailing line quanh trail1.
 * state: +1 khi trail1 > trail2 (xanh), -1 khi ngược lại (đỏ).
 */
export function atrBot(bars, { atrLen = 14, mult = 2, src = 'hlc3', ma = 'VIDYA', maLen = 14 } = {}) {
    const s = source(bars, src);
    const trail1 = ma === 'VIDYA' ? vidya(s, maLen) : ema(s, maLen);
    const atr = rma(trueRange(bars), atrLen);
    const n = bars.n;
    const trail2 = new Float64Array(n);
    const state = new Int8Array(n);
    for (let i = 0; i < n; i++) {
        const t1 = trail1[i];
        const t1p = i === 0 ? t1 : trail1[i - 1];
        const t2p = i === 0 ? 0 : trail2[i - 1];
        const sl = atr[i] * mult;
        let t2;
        if (t1 > t2p) t2 = t1p > t2p ? Math.max(t2p, t1 - sl) : t1 - sl;
        else t2 = t1 < t2p && t1p < t2p ? Math.min(t2p, t1 + sl) : t1 + sl;
        trail2[i] = t2;
        state[i] = t1 > t2 ? 1 : -1;
    }
    return { trail1, trail2, state, atr };
}

// Anchored VWAP, nguồn hlc3. anchor: 'day' (00:00 UTC) | 'week' (Thứ Hai 00:00 UTC)
export function vwap(bars, anchor = 'day') {
    const { n, t, h, l, c, v } = bars;
    const out = new Float64Array(n);
    const DAY = 86400000;
    // 1970-01-01 là Thứ Năm -> dịch 3 ngày để tuần bắt đầu Thứ Hai
    const period = (ms) => anchor === 'week' ? Math.floor((ms / DAY + 3) / 7) : Math.floor(ms / DAY);
    let pv = 0, vv = 0, cur = -1;
    for (let i = 0; i < n; i++) {
        const p = period(t[i]);
        if (p !== cur) { pv = 0; vv = 0; cur = p; }
        const tp = (h[i] + l[i] + c[i]) / 3;
        pv += tp * v[i]; vv += v[i];
        out[i] = vv > 0 ? pv / vv : tp;
    }
    return out;
}

// Keltner Channels (built-in TV): basis = EMA(close, len), range = EMA(TR hoặc H-L, len)
export function keltner(bars, { len = 9, mult = 0.5, useTR = true } = {}) {
    const basis = ema(bars.c, len);
    const rng = useTR ? trueRange(bars) : bars.h.map((x, i) => x - bars.l[i]);
    const rngEma = ema(rng, len);
    const n = bars.n;
    const upper = new Float64Array(n), lower = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        upper[i] = basis[i] + mult * rngEma[i];
        lower[i] = basis[i] - mult * rngEma[i];
    }
    return { basis, upper, lower };
}

// Gộp nến 15m thành khung lớn hơn k lần (k=4 -> 1h). Bỏ bucket chưa đủ nến ở cuối.
export function resample(bars, k) {
    const step = (bars.t[1] - bars.t[0]) * k;
    const rows = [];
    for (let i = 0; i < bars.n; i++) {
        const b = Math.floor(bars.t[i] / step) * step;
        const last = rows[rows.length - 1];
        if (!last || last.t !== b) rows.push({ t: b, o: bars.o[i], h: bars.h[i], l: bars.l[i], c: bars.c[i], v: bars.v[i], cnt: 1 });
        else { last.h = Math.max(last.h, bars.h[i]); last.l = Math.min(last.l, bars.l[i]); last.c = bars.c[i]; last.v += bars.v[i]; last.cnt++; }
    }
    if (rows.length && rows[rows.length - 1].cnt < k) rows.pop();
    const col = (key) => Float64Array.from(rows, (r) => r[key]);
    return { n: rows.length, t: col('t'), o: col('o'), h: col('h'), l: col('l'), c: col('c'), v: col('v') };
}
