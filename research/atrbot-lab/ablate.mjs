// Ablation: trong 4 thứ bạn nhìn (KC vs VWAP phiên, KC vs VWAP tuần, thứ tự 2 VWAP, ATRBot),
// bỏ bớt từng điều kiện thì chiến thuật H3 (giữ 48 nến kể từ lần cuối tín hiệu, không stop) thay đổi thế nào.
// Usage: node ablate.mjs [sims=50]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, simulate, statsOf, ENTRIES, STOPX, WARMUP } from './lib/swing-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const SIMS = Number(process.argv[2] || 50);
const TICKS = JSON.parse(readFileSync(join(DATA, 'ticks.json'), 'utf8'));
const COINS = readdirSync(DATA).filter((f) => f.endsWith('_15m_futures.csv')).map((f) => f.split('_')[0]).filter((s) => !['IMXUSDT', 'SOLUSDT'].includes(s)).sort();

// D: KC trọn phía VWAP phiên · W: KC trọn phía VWAP tuần · O: thứ tự VWAP (thứ Hai = không đạt) · B: ATRBot cùng hướng
const SETS = [
    ['DWOB', 'Đủ 4 (= score ±4)'],
    ['DWO', 'Bỏ ATRBot'],
    ['DWB', 'Bỏ thứ tự VWAP'],
    ['DOB', 'Bỏ KC vs VWAP tuần'],
    ['WOB', 'Bỏ KC vs VWAP phiên'],
    ['DW', 'Chỉ KC trọn phía cả 2 VWAP'],
    ['D', 'Chỉ KC trọn phía VWAP phiên'],
    ['B', 'Chỉ ATRBot'],
];
const HOLD = 48;

function conds(d) {
    const { f, bars } = d, n = bars.n;
    const mk = (s) => {
        const D = new Uint8Array(n), W = new Uint8Array(n), O = new Uint8Array(n), B = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
            const mon = new Date(bars.t[i]).getUTCDay() === 1;
            D[i] = s > 0 ? f.kc.lower[i] > f.dv[i] : f.kc.upper[i] < f.dv[i];
            W[i] = s > 0 ? f.kc.lower[i] > f.wv[i] : f.kc.upper[i] < f.wv[i];
            O[i] = !mon && s * (f.dv[i] - f.wv[i]) > 0;
            B[i] = f.st[i] === s;
        }
        return { D, W, O, B };
    };
    return { 1: mk(1), [-1]: mk(-1) };
}

const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : '-');
const tOf = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); return { m, t: m / (sd / Math.sqrt(xs.length)) }; };
let seed = 4242;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const R = {};
for (const sym of COINS) {
    const d = load(sym, TICKS[sym], DATA);
    const C = conds(d);
    for (const [key] of SETS) for (const side of [1, -1]) {
        const c = C[side];
        const on = (i) => { for (const k of key) if (!c[k][i]) return false; return true; };
        const trig = (dd, i) => on(i) && !on(i - 1);
        const cfg = (tr, hold, ext) => ({ side, trig: tr, entry: ENTRIES.MKT, stopX: STOPX.NONE, rr: 1, maxHold: hold, exitRule: 'NONE', extend: ext ? (dd, j) => on(j) : undefined });
        const trades = simulate(d, cfg(trig, HOLD, true));
        const st = statsOf(trades, d.split);
        const L = Math.max(1, Math.round(trades.reduce((a, t) => a + t.bars, 0) / (trades.length || 1)));
        let ev = 0; for (let i = WARMUP + 1; i < d.bars.n; i++) if (trig(d, i)) ev++;
        const prob = ev / (d.bars.n - WARMUP);
        let rs = 0;
        for (let k = 0; k < SIMS; k++) {
            const set = new Uint8Array(d.bars.n);
            for (let i = WARMUP; i < d.bars.n; i++) if (rnd() < prob) set[i] = 1;
            const tr = simulate(d, cfg((dd, i) => set[i] === 1, L, false));
            rs += tr.length ? tr.reduce((x, t) => x + t.net, 0) / tr.length : 0;
        }
        ((R[key] ??= {})[side] ??= {})[sym] = { ...st, excess: st.all.avg - rs / SIMS, L };
    }
    process.stdout.write(`\r${sym} done   `);
}

md('# Ablation: thành phần nào trong cách đọc chart thực sự đóng góp?\n');
md(`Chiến thuật H3 (vào market khi tất cả điều kiện của dòng cùng đúng, giữ ${HOLD} nến kể từ lần cuối còn đúng, không stop), 12 coin kiểm định: ${COINS.join(', ')}. Excess = so với vào ngẫu nhiên cùng tần suất, giữ cố định bằng số nến giữ TB (${SIMS} lần mô phỏng).\n`);
const rows = [];
for (const [key, name] of SETS) {
    const r = [`\`${key}\` ${name}`];
    for (const side of [1, -1]) {
        const per = COINS.map((s) => R[key][side][s]);
        const ex = tOf(per.map((x) => x.excess)), av = tOf(per.map((x) => x.all.avg));
        r.push(Math.round(per.reduce((a, x) => a + x.all.n, 0) / per.length), `${bps(av.m)}`, `${bps(ex.m)} (t ${f2(ex.t)}, ${per.filter((x) => x.excess > 0).length}/12)`,
            `${bps(tOf(per.map((x) => x.is.avg)).m)} / ${bps(tOf(per.map((x) => x.oos.avg)).m)}`);
    }
    rows.push(r);
}
md(table(['Điều kiện', 'LONG lệnh/coin', 'LONG avg bps', 'LONG excess (t, # coin)', 'LONG IS / OOS', 'SHORT lệnh/coin', 'SHORT avg bps', 'SHORT excess (t, # coin)', 'SHORT IS / OOS'], rows));
md('`D` KC trọn phía VWAP phiên · `W` KC trọn phía VWAP tuần · `O` VWAP phiên nằm phía đó so với VWAP tuần (thứ Hai không tính) · `B` ATRBot cùng hướng.\n');
writeFileSync(join(HERE, 'reports', 'ABLATE_multi.md'), out.join('\n'));
console.log('\n' + out.join('\n'));
