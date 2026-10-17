// Nghiên cứu combo ATRBot(14,2,hlc3,VIDYA,14) + VWAP phiên + VWAP tuần + Keltner(9, 0.5, TR)
// Usage: node analyze.mjs [market=futures] [fee=0.0005] [tf=15m|1h]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCsv, resample } from './lib/indicators.mjs';
import { buildFeatures, DEFAULTS } from './lib/features.mjs';
import { backtest, stats } from './lib/backtest.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [market = 'futures', feeArg = '0.0005', TF = '15m'] = process.argv.slice(2);
const FEE = Number(feeArg);
const TF_MULT = { '15m': 1, '1h': 4, '4h': 16 }[TF];
const SYMBOLS = ['IMXUSDT', 'SOLUSDT'];
const WARMUP = 700; // đủ cho VWAP tuần + VIDYA hội tụ

// ---------- format helpers ----------
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const pct = (x, d = 1) => (isFinite(x) ? (x * 100).toFixed(d) + '%' : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : x === Infinity ? '∞' : '-');
function table(head, rows) {
    return ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|',
        ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n');
}
const out = [];
const md = (s = '') => { out.push(s); };

function meanT(xs, overlap = 1) {
    const n = xs.length;
    if (!n) return { n: 0, mean: NaN, t: NaN };
    let s = 0, q = 0;
    for (const x of xs) { s += x; q += x * x; }
    const m = s / n, sd = Math.sqrt(Math.max(0, q / n - m * m));
    return { n, mean: m, t: sd > 0 ? m / (sd / Math.sqrt(n / overlap)) : 0 };
}

// ---------- load ----------
const data = {};
for (const sym of SYMBOLS) {
    const raw = loadCsv(readFileSync(join(HERE, 'data', `${sym}_15m_${market}.csv`), 'utf8'));
    const bars = TF_MULT > 1 ? resample(raw, TF_MULT) : raw;
    const f = buildFeatures(bars);
    const runs = [];
    for (let i = WARMUP, last = -1; i < bars.n; i++) if (f.flip[i]) { if (last >= 0) runs.push(i - last); last = i; }
    runs.sort((a, b) => a - b);
    // drift không điều kiện: trung bình lợi nhuận 1 nến và H nến (vào open[i+1], ra close[i+H])
    const fwd = (i, H) => bars.c[i + H] / bars.o[i + 1] - 1;
    const uncond = {};
    for (const H of [4, 16, 48, 96]) {
        let s = 0, k = 0;
        for (let i = WARMUP; i < bars.n - H; i++) { s += fwd(i, H); k++; }
        uncond[H] = s / k;
    }
    let d1 = 0;
    for (let i = WARMUP + 1; i < bars.n; i++) d1 += bars.c[i] / bars.c[i - 1] - 1;
    data[sym] = { bars, f, fwd, uncond, runs, drift: d1 / (bars.n - WARMUP - 1), split: Math.floor(WARMUP + (bars.n - WARMUP) * 0.6) };
}

md(`# Nghiên cứu combo ATRBot + VWAP phiên/tuần + Keltner — Binance ${market} ${TF}`);
md(`Mọi đơn vị "nến" và H (horizon) trong báo cáo này là nến ${TF}.\n`);
md(`Phí + trượt giá giả định: ${pct(FEE, 3)} mỗi chiều (${pct(2 * FEE, 2)} khứ hồi). Vào lệnh tại open nến kế tiếp sau khi nến tín hiệu đóng. IS = 60% dữ liệu đầu, OOS = 40% cuối.\n`);

// ============ 1. Tổng quan ============
md('## 1. Tổng quan dữ liệu & hành vi ATRBot\n');
{
    const rows = [];
    for (const sym of SYMBOLS) {
        const { bars, f, fwd } = data[sym];
        const flips = [];
        for (let i = WARMUP; i < bars.n; i++) if (f.flip[i]) flips.push(i);
        const runs = data[sym].runs;
        const bull = (() => { let s = 0; for (let i = WARMUP; i < bars.n; i++) s += f.st[i] > 0; return s / (bars.n - WARMUP); })();
        // độ trễ: khi flip, giá đã đi bao nhiêu ATR từ cực trị gần nhất của trend trước
        const lag = flips.slice(1).map((i, k) => {
            const from = flips[k]; let ext = f.flip[i] > 0 ? Infinity : -Infinity;
            for (let j = from; j <= i; j++) ext = f.flip[i] > 0 ? Math.min(ext, bars.l[j]) : Math.max(ext, bars.h[j]);
            return Math.abs(bars.c[i] - ext) / f.atr[i];
        }).sort((a, b) => a - b);
        const d0 = new Date(bars.t[0]).toISOString().slice(0, 10), d1 = new Date(bars.t[bars.n - 1]).toISOString().slice(0, 10);
        rows.push([sym, `${d0} → ${d1}`, bars.c[0].toPrecision(4) + ' → ' + bars.c[bars.n - 1].toPrecision(4),
            flips.length, (runs.reduce((a, b) => a + b, 0) / runs.length).toFixed(1), `${runs[0]} / ${runs[runs.length >> 2]} / ${runs[runs.length >> 1]}`, pct(bull), f2(lag[lag.length >> 1])]);
        void fwd;
    }
    md(table(['Symbol', 'Giai đoạn', 'Giá', 'Số flip', 'Độ dài TB 1 trạng thái (nến)', 'Ngắn nhất / P25 / trung vị', '% thời gian xanh', 'Độ trễ trung vị khi flip (ATR từ đáy/đỉnh)'], rows));
    md('\n> Độ trễ = khoảng cách từ đáy (flip lên) / đỉnh (flip xuống) của trend trước tới giá đóng cửa tại nến flip, tính bằng ATR(14).\n');
}

// ============ 2. Bản đồ edge theo trạng thái ============
md('## 2. Bản đồ edge: lợi nhuận tương lai theo trạng thái (mọi nến)\n');
md('Excess = lợi nhuận trung bình (vào open nến kế, ra close sau H nến) **trừ đi** drift không điều kiện, đơn vị bps (0.01%). t đã hiệu chỉnh chồng lấn (n/H). |t| > 3 mới đáng tin.\n');
function edgeMap(title, keyFn, labelFn) {
    md(`### ${title}\n`);
    const head = ['Nhóm'];
    for (const sym of SYMBOLS) head.push(`${sym} n`, `${sym} H16 bps (t)`, `${sym} H48 bps (t)`);
    const groups = new Map();
    for (const sym of SYMBOLS) {
        const { bars, f, fwd, uncond } = data[sym];
        for (let i = WARMUP; i < bars.n - 48; i++) {
            const k = keyFn(f, i);
            if (k == null) continue;
            if (!groups.has(k)) groups.set(k, {});
            const g = groups.get(k);
            g[sym] ??= { h16: [], h48: [] };
            g[sym].h16.push(fwd(i, 16) - uncond[16]);
            g[sym].h48.push(fwd(i, 48) - uncond[48]);
        }
    }
    const rows = [...groups.keys()].sort().map((k) => {
        const r = [labelFn(k)];
        for (const sym of SYMBOLS) {
            const g = groups.get(k)[sym];
            if (!g) { r.push('0', '-', '-'); continue; }
            const a = meanT(g.h16, 16), b = meanT(g.h48, 48);
            r.push(a.n, `${bps(a.mean)} (${f2(a.t)})`, `${bps(b.mean)} (${f2(b.t)})`);
        }
        return r;
    });
    md(table(head, rows) + '\n');
}
const S = (x) => (x > 0 ? '▲' : x < 0 ? '▼' : '·');
edgeMap('2a. ATRBot state', (f, i) => f.st[i], (k) => `ATRBot ${S(k)}`);
edgeMap('2b. ATRBot × giá so với VWAP tuần', (f, i) => (f.wSide[i] ? `${f.st[i]}|${f.wSide[i]}` : null),
    (k) => { const [a, b] = k.split('|'); return `Bot ${S(+a)} / giá ${+b > 0 ? 'trên' : 'dưới'} wVWAP`; });
edgeMap('2c. ATRBot × VWAP tuần × VWAP phiên', (f, i) => (f.wSide[i] && f.dSide[i] ? `${f.st[i]}|${f.wSide[i]}|${f.dSide[i]}` : null),
    (k) => { const [a, b, c] = k.split('|'); return `Bot ${S(+a)} / ${+b > 0 ? '>w' : '<w'} / ${+c > 0 ? '>d' : '<d'}`; });
edgeMap('2d. ATRBot × vùng Keltner', (f, i) => `${f.st[i]}|${f.kz[i]}`,
    (k) => { const [a, b] = k.split('|'); return `Bot ${S(+a)} / ${+b > 0 ? 'trên upper' : +b < 0 ? 'dưới lower' : 'trong kênh'}`; });
md('> Lưu ý: thứ Hai, VWAP phiên và VWAP tuần reset cùng lúc (00:00 UTC) nên **trùng nhau cả ngày** — ~1/7 thời gian combo thực chất chỉ còn 3 indicator.\n');
edgeMap('2e. VWAP phiên so với VWAP tuần (stack) × ATRBot', (f, i) => `${f.st[i]}|${f.stack[i]}`,
    (k) => { const [a, b] = k.split('|'); return `Bot ${S(+a)} / ${+b > 0 ? 'dVWAP > wVWAP' : +b < 0 ? 'dVWAP < wVWAP' : 'Thứ Hai (dVWAP ≡ wVWAP)'}`; });
edgeMap('2f. Khoảng cách tới VWAP tuần (ATR) — chỉ nến ATRBot xanh',
    (f, i) => { if (f.st[i] < 0) return null; const x = f.dWv[i]; return x < -6 ? 'a' : x < -2 ? 'b' : x < 0 ? 'c' : x < 2 ? 'd' : x < 6 ? 'e' : x < 12 ? 'f' : 'g'; },
    (k) => ({ a: '< -6', b: '-6..-2', c: '-2..0', d: '0..2', e: '2..6', f: '6..12', g: '> 12' }[k] + ' ATR'));
edgeMap('2g. Khoảng cách tới VWAP tuần (ATR) — chỉ nến ATRBot đỏ',
    (f, i) => { if (f.st[i] > 0) return null; const x = f.dWv[i]; return x < -12 ? 'a' : x < -6 ? 'b' : x < -2 ? 'c' : x < 0 ? 'd' : x < 2 ? 'e' : x < 6 ? 'f' : 'g'; },
    (k) => ({ a: '< -12', b: '-12..-6', c: '-6..-2', d: '-2..0', e: '0..2', f: '2..6', g: '> 6' }[k] + ' ATR'));

// ============ 3. Event study: tín hiệu flip ============
md('## 3. Event study: tín hiệu ATRBot flip (theo hướng flip)\n');
md('Lợi nhuận theo hướng tín hiệu, đã trừ drift, bps. Win = % lệnh có lợi nhuận > 0 sau 48 nến (chưa phí). MFE/MAE = biên độ thuận/ngược lớn nhất trong 48 nến, đơn vị ATR.\n');
{
    const cond = {
        'Tất cả flip': () => true,
        'Thuận wVWAP': (f, i) => f.wSide[i] === f.flip[i],
        'Ngược wVWAP': (f, i) => f.wSide[i] === -f.flip[i],
        'Thuận dVWAP': (f, i) => f.dSide[i] === f.flip[i],
        'Ngược dVWAP': (f, i) => f.dSide[i] === -f.flip[i],
        'Thuận cả 2 VWAP': (f, i) => f.wSide[i] === f.flip[i] && f.dSide[i] === f.flip[i],
        'Thuận 2 VWAP + stack': (f, i) => f.wSide[i] === f.flip[i] && f.dSide[i] === f.flip[i] && f.stack[i] === f.flip[i],
        'Close ngoài KC theo hướng': (f, i) => f.kz[i] === f.flip[i],
        'Close trong KC': (f, i) => f.kz[i] === 0,
        'Close ngoài KC ngược hướng': (f, i) => f.kz[i] === -f.flip[i],
        'Trạng thái trước ngắn (≤ P25, chop)': (f, i, prevRun, p25) => prevRun <= p25,
        'Trạng thái trước dài (> trung vị)': (f, i, prevRun, p25, p50) => prevRun > p50,
        'Phiên Á 00-08 UTC': (f, i) => f.minuteOfDay[i] < 480,
        'Phiên Âu 08-13 UTC': (f, i) => f.minuteOfDay[i] >= 480 && f.minuteOfDay[i] < 780,
        'Phiên Mỹ 13-21 UTC': (f, i) => f.minuteOfDay[i] >= 780 && f.minuteOfDay[i] < 1260,
        'Cuối ngày 21-24 UTC': (f, i) => f.minuteOfDay[i] >= 1260,
    };
    const head = ['Điều kiện'];
    for (const sym of SYMBOLS) head.push(`${sym} n`, 'H4', 'H16', 'H48 (t)', 'H96', 'Win48', 'MFE/MAE');
    const rows = [];
    for (const [name, fn] of Object.entries(cond)) {
        const r = [name];
        for (const sym of SYMBOLS) {
            const { bars, f, fwd, uncond } = data[sym];
            const acc = { 4: [], 16: [], 48: [], 96: [] }; let win = 0, mfe = 0, mae = 0, lastFlip = -1;
            for (let i = WARMUP; i < bars.n - 97; i++) {
                if (!f.flip[i]) continue;
                const prevRun = lastFlip < 0 ? Infinity : i - lastFlip; lastFlip = i;
                const { runs } = data[sym];
                if (!fn(f, i, prevRun, runs[runs.length >> 2], runs[runs.length >> 1])) continue;
                const d = f.flip[i];
                for (const H of [4, 16, 48, 96]) acc[H].push(d * (fwd(i, H) - uncond[H]));
                if (d * fwd(i, 48) > 0) win++;
                let up = 0, dn = 0; const e = bars.o[i + 1];
                for (let j = i + 1; j <= i + 48; j++) { up = Math.max(up, d * ((d > 0 ? bars.h[j] : bars.l[j]) - e)); dn = Math.max(dn, -d * ((d > 0 ? bars.l[j] : bars.h[j]) - e)); }
                mfe += up / f.atr[i]; mae += dn / f.atr[i];
            }
            const N = acc[4].length, m = (H) => meanT(acc[H]);
            r.push(N, bps(m(4).mean), bps(m(16).mean), `${bps(m(48).mean)} (${f2(m(48).t)})`, bps(m(96).mean), pct(win / N), N ? `${f2(mfe / N)}/${f2(mae / N)}` : '-');
        }
        rows.push(r);
    }
    md(table(head, rows) + '\n');
}

// ============ 4. Grid backtest ============
md('## 4. Grid backtest các cách kết hợp\n');
const TRIGGERS = {
    FLIP: { desc: 'ATRBot flip', fn: (f, i, s) => f.flip[i] === s },
    KCB: { desc: 'Close phá ra ngoài KC theo hướng (nến đầu tiên)', fn: (f, i, s) => f.kz[i] === s && f.kz[i - 1] !== s },
    KCD: { desc: 'Close phá ra ngoài KC NGƯỢC hướng (pullback, nến đầu tiên)', fn: (f, i, s) => f.kz[i] === -s && f.kz[i - 1] !== -s },
    DVR: { desc: 'Close vượt lại VWAP phiên theo hướng', fn: (f, i, s) => f.dSide[i] === s && f.dSide[i - 1] !== s },
    WVR: { desc: 'Close vượt lại VWAP tuần theo hướng', fn: (f, i, s) => f.wSide[i] === s && f.wSide[i - 1] !== s },
};
const FILTERS = {
    '-': { desc: 'không lọc', fn: () => true },
    B: { desc: 'ATRBot cùng hướng', fn: (f, i, s) => f.st[i] === s },
    W: { desc: 'giá cùng phía wVWAP', fn: (f, i, s) => f.wSide[i] === s },
    BW: { desc: 'B + W', fn: (f, i, s) => f.st[i] === s && f.wSide[i] === s },
    BD: { desc: 'B + giá cùng phía dVWAP', fn: (f, i, s) => f.st[i] === s && f.dSide[i] === s },
    BWD: { desc: 'B + W + D', fn: (f, i, s) => f.st[i] === s && f.wSide[i] === s && f.dSide[i] === s },
    BWDS: { desc: 'B + W + D + dVWAP cùng phía wVWAP', fn: (f, i, s) => f.st[i] === s && f.wSide[i] === s && f.dSide[i] === s && f.stack[i] === s },
};
const t2stop = (f, s) => (i) => (f.st[i] === s ? f.trail2[i] : NaN);
const EXITS = {
    XF: { desc: 'ATRBot flip ngược', mk: (f, s) => ({ exitSignal: (i) => f.st[i] === -s }) },
    XT: { desc: 'Stop trail2 intrabar + flip ngược', mk: (f, s) => ({ stopAt: t2stop(f, s), exitSignal: (i) => f.st[i] === -s }) },
    XK: { desc: 'Close ra ngoài KC phía ngược + stop trail2', mk: (f, s) => ({ stopAt: t2stop(f, s), exitSignal: (i) => f.kz[i] === -s || f.st[i] === -s }) },
    XD: { desc: 'Close cắt ngược dVWAP + stop trail2', mk: (f, s) => ({ stopAt: t2stop(f, s), exitSignal: (i) => f.dSide[i] === -s || f.st[i] === -s }) },
    X2R: { desc: 'Stop cố định = trail2 lúc vào, TP 2R, hoặc flip ngược', mk: (f, s) => ({
        stopAt: (i, pos) => (pos.idx > i && f.st[i] === s ? f.trail2[i] : NaN),
        target: (pos) => (pos.risk > 0 ? pos.entry + s * 2 * pos.risk : NaN),
        exitSignal: (i) => f.st[i] === -s }) },
    H16: { desc: 'Giữ cố định 16 nến (4h), không stop', mk: () => ({ maxBars: 16 }) },
    H48: { desc: 'Giữ cố định 48 nến (12h), không stop', mk: () => ({ maxBars: 48 }) },
};

function runStrategy(sym, trig, filt, exit, side, fOverride) {
    const { bars, drift, split } = data[sym];
    const f = fOverride || data[sym].f;
    const tFn = TRIGGERS[trig].fn, fFn = FILTERS[filt].fn;
    const trades = backtest(bars, {
        side, fee: FEE, start: WARMUP,
        entry: (i) => tFn(f, i, side) && fFn(f, i, side),
        ...EXITS[exit].mk(f, side),
    });
    return { trades, st: stats(trades, { drift, side, splitIdx: split }) };
}

const grid = [];
for (const trig of Object.keys(TRIGGERS)) for (const filt of Object.keys(FILTERS)) for (const exit of Object.keys(EXITS)) for (const side of [1, -1]) {
    // với FLIP, B luôn đúng -> B ≡ '-', BW ≡ W
    if (trig === 'FLIP' && (filt === 'B' || filt === 'BW')) continue;
    const per = {};
    for (const sym of SYMBOLS) per[sym] = runStrategy(sym, trig, filt, exit, side).st;
    grid.push({ trig, filt, exit, side, per });
}

const MIN_N = 60;
const robust = (g) => SYMBOLS.every((s) => g.per[s].n >= MIN_N && g.per[s].avg > 0 && g.per[s].isAvg > 0 && g.per[s].oosAvg > 0);
const score = (g) => Math.min(...SYMBOLS.map((s) => (g.per[s].n >= MIN_N ? g.per[s].t : -99)));
const label = (g) => `${g.side > 0 ? 'LONG' : 'SHORT'} ${g.trig}·${g.filt}·${g.exit}`;
function gridRows(list) {
    return list.map((g) => {
        const r = [label(g)];
        for (const s of SYMBOLS) {
            const p = g.per[s];
            r.push(p.n, pct(p.win, 0), `${bps(p.avg)}`, f2(p.pf), f2(p.t), `${bps(p.isAvg)}/${bps(p.oosAvg)}`, bps(p.edgeVsDrift), pct(p.total, 0), pct(p.maxDD, 0), p.avgBars?.toFixed(0));
        }
        return r;
    });
}
const gHead = ['Chiến thuật'];
for (const s of SYMBOLS) gHead.push(`${s} n`, 'Win', 'Avg net bps', 'PF', 't', 'IS/OOS bps', 'vs drift', 'Tổng', 'MaxDD', 'Nến giữ');

md(`Tổng số cấu hình: ${grid.length} × ${SYMBOLS.length} symbol. Ký hiệu: TRIGGER·FILTER·EXIT.\n`);
md('**Trigger:** ' + Object.entries(TRIGGERS).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + '\n');
md('**Filter:** ' + Object.entries(FILTERS).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + '\n');
md('**Exit:** ' + Object.entries(EXITS).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + '\n');

md('### 4a. Baseline: tín hiệu thuần (không lọc)\n');
md(table(gHead, gridRows(grid.filter((g) => g.filt === '-' && (g.exit === 'XF' || g.exit === 'H48')))) + '\n');

md('### 4b. Cách dùng "chuẩn" của combo: ATRBot flip lọc VWAP\n');
md(table(gHead, gridRows(grid.filter((g) => g.trig === 'FLIP' && ['XF', 'XT', 'X2R'].includes(g.exit)))) + '\n');

const passed = grid.filter(robust).sort((a, b) => score(b) - score(a));
md(`### 4c. Cấu hình vượt bộ lọc độ bền (${passed.length}/${grid.length})\n`);
md(`Tiêu chí: mỗi symbol n ≥ ${MIN_N}, lợi nhuận TB sau phí > 0 ở **cả IS và OOS** trên **cả 2 symbol**. Xếp theo t-stat nhỏ nhất giữa 2 symbol.\n`);
md(table(gHead, gridRows(passed.slice(0, 40))) + '\n');

md('### 4d. Top 20 theo t-stat nhỏ nhất (không bắt buộc qua bộ lọc)\n');
md(table(gHead, gridRows([...grid].sort((a, b) => score(b) - score(a)).slice(0, 20))) + '\n');

// Ablation: mỗi filter thêm/bớt bao nhiêu so với bản không lọc, trung bình trên mọi trigger/exit
md('### 4e. Ablation: đóng góp của từng filter (trung bình avg net bps trên mọi trigger × exit)\n');
{
    const rows = [];
    for (const filt of Object.keys(FILTERS)) for (const side of [1, -1]) {
        const r = [`${side > 0 ? 'LONG' : 'SHORT'} ${filt}`];
        for (const s of SYMBOLS) {
            const gs = grid.filter((g) => g.filt === filt && g.side === side && g.trig !== 'FLIP' && g.per[s].n > 0);
            const avg = gs.reduce((a, g) => a + g.per[s].avg, 0) / gs.length;
            const pos = gs.filter((g) => g.per[s].avg > 0).length;
            r.push(bps(avg), `${pos}/${gs.length}`);
        }
        rows.push(r);
    }
    const h = ['Filter']; for (const s of SYMBOLS) h.push(`${s} avg bps`, '# cấu hình dương');
    md(table(h, rows) + '\n');
}

// ============ 5. Độ nhạy tham số ============
const TOP = [...grid].sort((a, b) => score(b) - score(a)).slice(0, 4);
md('## 5. Độ nhạy tham số cho 4 cấu hình có t-stat nhỏ nhất cao nhất\n');
md('Thay đổi tham số ATRBot (và Keltner nếu cấu hình dùng KC) quanh giá trị đang dùng. Nếu edge chỉ tồn tại đúng tại 14-2-14 / 9-0.5 thì nhiều khả năng là overfit.\n');
{
    const botVariants = [];
    for (const mult of [1.5, 2, 2.5, 3]) for (const maLen of [9, 14, 21]) botVariants.push({ bot: { ...DEFAULTS.bot, mult, maLen }, kc: DEFAULTS.kc, name: `bot m${mult} L${maLen}` });
    const kcVariants = [];
    for (const kcLen of [9, 20]) for (const kcMult of [0.5, 1, 1.5]) kcVariants.push({ bot: DEFAULTS.bot, kc: { len: kcLen, mult: kcMult, useTR: true }, name: `kc ${kcLen}/${kcMult}` });
    const cache = {};
    for (const g of TOP) {
        md(`### ${label(g)}\n`);
        const usesKc = ['KCB', 'KCD'].includes(g.trig) || g.exit === 'XK';
        const rows = [];
        for (const v of usesKc ? [...botVariants, ...kcVariants] : botVariants) {
            const r = [v.name];
            for (const s of SYMBOLS) {
                cache[s + v.name] ??= buildFeatures(data[s].bars, v);
                const p = runStrategy(s, g.trig, g.filt, g.exit, g.side, cache[s + v.name]).st;
                r.push(p.n, bps(p.avg), f2(p.pf), f2(p.t), `${bps(p.isAvg)}/${bps(p.oosAvg)}`);
            }
            rows.push(r);
        }
        const h = ['Biến thể']; for (const s of SYMBOLS) h.push(`${s} n`, 'Avg bps', 'PF', 't', 'IS/OOS');
        md(table(h, rows) + '\n');
    }
}

// ============ 6. So với vào lệnh ngẫu nhiên ============
md('## 6. Kiểm định so với vào lệnh ngẫu nhiên (Monte Carlo)\n');
md('Với mỗi cấu hình: 2000 lần mô phỏng chọn ngẫu nhiên cùng số lệnh, cùng chiều, giữ cố định bằng số nến giữ TB, cùng phí. p = tỉ lệ mô phỏng ngẫu nhiên có avg ≥ chiến thuật. p < 0.05 trên **cả 2 symbol** mới đáng chú ý — và vì đã thử hàng trăm cấu hình, ngưỡng thực tế nên chặt hơn nhiều (~0.001).\n');
{
    let seed = 12345;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rows = [];
    for (const g of [...grid].sort((a, b) => score(b) - score(a)).slice(0, 10)) {
        const r = [label(g)];
        for (const s of SYMBOLS) {
            const p = g.per[s];
            const { bars } = data[s];
            const L = Math.max(1, Math.round(p.avgBars));
            const hi = bars.n - L - 2;
            let ge = 0;
            for (let k = 0; k < 2000; k++) {
                let sum = 0;
                for (let j = 0; j < p.n; j++) {
                    const i = WARMUP + Math.floor(rnd() * (hi - WARMUP));
                    sum += g.side * (bars.o[i + 1 + L] / bars.o[i + 1] - 1) - 2 * FEE;
                }
                if (sum / p.n >= p.avg) ge++;
            }
            r.push(p.n, bps(p.avg), (ge / 2000).toFixed(3));
        }
        rows.push(r);
    }
    const h = ['Cấu hình']; for (const s of SYMBOLS) h.push(`${s} n`, 'Avg bps', 'p (random)');
    md(table(h, rows) + '\n');
}

// ---------- write ----------
mkdirSync(join(HERE, 'reports'), { recursive: true });
const file = join(HERE, 'reports', `REPORT_${market}_${TF}.md`);
writeFileSync(file, out.join('\n'));
writeFileSync(join(HERE, 'reports', `grid_${market}_${TF}.json`), JSON.stringify(grid.map((g) => ({ ...g, label: label(g) }))));
console.log(`Report -> ${file}`);
console.log(`Robust configs: ${passed.length}/${grid.length}`);
for (const g of passed.slice(0, 15)) console.log(label(g).padEnd(28), SYMBOLS.map((s) => `${s}: n=${g.per[s].n} avg=${bps(g.per[s].avg)}bps t=${f2(g.per[s].t)} PF=${f2(g.per[s].pf)} IS/OOS=${bps(g.per[s].isAvg)}/${bps(g.per[s].oosAvg)}`).join(' | '));
