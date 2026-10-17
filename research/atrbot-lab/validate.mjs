// Kiểm định ngoài mẫu trên nhiều coin: các ứng viên được CHỐT từ swing.mjs (IMX + SOL) trước khi nhìn các coin này.
// Thước đo chính: chênh lệch so với cùng cách quản lý lệnh nhưng vào lệnh ngẫu nhiên (loại bỏ drift thị trường).
// Usage: node validate.mjs [sims=200]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, simulate, statsOf, TRIGS, ENTRIES, STOPX, WARMUP } from './lib/swing-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const SIMS = Number(process.argv[2] || 200);
const TICKS = JSON.parse(readFileSync(join(DATA, 'ticks.json'), 'utf8'));
const DEV = ['IMXUSDT', 'SOLUSDT']; // dùng để phát triển -> không tính vào kiểm định
const COINS = readdirSync(DATA).filter((f) => f.endsWith('_15m_futures.csv')).map((f) => f.split('_')[0]).filter((s) => !DEV.includes(s)).sort();

// Ứng viên đã chốt (không chỉnh sau khi xem kết quả)
const CANDS = [
    { id: 'A', side: 1, trig: 'S3', entry: 'BASIS', stop: 'A5', rr: 1.5, hold: 96, exit: 'SCORE', why: 'cấu hình bền nhất trên IMX/SOL' },
    { id: 'B', side: 1, trig: 'S4', entry: 'BASIS', stop: 'A5', rr: 1.5, hold: 96, exit: 'SCORE', why: 'nhiệt kế: chỉ score +4 có thông tin' },
    { id: 'C', side: -1, trig: 'S3', entry: 'BASIS', stop: 'A5', rr: 1.5, hold: 96, exit: 'SCORE', why: 'đối xứng của A (kiểm tra short)' },
    { id: 'D', side: -1, trig: 'S4', entry: 'BASIS', stop: 'A5', rr: 1.5, hold: 96, exit: 'SCORE', why: 'đối xứng của B' },
    { id: 'E', side: 1, trig: 'S4', entry: 'MKT', stop: 'A5', rr: 1.5, hold: 96, exit: 'SCORE', why: 'như B nhưng vào market (chờ hồi có giá trị?)' },
];
const label = (c) => `${c.id}: ${c.side > 0 ? 'LONG' : 'SHORT'} ${c.trig}·${c.entry}·${c.stop}·${c.rr}R·${c.hold}·${c.exit}`;
const cfgOf = (c, trig) => ({ side: c.side, trig, entry: ENTRIES[c.entry], stopX: STOPX[c.stop], rr: c.rr, maxHold: c.hold, exitRule: c.exit });

const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : '-');
const tOf = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); return { m, t: m / (sd / Math.sqrt(xs.length)) }; };

let seed = 2026;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

md('# Kiểm định ngoài mẫu trên nhiều coin (Binance futures 15m)\n');
md(`Coin kiểm định (không dùng khi phát triển): ${COINS.join(', ')}. IMX và SOL đã dùng để chọn ứng viên nên **không** tính ở đây.\n`);
md('Ứng viên được chốt trước khi xem các coin này:\n');
for (const c of CANDS) md(`- **${label(c)}** — ${c.why}`);
md('\n**Excess** = avg net của chiến thuật − avg net trung bình của ' + SIMS + ' lần vào ngẫu nhiên với **cùng** entry/stop/TP/thoát và cùng tần suất. Excess > 0 nghĩa là thời điểm do tín hiệu chọn tốt hơn ngẫu nhiên. p = tỉ lệ lần ngẫu nhiên ≥ thực tế.\n');

const res = {}; // res[cand][coin]
const thermo = [];
for (const sym of COINS) {
    const d = load(sym, TICKS[sym], DATA);
    // nhiệt kế: score ±4 -> lợi nhuận 24h trừ drift, lấy mẫu mỗi 16 nến
    let drift = 0, k = 0;
    for (let i = WARMUP; i < d.bars.n - 96; i += 16) { drift += d.bars.c[i + 96] / d.bars.c[i] - 1; k++; }
    drift /= k;
    const th = { sym };
    for (const sc of [4, -4]) {
        const xs = [];
        for (let i = WARMUP; i < d.bars.n - 96; i += 16) if (d.score[i] === sc) xs.push(d.bars.c[i + 96] / d.bars.c[i] - 1 - drift);
        th[sc] = tOf(xs);
        th[`n${sc}`] = xs.length;
    }
    thermo.push(th);

    for (const c of CANDS) {
        const real = statsOf(simulate(d, cfgOf(c, TRIGS[c.trig].fn)), d.split);
        let ev = 0; for (let i = WARMUP + 1; i < d.bars.n; i++) if (TRIGS[c.trig].fn(d, i, c.side)) ev++;
        const prob = ev / (d.bars.n - WARMUP);
        const rand = [];
        for (let s = 0; s < SIMS; s++) {
            const set = new Uint8Array(d.bars.n);
            for (let i = WARMUP; i < d.bars.n; i++) if (rnd() < prob) set[i] = 1;
            const tr = simulate(d, cfgOf(c, (dd, i) => set[i] === 1));
            rand.push(tr.length ? tr.reduce((a, t) => a + t.net, 0) / tr.length : 0);
        }
        const rm = rand.reduce((a, b) => a + b, 0) / SIMS;
        (res[c.id] ??= {})[sym] = { ...real, randAvg: rm, excess: real.all.avg - rm, p: rand.filter((x) => x >= real.all.avg).length / SIMS };
    }
    process.stdout.write(`\r${sym} done   `);
}

// 1. Nhiệt kế trên coin mới
md('## 1. Nhiệt kế score ±4 trên coin mới (lợi nhuận 24h trừ drift, bps)\n');
md(table(['Coin', 'n (+4)', '+4: bps (t)', 'n (−4)', '−4: bps (t)'], thermo.map((t) => [t.sym, t['n4'], `${bps(t[4].m)} (${f2(t[4].t)})`, t['n-4'], `${bps(t[-4].m)} (${f2(t[-4].t)})`])));
{
    const p4 = tOf(thermo.map((t) => t[4].m)), m4 = tOf(thermo.map((t) => t[-4].m));
    md(`→ Score +4: ${thermo.filter((t) => t[4].m > 0).length}/${thermo.length} coin dương, TB ${bps(p4.m)} bps (t giữa các coin ${f2(p4.t)}). ` +
        `Score −4 (kỳ vọng âm): ${thermo.filter((t) => t[-4].m < 0).length}/${thermo.length} coin âm, TB ${bps(m4.m)} bps (t ${f2(m4.t)}).\n`);
}

// 2. Tổng hợp từng ứng viên
md('## 2. Tổng hợp ứng viên trên các coin kiểm định\n');
{
    const rows = CANDS.map((c) => {
        const per = COINS.map((s) => res[c.id][s]);
        const ex = tOf(per.map((x) => x.excess));
        const av = tOf(per.map((x) => x.all.avg));
        const nTot = per.reduce((a, x) => a + x.all.n, 0);
        return [label(c), nTot, `${bps(av.m)} (${per.filter((x) => x.all.avg > 0).length}/${COINS.length} dương)`,
            `${bps(ex.m)} (t ${f2(ex.t)})`, `${per.filter((x) => x.excess > 0).length}/${COINS.length}`, `${per.filter((x) => x.p < 0.1).length}/${COINS.length}`,
            bps(tOf(per.map((x) => x.oos.avg)).m)];
    });
    md(table(['Ứng viên', 'Tổng lệnh', 'Avg net bps TB (# coin dương)', 'Excess vs ngẫu nhiên TB (t giữa coin)', '# coin excess > 0', '# coin p < 0.1', 'Avg net OOS (40% cuối) TB'], rows));
}

// 3. Chi tiết từng coin
md('## 3. Chi tiết theo coin\n');
for (const c of CANDS) {
    md(`### ${label(c)}\n`);
    md(table(['Coin', 'n', 'Win', 'Avg net bps', 'PF', 'Ngẫu nhiên bps', 'Excess bps', 'p', 'IS / OOS bps'],
        COINS.map((s) => { const x = res[c.id][s]; return [s, x.all.n, `${(x.all.win * 100).toFixed(0)}%`, bps(x.all.avg), f2(x.all.pf), bps(x.randAvg), bps(x.excess), x.p.toFixed(2), `${bps(x.is.avg)} / ${bps(x.oos.avg)}`]; })));
}

writeFileSync(join(HERE, 'reports', 'VALIDATE_multi.md'), out.join('\n'));
console.log('\n' + out.slice(0, out.findIndex((l) => l.startsWith('## 3.'))).join('\n'));
