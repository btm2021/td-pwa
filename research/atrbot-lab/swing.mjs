// Chiến thuật từ cách đọc chart, ở khung nắm giữ 12–24h (nơi event study thấy có thông tin).
// Điểm "nhiệt kế" tại mỗi nến (đọc theo hướng s):
//   +1 KC(9,0.5) nằm trọn phía s của VWAP phiên (xanh)
//   +1 KC nằm trọn phía s của VWAP tuần (đỏ)
//   +1 cấu trúc VWAP: xanh phía s của đỏ (thứ Hai 2 đường trùng -> 0)
//   +1 ATRBot cùng hướng s
// score = điểm(long) - điểm(short), từ -4 đến +4.
// Usage: node swing.mjs [symbol=IMXUSDT] [check=SOLUSDT]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as loadSym, bracket, simulate, statsOf, TRIGS, ENTRIES, STOPX, FEE, WARMUP } from './lib/swing-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [SYM = 'IMXUSDT', CHECK = 'SOLUSDT'] = process.argv.slice(2);
const TICK = { IMXUSDT: 0.0001, SOLUSDT: 0.01 };
const load = (sym) => loadSym(sym, TICK[sym], join(HERE, 'data'));

const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const pct = (x, d = 0) => (isFinite(x) ? (x * 100).toFixed(d) + '%' : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : x === Infinity ? '∞' : '-');

const D = { [SYM]: load(SYM), [CHECK]: load(CHECK) };

// ================= 1. Nhiệt kế =================
md(`# Chiến thuật từ cách đọc chart — ${SYM} (kiểm tra chéo ${CHECK}), khung nắm giữ 12–24h\n`);
md('**Điểm nhiệt kế** (đọc theo mỗi hướng, rồi lấy long − short, từ −4 đến +4): +1 KC trọn phía VWAP phiên · +1 KC trọn phía VWAP tuần · +1 VWAP phiên nằm phía đó so với VWAP tuần (thứ Hai = 0) · +1 ATRBot cùng hướng.\n');
md('## 1. Nhiệt kế: điểm càng cao thì giá có đi theo hướng đó nhiều hơn không?\n');
md('Lấy mẫu **mỗi 16 nến một lần** (không chồng lấn quá nhiều). "Lên 24h" = lợi nhuận close→close sau 96 nến, trừ drift. Bracket ±2%/24h: tỉ lệ +2% trước trừ tỉ lệ −2% trước, theo hướng **tăng**.\n');
{
    const rows = [];
    for (let sc = -4; sc <= 4; sc++) {
        const r = [sc > 0 ? `+${sc}` : `${sc}`];
        for (const sym of [SYM, CHECK]) {
            const { bars, score, split } = D[sym];
            let drift = 0, k = 0;
            for (let i = WARMUP; i < bars.n - 96; i += 16) { drift += bars.c[i + 96] / bars.c[i] - 1; k++; }
            drift /= k;
            const acc = { is: [], oos: [] }; let up = 0, dn = 0;
            for (let i = WARMUP; i < bars.n - 96; i += 16) {
                if (score[i] !== sc) continue;
                (i < split ? acc.is : acc.oos).push(bars.c[i + 96] / bars.c[i] - 1 - drift);
                const b = bracket(bars, i, 96, 1, 0.02); if (b > 0) up++; else if (b < 0) dn++;
            }
            const all = [...acc.is, ...acc.oos], m = (a) => a.reduce((x, y) => x + y, 0) / a.length;
            const sd = Math.sqrt(m(all.map((x) => x * x)) - m(all) ** 2);
            r.push(all.length, `${bps(m(all))} (t ${f2(m(all) / (sd / Math.sqrt(all.length)))})`, `${bps(m(acc.is))} / ${bps(m(acc.oos))}`, `${pct(up / all.length)}−${pct(dn / all.length)} = ${((up - dn) / all.length * 100).toFixed(0)}`);
        }
        rows.push(r);
    }
    const h = ['Score']; for (const s of [SYM, CHECK]) h.push(`${s} n`, 'Lên 24h bps (t)', 'IS / OOS bps', 'Bracket ±2% (tăng)');
    md(table(h, rows));
}

// ================= 2. Chiến thuật =================
// Mỗi event tạo một lệnh chờ hiệu lực W nến; khớp xong thì quản lý bằng stop/TP cố định, time stop và tín hiệu thoát.
const RRS = [1, 1.5];
const HOLDS = [48, 96];
const EXITR = { NONE: 'chỉ stop/TP/time', VETO: 'thoát khi ATRBot đổi chiều', SCORE: 'thoát khi score về 0 hoặc ngược' };

const run = (sym, c) => { const d = D[sym]; const tr = simulate(d, { side: c.side, trig: TRIGS[c.trig].fn, entry: ENTRIES[c.entry], stopX: STOPX[c.stop], rr: c.rr, maxHold: c.hold, exitRule: c.exit }); return { trades: tr, ...statsOf(tr, d.split) }; };
const label = (c) => `${c.side > 0 ? 'LONG' : 'SHORT'} ${c.trig}·${c.entry}·${c.stop}·${c.rr}R·${c.hold}·${c.exit}`;

const grid = [];
for (const trig of Object.keys(TRIGS)) for (const entry of Object.keys(ENTRIES)) for (const stop of ['P2', 'P3', 'A3', 'A5'])
    for (const rr of RRS) for (const hold of HOLDS) for (const exit of Object.keys(EXITR)) for (const side of [1, -1]) {
        const c = { trig, entry, stop, rr, hold, exit, side };
        c.res = run(SYM, c);
        c.chk = run(CHECK, c).all;
        grid.push(c);
    }

md('## 2. Chiến thuật: event → lệnh chờ → stop/TP rộng, giữ 12–24h\n');
md(`Phí maker ${pct(FEE.maker, 2)} / taker ${pct(FEE.taker, 2)}, stop và lệnh market trượt 1 tick, limit phải xuyên 1 tick mới khớp. Lệnh chờ bị huỷ khi ATRBot đổi chiều. ${grid.length} cấu hình.\n`);
md('**Trigger:** ' + Object.entries(TRIGS).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; '));
md('**Entry:** ' + Object.entries(ENTRIES).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; '));
md('**Stop:** ' + Object.entries(STOPX).filter(([k]) => ['P2', 'P3', 'A3', 'A5'].includes(k)).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + `; TP = ${RRS.join(' / ')} × stop; giữ tối đa ${HOLDS.join(' / ')} nến.`);
md('**Exit thêm:** ' + Object.entries(EXITR).map(([k, v]) => `\`${k}\` ${v}`).join('; ') + '\n');

const H = ['Cấu hình', 'IS n', 'IS win', 'IS avg bps', 'IS PF', 'IS t', 'OOS n', 'OOS win', 'OOS avg bps', 'OOS PF', `${CHECK} n`, `${CHECK} avg bps`, `${CHECK} PF`];
const row = (c) => [label(c), c.res.is.n, pct(c.res.is.win), bps(c.res.is.avg), f2(c.res.is.pf), f2(c.res.is.t), c.res.oos.n, pct(c.res.oos.win), bps(c.res.oos.avg), f2(c.res.oos.pf), c.chk.n, bps(c.chk.avg), f2(c.chk.pf)];

md('### 2a. Đóng góp từng thành phần (trung bình avg net bps toàn bộ dữ liệu)\n');
{
    const rows = [];
    for (const [key, opts] of [['trig', Object.keys(TRIGS)], ['entry', Object.keys(ENTRIES)], ['stop', ['P2', 'P3', 'A3', 'A5']], ['rr', RRS], ['hold', HOLDS], ['exit', Object.keys(EXITR)]])
        for (const v of opts) for (const side of [1, -1]) {
            const g = grid.filter((c) => c[key] === v && c.side === side && c.res.all.n >= 20);
            const m = (fn) => g.reduce((a, c) => a + fn(c), 0) / g.length;
            rows.push([`${key} = ${v}`, side > 0 ? 'LONG' : 'SHORT', Math.round(m((c) => c.res.all.n)), bps(m((c) => c.res.is.avg)), bps(m((c) => c.res.oos.avg)), bps(m((c) => c.chk.avg)), `${g.filter((c) => c.res.all.avg > 0).length}/${g.length}`]);
        }
    md(table(['Thành phần', 'Chiều', 'n TB', `${SYM} IS`, `${SYM} OOS`, CHECK, '# dương'], rows));
}

const MIN_IS = 40;
const byIS = grid.filter((c) => c.res.is.n >= MIN_IS).sort((a, b) => b.res.is.t - a.res.is.t);
md(`### 2b. Top 15 theo t-stat IS (n IS ≥ ${MIN_IS}) — OOS và ${CHECK} là phép thử\n`);
md(table(H, byIS.slice(0, 15).map(row)));
md(`→ Top 15 theo IS: **${byIS.slice(0, 15).filter((c) => c.res.oos.avg > 0).length}/15 dương ở OOS**, **${byIS.slice(0, 15).filter((c) => c.chk.avg > 0).length}/15 dương trên ${CHECK}**, **${byIS.slice(0, 15).filter((c) => c.res.oos.avg > 0 && c.chk.avg > 0).length}/15 dương cả hai**.\n`);

const robust = grid.filter((c) => c.res.is.n >= 30 && c.res.oos.n >= 20 && c.chk.n >= 40 && c.res.is.avg > 0 && c.res.oos.avg > 0 && c.chk.avg > 0)
    .sort((a, b) => Math.min(b.res.is.t, b.chk.t ?? 0) - Math.min(a.res.is.t, a.chk.t ?? 0));
md(`### 2c. Dương ở cả IS, OOS và ${CHECK}: ${robust.length}/${grid.length}\n`);
md('(Đã nhìn OOS nên có thiên lệch chọn lọc — chỉ để thấy vùng nào ổn định.)\n');
md(table(H, robust.slice(0, 20).map(row)));
{
    // vùng nào xuất hiện nhiều trong robust
    const cnt = {};
    for (const c of robust) for (const k of ['trig', 'entry', 'stop', 'rr', 'hold', 'exit', 'side']) { const key = `${k}=${c[k]}`; cnt[key] = (cnt[key] || 0) + 1; }
    md('Tần suất thành phần trong nhóm bền: ' + Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} (${v})`).join(', ') + '\n');
}

// ================= 3. Ngẫu nhiên đối chứng cho top nhóm bền =================
md('## 3. So với cùng cách quản lý lệnh nhưng **vào ngẫu nhiên**\n');
md('Giữ nguyên entry/stop/TP/time/exit, chỉ thay trigger bằng nến ngẫu nhiên (cùng số event). 300 lần mô phỏng mỗi cấu hình. p = tỉ lệ ngẫu nhiên ≥ thực tế.\n');
{
    let seed = 99; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rows = [];
    const list = robust.length ? robust.slice(0, 6) : byIS.slice(0, 6);
    for (const c of list) {
        const r = [label(c)];
        for (const sym of [SYM, CHECK]) {
            const d = D[sym];
            const real = sym === SYM ? c.res.all : c.chk;
            // số event thật
            let ev = 0; for (let i = WARMUP + 1; i < d.bars.n; i++) if (TRIGS[c.trig].fn(d, i, c.side)) ev++;
            const prob = ev / (d.bars.n - WARMUP);
            let ge = 0;
            for (let k = 0; k < 300; k++) {
                const set = new Uint8Array(d.bars.n); for (let i = WARMUP; i < d.bars.n; i++) if (rnd() < prob) set[i] = 1;
                const tr = simulate(d, { side: c.side, trig: (dd, i) => set[i] === 1, entry: ENTRIES[c.entry], stopX: STOPX[c.stop], rr: c.rr, maxHold: c.hold, exitRule: c.exit });
                const a = tr.reduce((x, t) => x + t.net, 0) / (tr.length || 1);
                if (a >= real.avg) ge++;
            }
            r.push(real.n, bps(real.avg), (ge / 300).toFixed(3));
        }
        rows.push(r);
    }
    md(table(['Cấu hình', `${SYM} n`, 'avg bps', 'p', `${CHECK} n`, 'avg bps', 'p'], rows));
}

// ================= 4. Chi tiết cấu hình đại diện =================
const pick = (robust[0] ?? byIS[0]);
md(`## 4. Chi tiết: ${label(pick)}\n`);
for (const sym of [SYM, CHECK]) {
    const r = run(sym, pick);
    const byHalf = {};
    for (const t of r.trades) { const dt = new Date(D[sym].bars.t[t.idx]); (byHalf[`${dt.getUTCFullYear()}${dt.getUTCMonth() < 6 ? 'H1' : 'H2'}`] ??= []).push(t); }
    const why = {}; for (const t of r.trades) why[t.why] = (why[t.why] || 0) + 1;
    md(`### ${sym}: n=${r.all.n}, win ${pct(r.all.win)}, avg ${bps(r.all.avg)} bps, PF ${f2(r.all.pf)}, tổng ${pct(r.all.total, 1)}, maxDD ${pct(r.all.dd, 1)}, giữ TB ${(r.trades.reduce((a, t) => a + t.bars, 0) / r.trades.length).toFixed(0)} nến. Thoát: ${Object.entries(why).map(([k, v]) => `${k} ${pct(v / r.trades.length)}`).join(', ')}\n`);
    md(table(['Nửa năm', 'n', 'Win', 'Avg bps', 'PF', 'Tổng'], Object.entries(byHalf).map(([k, ts]) => { const s = statsOf(ts, Infinity).all; return [k, s.n, pct(s.win), bps(s.avg), f2(s.pf), pct(s.total, 1)]; })));
}

mkdirSync(join(HERE, 'reports'), { recursive: true });
writeFileSync(join(HERE, 'reports', `SWING_${SYM}.md`), out.join('\n'));
console.log(out.join('\n'));
