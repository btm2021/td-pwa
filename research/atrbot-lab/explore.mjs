// Khám phá bổ sung: cấu trúc thị trường (variance ratio), ATRBot khung lớn, chế độ biến động, momentum-extension.
// Usage: node explore.mjs [market=futures] [fee=0.0005]
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCsv, atrBot } from './lib/indicators.mjs';
import { buildFeatures } from './lib/features.mjs';
import { backtest, stats } from './lib/backtest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [market = 'futures', feeArg = '0.0005'] = process.argv.slice(2);
const FEE = Number(feeArg);
const SYMBOLS = ['IMXUSDT', 'SOLUSDT'];
const WARMUP = 700;
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : '-');
const pct = (x) => (isFinite(x) ? (x * 100).toFixed(0) + '%' : '-');
const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';

// Gộp nến 15m thành khung lớn; trả về state ATRBot của nến HTF ĐÃ ĐÓNG gần nhất cho mỗi nến 15m
function htfState(bars, k) {
    const idx = [], o = [], h = [], l = [], c = [], v = [], t = [];
    for (let i = 0; i < bars.n; i++) {
        const b = Math.floor(bars.t[i] / (k * 900000));
        if (!t.length || t[t.length - 1] !== b) { t.push(b); o.push(bars.o[i]); h.push(bars.h[i]); l.push(bars.l[i]); c.push(bars.c[i]); v.push(bars.v[i]); idx.push(i); }
        else { const j = t.length - 1; h[j] = Math.max(h[j], bars.h[i]); l[j] = Math.min(l[j], bars.l[i]); c[j] = bars.c[i]; v[j] += bars.v[i]; idx[j] = i; }
    }
    const hb = { n: t.length, t: Float64Array.from(t), o: Float64Array.from(o), h: Float64Array.from(h), l: Float64Array.from(l), c: Float64Array.from(c), v: Float64Array.from(v) };
    const st = atrBot(hb).state;
    // nến HTF j coi là đã đóng tại nến 15m cuối cùng của nó, chỉ khi nến đó chạm mốc kết thúc bucket
    const closeAt = idx.map((last, j) => (bars.t[last] + 900000 === (t[j] + 1) * k * 900000 ? last : Infinity));
    const res = new Int8Array(bars.n);
    let j = -1;
    for (let i = 0; i < bars.n; i++) {
        while (j + 1 < hb.n && closeAt[j + 1] <= i) j++;
        res[i] = j >= 0 ? st[j] : 0;
    }
    return res;
}

function varianceRatio(c, from, to, q) {
    const r = [];
    for (let i = from + 1; i < to; i++) r.push(Math.log(c[i] / c[i - 1]));
    const mu = r.reduce((a, b) => a + b, 0) / r.length;
    let v1 = 0; for (const x of r) v1 += (x - mu) ** 2; v1 /= r.length;
    let vq = 0, m = 0;
    for (let i = q; i <= r.length; i++) { let s = 0; for (let j = i - q; j < i; j++) s += r[j]; vq += (s - q * mu) ** 2; m++; }
    vq /= m;
    return vq / (q * v1);
}

const data = {};
for (const sym of SYMBOLS) {
    const bars = loadCsv(readFileSync(join(HERE, 'data', `${sym}_15m_${market}.csv`), 'utf8'));
    const f = buildFeatures(bars);
    f.h1 = htfState(bars, 4);
    f.h4 = htfState(bars, 16);
    // ATR% percentile trong 30 ngày (2880 nến) — chế độ biến động
    f.volRank = new Float64Array(bars.n);
    for (let i = 2880; i < bars.n; i += 1) {
        const x = f.atr[i] / bars.c[i]; let below = 0;
        for (let j = i - 2880; j < i; j += 16) if (f.atr[j] / bars.c[j] < x) below++;
        f.volRank[i] = below / 180;
    }
    let d1 = 0; for (let i = WARMUP + 1; i < bars.n; i++) d1 += bars.c[i] / bars.c[i - 1] - 1;
    data[sym] = { bars, f, drift: d1 / (bars.n - WARMUP - 1), split: Math.floor(WARMUP + (bars.n - WARMUP) * 0.6) };
}

md(`# Khám phá bổ sung — ${market} 15m\n`);

// ---- 1. Variance ratio ----
md('## 1. Thị trường trending hay mean-reverting? (Variance Ratio)\n');
md('VR(q) > 1: lợi nhuận có xu hướng tiếp diễn (trend-following có lợi). VR < 1: có xu hướng đảo chiều (mean-reversion có lợi). Đo trên log-return 15m.\n');
{
    const Q = [4, 16, 48, 96, 192, 384];
    const rows = [];
    for (const sym of SYMBOLS) {
        const { bars, split } = data[sym];
        for (const [name, a, b] of [['toàn bộ', 1, bars.n], ['60% đầu', 1, split], ['40% cuối', split, bars.n]]) {
            rows.push([sym, name, ...Q.map((q) => f2(varianceRatio(bars.c, a, b, q)))]);
        }
    }
    md(table(['Symbol', 'Giai đoạn', ...Q.map((q) => `VR(${q})`)], rows));
}

// ---- 2. Flip theo điều kiện mở rộng ----
md('## 2. ATRBot flip 15m theo bối cảnh mở rộng (lợi nhuận theo hướng, đã trừ drift, H48, bps)\n');
{
    const conds = {
        'Tất cả': () => true,
        'ATRBot 1h cùng hướng': (f, i) => f.h1[i] === f.flip[i],
        'ATRBot 1h ngược hướng': (f, i) => f.h1[i] === -f.flip[i],
        'ATRBot 4h cùng hướng': (f, i) => f.h4[i] === f.flip[i],
        'ATRBot 4h ngược hướng': (f, i) => f.h4[i] === -f.flip[i],
        '1h + 4h cùng hướng': (f, i) => f.h1[i] === f.flip[i] && f.h4[i] === f.flip[i],
        'Biến động thấp (rank < 33%)': (f, i) => f.volRank[i] < 0.33,
        'Biến động TB (33-66%)': (f, i) => f.volRank[i] >= 0.33 && f.volRank[i] < 0.66,
        'Biến động cao (rank ≥ 66%)': (f, i) => f.volRank[i] >= 0.66,
    };
    const h = ['Điều kiện']; for (const s of SYMBOLS) h.push(`${s} n`, 'H16', 'H48 (t)', 'H96', 'IS/OOS H48');
    const rows = [];
    for (const [name, fn] of Object.entries(conds)) {
        const r = [name];
        for (const sym of SYMBOLS) {
            const { bars, f, split } = data[sym];
            const acc = { 16: [], 48: [], 96: [] }, is = [], oos = [];
            for (let i = 2880; i < bars.n - 97; i++) {
                if (!f.flip[i] || !fn(f, i)) continue;
                const d = f.flip[i];
                for (const H of [16, 48, 96]) acc[H].push(d * (bars.c[i + H] / bars.o[i + 1] - 1 - data[sym].drift * H));
                (i < split ? is : oos).push(acc[48][acc[48].length - 1]);
            }
            const m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
            const sd = (a) => Math.sqrt(m(a.map((x) => x * x)) - m(a) ** 2);
            r.push(acc[48].length, bps(m(acc[16])), `${bps(m(acc[48]))} (${f2(m(acc[48]) / (sd(acc[48]) / Math.sqrt(acc[48].length)))})`, bps(m(acc[96])), `${bps(m(is))}/${bps(m(oos))}`);
        }
        rows.push(r);
    }
    md(table(h, rows));
}

// ---- 3. Backtest các giả thuyết mới ----
md('## 3. Backtest giả thuyết mới (phí ' + (FEE * 100).toFixed(3) + '%/chiều)\n');
const t2stop = (f, s) => (i) => (f.st[i] === s ? f.trail2[i] : NaN);
const H = {
    'FLIP + 4h cùng hướng, exit flip': (f, s) => ({ entry: (i) => f.flip[i] === s && f.h4[i] === s, exitSignal: (i) => f.st[i] === -s }),
    'FLIP + 4h + wVWAP, exit flip': (f, s) => ({ entry: (i) => f.flip[i] === s && f.h4[i] === s && f.wSide[i] === s, exitSignal: (i) => f.st[i] === -s }),
    'FLIP + 1h + 4h, exit flip': (f, s) => ({ entry: (i) => f.flip[i] === s && f.h4[i] === s && f.h1[i] === s, exitSignal: (i) => f.st[i] === -s }),
    'Theo ATRBot 4h (vào khi 15m flip cùng 4h), exit khi 4h đổi': (f, s) => ({ entry: (i) => f.flip[i] === s && f.h4[i] === s, exitSignal: (i) => f.h4[i] === -s }),
    'Extension: bot cùng hướng, giá cách wVWAP 6-12 ATR, giữ 16': (f, s) => ({ entry: (i) => f.st[i] === s && s * f.dWv[i] > 6 && s * f.dWv[i] <= 12 && !(s * f.dWv[i - 1] > 6), maxBars: 16 }),
    'Extension: … giữ 48': (f, s) => ({ entry: (i) => f.st[i] === s && s * f.dWv[i] > 6 && s * f.dWv[i] <= 12 && !(s * f.dWv[i - 1] > 6), maxBars: 48 }),
    'Extension: … exit flip + stop trail2': (f, s) => ({ entry: (i) => f.st[i] === s && s * f.dWv[i] > 6 && !(s * f.dWv[i - 1] > 6), stopAt: t2stop(f, s), exitSignal: (i) => f.st[i] === -s }),
    'Bot cùng hướng nhưng giá phía sai wVWAP → đánh NGƯỢC bot, giữ 48': (f, s) => ({ entry: (i) => f.st[i] === -s && f.wSide[i] === s && f.wSide[i - 1] !== s, maxBars: 48 }),
};
{
    const h = ['Giả thuyết', 'Chiều']; for (const s of SYMBOLS) h.push(`${s} n`, 'Win', 'Avg bps', 'PF', 't', 'IS/OOS', 'vs drift');
    const rows = [];
    for (const [name, mk] of Object.entries(H)) for (const side of [1, -1]) {
        const r = [name, side > 0 ? 'LONG' : 'SHORT'];
        for (const sym of SYMBOLS) {
            const { bars, f, drift, split } = data[sym];
            const p = stats(backtest(bars, { side, fee: FEE, start: 2880, ...mk(f, side) }), { drift, side, splitIdx: split });
            r.push(p.n, pct(p.win), bps(p.avg), f2(p.pf), f2(p.t), `${bps(p.isAvg)}/${bps(p.oosAvg)}`, bps(p.edgeVsDrift));
        }
        rows.push(r);
    }
    md(table(h, rows));
}

// ---- 4. Chi phí: edge gộp trước phí của các trigger tần suất cao ----
md('## 4. Tần suất tín hiệu và chi phí\n');
{
    const rows = [];
    for (const sym of SYMBOLS) {
        const { bars, f } = data[sym];
        let kcOut = 0, kcCross = 0, dCross = 0, flips = 0;
        for (let i = WARMUP; i < bars.n; i++) {
            if (f.kz[i] !== 0) kcOut++;
            if (f.kz[i] !== 0 && f.kz[i] !== f.kz[i - 1]) kcCross++;
            if (f.dSide[i] !== f.dSide[i - 1]) dCross++;
            if (f.flip[i]) flips++;
        }
        const days = (bars.n - WARMUP) / 96;
        rows.push([sym, pct(kcOut / (bars.n - WARMUP)), (kcCross / days).toFixed(1), (dCross / days).toFixed(1), (flips / days).toFixed(2)]);
    }
    md(table(['Symbol', '% nến đóng ngoài KC(9,0.5)', 'Lần phá KC / ngày', 'Lần cắt dVWAP / ngày', 'ATRBot flip / ngày'], rows));
}

// ---- 5. Mean-reversion grid: fade độ lệch khỏi VWAP ----
md('## 5. Mean-reversion: fade độ lệch khỏi VWAP (vì VR < 1)\n');
md('Vào khi close lần đầu lệch quá k·ATR khỏi anchor (ngược hướng lệch). Thoát khi close về tới anchor, hoặc hết T nến. Stop thảm hoạ = thêm k·ATR nữa tính từ giá vào. Filter bot: `pullback` = ATRBot cùng hướng lệnh (mua dip trong trend xanh), `counter` = ATRBot ngược hướng lệnh.\n');
const mrRows = [];
{
    const anchors = { dVWAP: { arr: 'dv', ks: [2, 3, 4, 6] }, wVWAP: { arr: 'wv', ks: [4, 6, 8, 12] } };
    for (const [aName, { arr, ks }] of Object.entries(anchors)) for (const k of ks) for (const bf of ['-', 'pullback', 'counter']) for (const T of [48, 192]) for (const side of [1, -1]) {
        const r = { name: `${side > 0 ? 'LONG' : 'SHORT'} ${aName} k${k} ${bf} T${T}`, per: {} };
        for (const sym of SYMBOLS) {
            const { bars, f, drift, split } = data[sym];
            const A = f[arr];
            const dev = (i) => (bars.c[i] - A[i]) / f.atr[i];
            const okBot = (i) => (bf === '-' ? true : bf === 'pullback' ? f.st[i] === side : f.st[i] === -side);
            const trades = backtest(bars, {
                side, fee: FEE, start: 2880, maxBars: T,
                entry: (i) => -side * dev(i) > k && !(-side * dev(i - 1) > k) && okBot(i),
                stopAt: (i, pos) => (pos.idx > i ? bars.c[i] - side * k * f.atr[i] : NaN),
                exitSignal: (i) => side * (bars.c[i] - A[i]) >= 0,
            });
            r.per[sym] = stats(trades, { drift, side, splitIdx: split });
        }
        mrRows.push(r);
    }
    const h = ['Cấu hình']; for (const s of SYMBOLS) h.push(`${s} n`, 'Win', 'Avg bps', 'PF', 't', 'IS/OOS', 'vs drift');
    const row = (r) => [r.name, ...SYMBOLS.flatMap((s) => { const p = r.per[s]; return [p.n, pct(p.win), bps(p.avg), f2(p.pf), f2(p.t), `${bps(p.isAvg)}/${bps(p.oosAvg)}`, bps(p.edgeVsDrift)]; })];
    const ok = (r) => SYMBOLS.every((s) => r.per[s].n >= 40 && r.per[s].isAvg > 0 && r.per[s].oosAvg > 0);
    const sc = (r) => Math.min(...SYMBOLS.map((s) => (r.per[s].n >= 40 ? r.per[s].t : -99)));
    const passed = mrRows.filter(ok).sort((a, b) => sc(b) - sc(a));
    md(`### 5a. Cấu hình dương ở cả IS & OOS trên cả 2 symbol: ${passed.length}/${mrRows.length}\n`);
    md(table(h, passed.slice(0, 30).map(row)));
    md('### 5b. Ablation filter ATRBot trong mean-reversion (TB avg bps trên mọi anchor × k × T)\n');
    const ab = [];
    for (const bf of ['-', 'pullback', 'counter']) for (const side of ['LONG', 'SHORT']) {
        const g = mrRows.filter((r) => r.name.startsWith(side) && r.name.includes(` ${bf} `));
        ab.push([`${side} ${bf}`, ...SYMBOLS.flatMap((s) => { const xs = g.filter((r) => r.per[s].n); return [bps(xs.reduce((a, r) => a + r.per[s].avg, 0) / xs.length), `${xs.filter((r) => r.per[s].avg > 0).length}/${xs.length}`]; })]);
    }
    md(table(['Filter', ...SYMBOLS.flatMap((s) => [`${s} avg bps`, '# dương'])], ab));
}

writeFileSync(join(HERE, 'reports', `EXPLORE_${market}.md`), out.join('\n'));
console.log(out.join('\n'));
