// Chiến thuật "nhiệt kế": vào khi score chạm ±4, giữ 24h tính từ lần cuối score còn ±4.
// Đúng với cách nhiệt kế được đo (lợi nhuận 24h sau mỗi nến score ±4) — không chờ hồi, không thoát sớm.
// Đối chứng: vào ngẫu nhiên, cùng tần suất, giữ cố định bằng số nến giữ TB của chiến thuật, cùng stop.
// Usage: node hold24.mjs [sims=100]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, simulate, statsOf, ENTRIES, STOPX, WARMUP } from './lib/swing-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const SIMS = Number(process.argv[2] || 100);
const TICKS = JSON.parse(readFileSync(join(DATA, 'ticks.json'), 'utf8'));
const DEV = ['IMXUSDT', 'SOLUSDT'];
const COINS = readdirSync(DATA).filter((f) => f.endsWith('_15m_futures.csv')).map((f) => f.split('_')[0]).sort();

const at4 = (d, i, s) => s * d.score[i] === 4;
const event4 = (d, i, s) => at4(d, i, s) && !at4(d, i - 1, s);
const VARIANTS = [
    { id: 'H1', desc: 'giữ 96 nến kể từ lần cuối score ±4, không stop', hold: 96, extend: true, stop: 'NONE' },
    { id: 'H2', desc: 'như H1 + stop thảm hoạ 8 ATR', hold: 96, extend: true, stop: 'A8' },
    { id: 'H3', desc: 'giữ 48 nến kể từ lần cuối score ±4, không stop', hold: 48, extend: true, stop: 'NONE' },
    { id: 'H4', desc: 'giữ đúng 96 nến từ lúc vào, không gia hạn, không stop', hold: 96, extend: false, stop: 'NONE' },
];
const cfgOf = (v, side, trig, hold = v.hold, extend = v.extend) => ({
    side, trig, entry: ENTRIES.MKT, stopX: STOPX[v.stop], rr: 1, maxHold: hold, exitRule: 'NONE', extend: extend ? at4 : undefined,
});

const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const pct = (x, d = 0) => (isFinite(x) ? (x * 100).toFixed(d) + '%' : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : '-');
const tOf = (xs) => { const m = xs.reduce((a, b) => a + b, 0) / xs.length; const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); return { m, t: m / (sd / Math.sqrt(xs.length)) }; };
let seed = 777;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

const R = {}; // R[variant][side][coin]
for (const sym of COINS) {
    const d = load(sym, TICKS[sym], DATA);
    for (const v of VARIANTS) for (const side of [1, -1]) {
        const trades = simulate(d, cfgOf(v, side, event4));
        const st = statsOf(trades, d.split);
        const L = Math.max(1, Math.round(trades.reduce((a, t) => a + t.bars, 0) / (trades.length || 1)));
        let ev = 0; for (let i = WARMUP + 1; i < d.bars.n; i++) if (event4(d, i, side)) ev++;
        const prob = ev / (d.bars.n - WARMUP);
        let rs = 0, ge = 0;
        for (let k = 0; k < SIMS; k++) {
            const set = new Uint8Array(d.bars.n);
            for (let i = WARMUP; i < d.bars.n; i++) if (rnd() < prob) set[i] = 1;
            const tr = simulate(d, cfgOf(v, side, (dd, i) => set[i] === 1, L, false));
            const a = tr.length ? tr.reduce((x, t) => x + t.net, 0) / tr.length : 0;
            rs += a; if (a >= st.all.avg) ge++;
        }
        // phơi nhiễm: % thời gian có vị thế
        const exposure = trades.reduce((a, t) => a + t.bars, 0) / (d.bars.n - WARMUP);
        ((R[v.id] ??= {})[side] ??= {})[sym] = { ...st, trades, L, exposure, rand: rs / SIMS, excess: st.all.avg - rs / SIMS, p: ge / SIMS, d };
    }
    process.stdout.write(`\r${sym} done    `);
}

md('# Chiến thuật "nhiệt kế ±4" — giữ 24h theo đúng cách nhiệt kế được đo\n');
md('**Score** (mỗi hướng): +1 KC(9,0.5) trọn phía VWAP phiên · +1 KC trọn phía VWAP tuần · +1 VWAP phiên nằm phía đó so với VWAP tuần (thứ Hai = 0) · +1 ATRBot cùng hướng. Score = long − short.\n');
md('**Luật:** khi nến đóng có score chạm +4 (−4) → mua (bán) market ở open nến kế. Mỗi lần score lại = ±4 thì gia hạn. Thoát khi đã đủ thời gian giữ kể từ lần cuối score = ±4. Phí taker 0.05% + trượt 1 tick mỗi chiều.\n');
md(`Coin phát triển (đã dùng để chọn ý tưởng): ${DEV.join(', ')}. Coin kiểm định: ${COINS.filter((s) => !DEV.includes(s)).join(', ')}.\n`);
md(`**Excess** = avg net − avg net khi vào ngẫu nhiên (cùng tần suất, giữ cố định bằng số nến giữ TB, cùng stop), ${SIMS} lần mô phỏng.\n`);

md('## 1. Tổng hợp trên 12 coin kiểm định\n');
{
    const rows = [];
    for (const v of VARIANTS) for (const side of [1, -1]) {
        const per = COINS.filter((s) => !DEV.includes(s)).map((s) => R[v.id][side][s]);
        const ex = tOf(per.map((x) => x.excess)), av = tOf(per.map((x) => x.all.avg));
        rows.push([`${v.id} ${side > 0 ? 'LONG' : 'SHORT'}`, v.desc, per.reduce((a, x) => a + x.all.n, 0), `${bps(av.m)} (${per.filter((x) => x.all.avg > 0).length}/12)`,
            `${bps(ex.m)} (t ${f2(ex.t)})`, `${per.filter((x) => x.excess > 0).length}/12`,
            `${bps(tOf(per.map((x) => x.is.avg)).m)} / ${bps(tOf(per.map((x) => x.oos.avg)).m)}`,
            `${(per.reduce((a, x) => a + x.L, 0) / 12).toFixed(0)} nến`, pct(per.reduce((a, x) => a + x.exposure, 0) / 12)]);
    }
    md(table(['Biến thể', 'Mô tả', 'Tổng lệnh', 'Avg net bps (# coin dương)', 'Excess vs ngẫu nhiên (t giữa coin)', '# coin excess > 0', 'IS / OOS bps', 'Giữ TB', 'Thời gian có vị thế'], rows));
}

// 2. Sổ long + short kết hợp theo từng coin: lợi nhuận theo năm, mỗi lệnh 1 đơn vị vốn
const YEARS = [2023, 2024, 2025, 2026];
const yearOf = (sym, idx) => new Date(R.H1[1][sym].d.bars.t[idx]).getUTCFullYear();
for (const vid of ['H3', 'H1']) {
    md(`## 2${vid === 'H3' ? 'a' : 'b'}. Sổ kết hợp LONG + SHORT (${vid}) theo coin — mỗi lệnh 1 đơn vị vốn danh nghĩa\n`);
    const rows = [];
    for (const sym of COINS) {
        const byY = {};
        let tot = 0, eq = 0, pk = 0, dd = 0;
        // cộng dồn theo thời điểm đóng lệnh
        const all = [...R[vid][1][sym].trades, ...R[vid][-1][sym].trades].sort((a, b) => a.j - b.j);
        for (const t of all) {
            const y = yearOf(sym, t.idx);
            byY[y] = (byY[y] || 0) + t.net; tot += t.net; eq += t.net; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq);
        }
        rows.push([sym + (DEV.includes(sym) ? ' (phát triển)' : ''), all.length, ...YEARS.map((y) => pct(byY[y] ?? 0, 1)), pct(tot, 1), pct(dd, 1), f2(dd > 0 ? tot / dd : NaN)]);
    }
    md(table(['Coin', 'Lệnh', '2023 (3 tuần)', '2024', '2025', '2026 (đến 17/10)', 'Tổng', 'MaxDD', 'Tổng / MaxDD'], rows));
}
md('> Lợi nhuận đơn (không lãi kép), mỗi lệnh 1 đơn vị vốn, đã trừ phí. Long và short tính như 2 sổ riêng: khi score đổi nhanh từ +4 sang −4, hai lệnh có thể chồng nhau trong thời gian ngắn.\n');

// 2c. Danh mục: chia vốn đều cho 12 coin kiểm định, mỗi coin 2 sổ (long, short) -> mỗi lệnh dùng 1/24 vốn
md('## 2c. Danh mục H3 trên 12 coin kiểm định — vốn chia đều, mỗi lệnh dùng 1/24 vốn (long + short mỗi coin)\n');
{
    const val = COINS.filter((s) => !DEV.includes(s));
    const ev = [];
    for (const s of val) for (const side of [1, -1]) for (const t of R.H3[side][s].trades) ev.push({ time: R.H3[side][s].d.bars.t[t.j], net: t.net / (val.length * 2) });
    ev.sort((a, b) => a.time - b.time);
    let eq = 0, pk = 0, dd = 0; const byY = {}; const monthly = {};
    for (const e of ev) {
        eq += e.net; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq);
        const dt = new Date(e.time); byY[dt.getUTCFullYear()] = (byY[dt.getUTCFullYear()] || 0) + e.net;
        const mk = dt.toISOString().slice(0, 7); monthly[mk] = (monthly[mk] || 0) + e.net;
    }
    const ms = Object.values(monthly), mPos = ms.filter((x) => x > 0).length;
    const mm = tOf(ms);
    md(table(['Chỉ số', 'Giá trị'], [
        ['Tổng lợi nhuận (đơn, trên vốn)', pct(eq, 1)],
        ...YEARS.map((y) => [`Năm ${y}`, pct(byY[y] ?? 0, 1)]),
        ['Max drawdown', pct(dd, 1)],
        ['Tổng / MaxDD', f2(eq / dd)],
        ['Tháng dương', `${mPos}/${ms.length}`],
        ['Lợi nhuận tháng TB (t)', `${pct(mm.m, 2)} (${f2(mm.t)})`],
        ['Tháng tệ nhất / tốt nhất', `${pct(Math.min(...ms), 1)} / ${pct(Math.max(...ms), 1)}`],
    ]));
    md('> Chưa dùng đòn bẩy: mỗi lệnh 1/24 vốn, tối đa 24 lệnh cùng lúc = 100% vốn. Thực tế phơi nhiễm TB ~ 31–36% × 24 sổ.\n');
}

// 3. Chi tiết từng coin
md('## 3. Chi tiết theo coin\n');
for (const v of VARIANTS) for (const side of [1, -1]) {
    md(`### ${v.id} ${side > 0 ? 'LONG' : 'SHORT'} — ${v.desc}\n`);
    md(table(['Coin', 'n', 'Win', 'Avg net bps', 'PF', 'Ngẫu nhiên bps', 'Excess', 'p', 'IS / OOS bps'], COINS.map((s) => {
        const x = R[v.id][side][s];
        return [s + (DEV.includes(s) ? ' *' : ''), x.all.n, pct(x.all.win), bps(x.all.avg), f2(x.all.pf), bps(x.rand), bps(x.excess), x.p.toFixed(2), `${bps(x.is.avg)} / ${bps(x.oos.avg)}`];
    })));
}
md('\\* = coin phát triển.\n');

writeFileSync(join(HERE, 'reports', 'HOLD24_multi.md'), out.join('\n'));
console.log('\n' + out.slice(0, out.findIndex((l) => l.startsWith('## 3.'))).join('\n'));
