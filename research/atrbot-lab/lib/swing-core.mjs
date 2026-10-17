// Lõi dùng chung cho swing.mjs và validate.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadCsv } from "./indicators.mjs";
import { buildFeatures } from "./features.mjs";

export const FEE = { maker: 0.0002, taker: 0.0005 };
export const WARMUP = 700;

// Điểm nhiệt kế: +1 KC trọn phía VWAP phiên, +1 KC trọn phía VWAP tuần, +1 VWAP phiên phía đó so với VWAP tuần (thứ Hai = 0), +1 ATRBot cùng hướng.
// score = điểm(long) - điểm(short)
export function load(sym, tick, dataDir) {
    const bars = loadCsv(readFileSync(join(dataDir, `${sym}_15m_futures.csv`), 'utf8'));
    const f = buildFeatures(bars);
    const n = bars.n;
    const score = new Int8Array(n);
    for (let i = 0; i < n; i++) {
        const mon = new Date(bars.t[i]).getUTCDay() === 1;
        const pts = (s) => (s > 0 ? f.kc.lower[i] > f.dv[i] : f.kc.upper[i] < f.dv[i])
            + (s > 0 ? f.kc.lower[i] > f.wv[i] : f.kc.upper[i] < f.wv[i])
            + (!mon && s * (f.dv[i] - f.wv[i]) > 0)
            + (f.st[i] === s);
        score[i] = pts(1) - pts(-1);
    }
    return { sym, bars, f, score, tick, split: Math.floor(WARMUP + (n - WARMUP) * 0.6) };
}

// Nhìn về trước từ close[i]: +X trước hay -X trước trong H nến
export function bracket(bars, i, H, s, X) {
    const c0 = bars.c[i];
    for (let j = i + 1; j <= Math.min(bars.n - 1, i + H); j++) {
        const adv = s > 0 ? 1 - bars.l[j] / c0 : bars.h[j] / c0 - 1;
        const fav = s > 0 ? bars.h[j] / c0 - 1 : 1 - bars.l[j] / c0;
        if (adv >= X) return -1;
        if (fav >= X) return 1;
    }
    return 0;
}

export function simulate(d, cfg) {
    const { bars, f, score, tick } = d;
    const { o, h, l, n } = bars;
    const { side: s, trig, entry, stopX, rr, maxHold, exitRule, extend } = cfg;
    const trades = [];
    let pos = null, order = null, pendingExit = false;
    const close = (j, px, why, fee) => {
        const gross = s * (px / pos.fill - 1);
        trades.push({ idx: pos.idx, j, net: gross - pos.fee - fee, gross, why, bars: j - pos.idx + 1 });
        pos = null;
    };
    for (let j = WARMUP + 2; j < n; j++) {
        const i = j - 1;
        if (pos) {
            if (pendingExit) { close(j, o[j] - s * tick, 'signal', FEE.taker); pendingExit = false; continue; }
            if (s * (o[j] - pos.stop) <= 0) { close(j, o[j] - s * tick, 'stop', FEE.taker); continue; }
            if (s * ((s > 0 ? l[j] : h[j]) - pos.stop) <= 0) { close(j, pos.stop - s * tick, 'stop', FEE.taker); continue; }
            if (s * (o[j] - pos.tgt) >= 0) { close(j, o[j], 'tp', FEE.maker); continue; }
            if (s * ((s > 0 ? h[j] : l[j]) - pos.tgt) >= tick) { close(j, pos.tgt, 'tp', FEE.maker); continue; }
            // extend(d, j, s): tín hiệu còn hiệu lực -> đếm lại thời gian giữ từ nến j
            if (extend && extend(d, j, s)) pos.last = j;
            if (j - (pos.last ?? pos.idx) + 1 >= maxHold) pendingExit = true;
            else if (exitRule === 'VETO' && f.st[j] === -s) pendingExit = true;
            else if (exitRule === 'SCORE' && s * score[j] <= 0) pendingExit = true;
            continue;
        }
        // event tại close i -> tạo lệnh chờ
        if (trig(d, i, s)) order = { from: i, until: i + entry.window };
        if (!order) continue;
        if (i > order.until || f.st[i] === -s) { order = null; continue; } // hết hạn hoặc ATRBot phủ quyết
        const lv = entry.level(d, i, s);
        let fill, fee;
        if (isNaN(lv)) { fill = o[j] + s * tick; fee = FEE.taker; }
        else if (s * (o[j] - lv) <= 0) { fill = o[j]; fee = FEE.taker; }
        else if (s * (lv - (s > 0 ? l[j] : h[j])) >= tick) { fill = lv; fee = FEE.maker; }
        else continue;
        order = null;
        const dist = stopX.dist(d, i, fill);
        pos = { idx: j, fill, fee, stop: fill - s * dist, tgt: fill + s * rr * dist };
        if (s * ((s > 0 ? l[j] : h[j]) - pos.stop) <= 0) close(j, pos.stop - s * tick, 'stop', FEE.taker);
    }
    return trades;
}

export const TRIGS = {
    S4: { desc: 'score chạm ±4 (đủ cả 4 điều kiện)', fn: (d, i, s) => s * d.score[i] === 4 && s * d.score[i - 1] < 4 },
    S3: { desc: 'score chạm ±3 trở lên', fn: (d, i, s) => s * d.score[i] >= 3 && s * d.score[i - 1] < 3 },
    KB: { desc: 'KC trọn phía cả 2 VWAP + ATRBot cùng hướng (bỏ thứ tự VWAP)', fn: (d, i, s) => {
        const ok = (k) => (s > 0 ? d.f.kc.lower[k] > Math.max(d.f.dv[k], d.f.wv[k]) : d.f.kc.upper[k] < Math.min(d.f.dv[k], d.f.wv[k])) && d.f.st[k] === s;
        return ok(i) && !ok(i - 1);
    } },
};
export const ENTRIES = {
    MKT: { desc: 'Market ngay nến kế', window: 0, level: () => NaN },
    BASIS: { desc: 'Limit tại KC basis, chờ tối đa 16 nến', window: 16, level: (d, i) => d.f.kc.basis[i] },
    DVWAP: { desc: 'Limit tại VWAP phiên, chờ tối đa 32 nến', window: 32, level: (d, i) => d.f.dv[i] },
};
export const STOPX = {
    P2: { desc: 'stop 2%', dist: (d, i, fill) => 0.02 * fill },
    P3: { desc: 'stop 3%', dist: (d, i, fill) => 0.03 * fill },
    A3: { desc: 'stop 3 ATR', dist: (d, i) => 3 * d.f.atr[i] },
    A5: { desc: 'stop 5 ATR', dist: (d, i) => 5 * d.f.atr[i] },
    A8: { desc: 'stop 8 ATR (chỉ chặn thảm hoạ)', dist: (d, i) => 8 * d.f.atr[i] },
    NONE: { desc: 'không stop', dist: () => Infinity },
};

export function statsOf(trades, split) {
    const S = (a) => {
        if (!a.length) return { n: 0, avg: NaN, win: NaN, pf: NaN, t: NaN, total: 0, dd: 0 };
        let s = 0, q = 0, w = 0, gp = 0, gl = 0, eq = 0, pk = 0, dd = 0;
        for (const x of a) { s += x.net; q += x.net ** 2; if (x.net > 0) { w++; gp += x.net; } else gl -= x.net; eq += x.net; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq); }
        const m = s / a.length, sd = Math.sqrt(Math.max(0, q / a.length - m * m));
        return { n: a.length, avg: m, win: w / a.length, pf: gl ? gp / gl : Infinity, t: sd ? m / (sd / Math.sqrt(a.length)) : 0, total: s, dd };
    };
    return { all: S(trades), is: S(trades.filter((t) => t.idx < split)), oos: S(trades.filter((t) => t.idx >= split)) };
}
