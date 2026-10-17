// Tìm pattern theo cách đọc chart — không dùng mốc thời gian cố định.
// Mỗi nến được mô tả bằng: VWAP xanh (phiên) vs đỏ (tuần), dải KC(9,0.5) vs từng VWAP, màu ATRBot.
// Các nến liền nhau cùng trạng thái = 1 "đoạn". Pattern = 1–3 đoạn liên tiếp (lookback) kết thúc bằng đoạn vừa xuất hiện.
// Kết quả đo từ close nến pattern hoàn tất cho tới TÍN HIỆU NGƯỢC rõ ràng:
//   long kết thúc khi cả dải KC nằm dưới VWAP phiên; short kết thúc khi cả dải KC nằm trên VWAP phiên.
// Usage: node patterns.mjs [target=0.02] [focus=IMXUSDT]
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { load, WARMUP } from './lib/swing-core.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, 'data');
const [targetArg = '0.02', FOCUS = 'IMXUSDT'] = process.argv.slice(2);
const TARGET = Number(targetArg);
const COST = 0.0012;      // phí taker 2 chiều + trượt giá ước lượng
const CAP = 1500;         // chặn an toàn ~15 ngày nếu tín hiệu ngược không xuất hiện
const MIN_IS = 150;       // số lần xuất hiện tối thiểu trên IS (gộp các coin)
const TICKS = JSON.parse(readFileSync(join(DATA, 'ticks.json'), 'utf8'));
const COINS = readdirSync(DATA).filter((f) => f.endsWith('_15m_futures.csv')).map((f) => f.split('_')[0]).sort();

const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
const pct = (x, d = 0) => (isFinite(x) ? (x * 100).toFixed(d) + '%' : '-');
const pp = (x) => (isFinite(x) ? (x >= 0 ? '+' : '') + (x * 100).toFixed(1) : '-');
const median = (a) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

// ---------- mô tả trạng thái bằng ngôn ngữ chart ----------
// code = v kd kw b  (v: 1 xanh>đỏ, -1 xanh<đỏ, 0 thứ Hai; kd/kw: 1 KC trọn trên, -1 trọn dưới, 0 cắt; b: ATRBot)
function stateLabel(code) {
    const [v, kd, kw, b] = code.split(',').map(Number);
    const kv = (k, name) => (k > 0 ? `KC trên ${name}` : k < 0 ? `KC dưới ${name}` : `KC cắt ${name}`);
    const parts = [v > 0 ? 'Xanh>Đỏ' : v < 0 ? 'Xanh<Đỏ' : 'T2 (Xanh=Đỏ)'];
    if (v === 0) parts.push(kv(kd, 'VWAP'));
    else parts.push(kv(kd, 'Xanh'), kv(kw, 'Đỏ'));
    parts.push(b > 0 ? 'Bot▲' : 'Bot▼');
    return parts.join(' · ');
}

// ---------- tính kết quả cho mọi nến, 2 hướng ----------
function prepare(sym) {
    const d = load(sym, TICKS[sym], DATA);
    const { bars, f } = d, n = bars.n;
    const code = new Array(n), kd = new Int8Array(n);
    for (let i = 0; i < n; i++) {
        const mon = new Date(bars.t[i]).getUTCDay() === 1;
        const v = mon ? 0 : Math.sign(f.dv[i] - f.wv[i]);
        kd[i] = f.kc.lower[i] > f.dv[i] ? 1 : f.kc.upper[i] < f.dv[i] ? -1 : 0;
        const kw = mon ? kd[i] : f.kc.lower[i] > f.wv[i] ? 1 : f.kc.upper[i] < f.wv[i] ? -1 : 0;
        code[i] = `${v},${kd[i]},${kw},${f.st[i]}`;
    }
    // nextOpp[s][i] = nến đầu tiên > i có tín hiệu ngược với hướng s
    const outc = {};
    for (const s of [1, -1]) {
        const next = new Int32Array(n).fill(-1);
        let nx = -1;
        for (let i = n - 1; i >= 0; i--) { next[i] = nx; if (kd[i] === -s) nx = i; }
        const o = { end: new Int32Array(n), mfe: new Float32Array(n), mae: new Float32Array(n), first: new Int8Array(n), ret: new Float32Array(n), pnl: new Float32Array(n), valid: new Uint8Array(n) };
        for (let i = WARMUP; i < n - 1; i++) {
            if (kd[i] === -s) continue; // tín hiệu ngược đang có sẵn -> không có gì để đo
            let end = next[i];
            if (end < 0 || end - i > CAP) end = Math.min(n - 1, i + CAP);
            const c0 = bars.c[i];
            let mfe = 0, mae = 0, first = 0;
            for (let j = i + 1; j <= end; j++) {
                const fav = s > 0 ? bars.h[j] / c0 - 1 : 1 - bars.l[j] / c0;
                const adv = s > 0 ? 1 - bars.l[j] / c0 : bars.h[j] / c0 - 1;
                if (fav > mfe) mfe = fav;
                if (adv > mae) mae = adv;
                if (!first) { if (adv >= TARGET) first = -1; else if (fav >= TARGET) first = 1; }
            }
            o.end[i] = end; o.mfe[i] = mfe; o.mae[i] = mae; o.first[i] = first;
            o.ret[i] = s * (bars.c[end] / c0 - 1) - COST;
            // cách của bạn: chốt khi giá đi được TARGET, nếu không thì thoát ở tín hiệu ngược
            o.pnl[i] = mfe >= TARGET ? TARGET - COST : o.ret[i];
            o.valid[i] = 1;
        }
        outc[s] = o;
    }
    const split = Math.floor(WARMUP + (n - WARMUP) * 0.6);
    // baseline theo coin × giai đoạn × hướng
    const base = {};
    for (const s of [1, -1]) for (const [tag, a, b] of [['is', WARMUP, split], ['oos', split, n - 1]]) {
        const o = outc[s]; let k = 0, w = 0, cw = 0, cl = 0, r = 0, pn = 0;
        for (let i = a; i < b; i++) if (o.valid[i]) { k++; w += o.mfe[i] >= TARGET; cw += o.first[i] === 1; cl += o.first[i] === -1; r += o.ret[i]; pn += o.pnl[i]; }
        base[`${s}${tag}`] = { win: w / k, clean: cw / k, loss: cl / k, edge: (cw - cl) / k, ret: r / k, pnl: pn / k };
    }
    // chuỗi đoạn
    const eps = [];
    for (let i = WARMUP; i < n; i++) {
        if (!eps.length || eps[eps.length - 1].code !== code[i]) eps.push({ code: code[i], start: i, len: 1 });
        else eps[eps.length - 1].len++;
    }
    return { sym, d, bars, outc, base, split, eps };
}

console.log('Đang chuẩn bị dữ liệu...');
const P = COINS.map((s) => { const x = prepare(s); process.stdout.write(`\r${s}   `); return x; });

// ---------- gom pattern ----------
// key = "len|s|code1>code2>..." ; occurrence tại nến bắt đầu đoạn cuối
const pats = new Map();
for (const p of P) {
    for (let k = 0; k < p.eps.length; k++) {
        const i = p.eps[k].start;
        for (const L of [1, 2, 3]) {
            if (k - L + 1 < 0) continue;
            const seq = p.eps.slice(k - L + 1, k + 1).map((e) => e.code).join('>');
            for (const s of [1, -1]) {
                const o = p.outc[s];
                if (!o.valid[i]) continue;
                const key = `${L}|${s}|${seq}`;
                let rec = pats.get(key);
                if (!rec) pats.set(key, (rec = { L, s, seq, occ: [] }));
                rec.occ.push({ p, i });
            }
        }
    }
}

// Thống kê pattern: bỏ các lần xuất hiện chồng lên kết quả của lần trước (cùng coin) để không đếm trùng
function evalPat(rec, filter = () => true) {
    const lastEnd = new Map();
    const acc = { is: [], oos: [] };
    const perCoin = {};
    for (const { p, i } of rec.occ) {
        if (!filter(p, i)) continue;
        if ((lastEnd.get(p.sym) ?? -1) >= i) continue;
        const o = p.outc[rec.s];
        lastEnd.set(p.sym, o.end[i]);
        const tag = i < p.split ? 'is' : 'oos';
        const b = p.base[`${rec.s}${tag}`];
        const x = { p, i, win: o.mfe[i] >= TARGET, clean: o.first[i] === 1, loss: o.first[i] === -1, ret: o.ret[i], dur: o.end[i] - i, mfe: o.mfe[i], mae: o.mae[i],
            dWin: (o.mfe[i] >= TARGET) - b.win, dClean: (o.first[i] === 1) - b.clean, edge: o.first[i], dEdge: o.first[i] - b.edge, dRet: o.ret[i] - b.ret, pnl: o.pnl[i], dPnl: o.pnl[i] - b.pnl };
        acc[tag].push(x);
        (perCoin[p.sym] ??= []).push(x);
    }
    const S = (a) => {
        const n = a.length;
        if (!n) return { n: 0 };
        const m = (k) => a.reduce((s, x) => s + x[k], 0) / n;
        const tOf = (k) => { const mu = m(k), sd = Math.sqrt(a.reduce((s, x) => s + (x[k] - mu) ** 2, 0) / Math.max(1, n - 1)); return mu / (sd / Math.sqrt(n)); };
        return { n, win: m('win'), clean: m('clean'), loss: m('loss'), edge: m('edge'), ret: m('ret'), dWin: m('dWin'), dClean: m('dClean'),
            dEdge: m('dEdge'), tEdge: tOf('dEdge'), dRet: m('dRet'), tRet: tOf('dRet'), pnl: m('pnl'), dPnl: m('dPnl'), tPnl: tOf('dPnl'),
            dur: median(a.map((x) => x.dur)), mfe: median(a.map((x) => x.mfe)), mae: median(a.map((x) => x.mae)) };
    };
    const coinsPos = Object.values(perCoin).filter((a) => a.length >= 5 && a.reduce((s, x) => s + x.dPnl, 0) > 0).length;
    const coinsN = Object.values(perCoin).filter((a) => a.length >= 5).length;
    return { is: S(acc.is), oos: S(acc.oos), all: S([...acc.is, ...acc.oos]), coinsPos, coinsN, perCoin };
}

const label = (rec) => rec.seq.split('>').map(stateLabel).join('  →  ');
const all = [...pats.values()].map((rec) => ({ rec, r: evalPat(rec) })).filter(({ r }) => r.is.n >= MIN_IS);

// ================= báo cáo =================
md(`# Pattern từ cách đọc chart — 14 coin futures 15m, win = giá đi theo hướng ≥ ${pct(TARGET)} trước tín hiệu ngược\n`);
md('## Cách đọc báo cáo\n');
md('- **Trạng thái nến** = `Xanh>Đỏ / Xanh<Đỏ / T2` (VWAP phiên so với VWAP tuần; thứ Hai 2 đường trùng nhau) · vị trí cả dải KC(9, 0.5) so với từng VWAP (`trên` = cả dải nằm trên, `dưới` = cả dải nằm dưới, `cắt` = dải chạm/cắt đường) · màu ATRBot.');
md('- **Đoạn** = các nến liền nhau có cùng trạng thái. **Pattern** = 1, 2 hoặc 3 đoạn liên tiếp, đọc từ trái sang phải (`→`); lần xuất hiện được tính tại nến đầu tiên của đoạn cuối, đo từ close nến đó.');
md('- **Không dùng mốc thời gian**: long được đo tới khi **cả dải KC nằm dưới VWAP phiên** (tín hiệu ngược rõ ràng), short tới khi **cả dải KC nằm trên VWAP phiên**. Chặn an toàn 1500 nến.');
md(`- **Win** (định nghĩa của bạn) = trong khoảng đó giá có lúc đi theo hướng ≥ ${pct(TARGET)} (max PnL).`);
md(`- **PnL** = kết quả thật nếu làm đúng như vậy: **chốt khi giá đi được ${pct(TARGET)}**; nếu không đạt thì **thoát ở close nến có tín hiệu ngược** (có thể lời ít hoặc lỗ). Đã trừ ${pct(COST, 2)} phí + trượt giá. Đây là chỉ số chính.`);
md('- **Δ PnL** = PnL của pattern − PnL nếu vào ở **nến bất kỳ** (cùng coin, cùng giai đoạn, cùng hướng, cùng cách thoát). Δ > 0 nghĩa là pattern cho thêm thông tin, không chỉ ăn theo cách thoát lệnh. Các lần xuất hiện chồng lên nhau trong cùng một coin chỉ tính lần đầu.');
md(`- **IS** = 60% dữ liệu đầu mỗi coin (dùng để **tìm** pattern, cần n ≥ ${MIN_IS}); **OOS** = 40% cuối (dùng để **kiểm tra**). **# coin** = số coin có Δ PnL dương (trong số coin có ≥ 5 lần).\n`);

// 0. Mốc nền
md('## 0. Mốc nền: nến bất kỳ (trung bình 14 coin)\n');
{
    const rows = [];
    for (const s of [1, -1]) for (const tag of ['is', 'oos']) {
        const bs = P.map((p) => p.base[`${s}${tag}`]);
        const m = (k) => bs.reduce((a, b) => a + b[k], 0) / bs.length;
        rows.push([`${s > 0 ? 'LONG' : 'SHORT'} ${tag.toUpperCase()}`, pct(m('win')), `${(m('pnl') * 100).toFixed(2)}%`, `${(m('ret') * 100).toFixed(2)}%`]);
    }
    md(table(['Hướng · giai đoạn', 'Win (≥ mục tiêu)', 'PnL TB (chốt mục tiêu / thoát ở TH ngược)', 'Nếu chỉ giữ tới TH ngược'], rows));
}

const H = ['Pattern', 'IS n', 'IS win', 'IS PnL TB', 'IS Δ PnL (t)', 'OOS n', 'OOS win', 'OOS PnL TB', 'OOS Δ PnL (t)', '# coin', 'Thời gian TB (nến)', 'MFE / MAE TV'];
const pp2 = (x) => (isFinite(x) ? (x >= 0 ? '+' : '') + (x * 100).toFixed(2) + '%' : '-');
const row = ({ rec, r }) => [label(rec), r.is.n, pct(r.is.win), pp2(r.is.pnl), `${pp2(r.is.dPnl)} (${r.is.tPnl.toFixed(1)})`,
    r.oos.n, pct(r.oos.win), pp2(r.oos.pnl), `${pp2(r.oos.dPnl)} (${(r.oos.tPnl ?? NaN).toFixed(1)})`, `${r.coinsPos}/${r.coinsN}`, r.all.dur, `${pct(r.all.mfe, 1)} / ${pct(r.all.mae, 1)}`];

// 1. Bản đồ trạng thái đơn
md('## 1. Bản đồ: mỗi trạng thái vừa xuất hiện nói gì? (pattern 1 đoạn)\n');
for (const s of [1, -1]) {
    md(`### ${s > 0 ? 'Đánh giá cho LONG' : 'Đánh giá cho SHORT'}\n`);
    const list = all.filter(({ rec }) => rec.L === 1 && rec.s === s).sort((a, b) => b.r.is.dPnl - a.r.is.dPnl);
    md(table(H, list.map(row)));
}

// 2. Pattern có lookback (2–3 đoạn) vượt kiểm tra
const survive = (x) => x.r.oos.n >= 40 && x.r.is.dPnl > 0 && x.r.oos.dPnl > 0 && x.r.is.pnl > 0 && x.r.oos.pnl > 0 && x.r.coinsPos >= Math.ceil(x.r.coinsN * 0.6);
for (const s of [1, -1]) {
    const cand = all.filter(({ rec }) => rec.L >= 2 && rec.s === s).sort((a, b) => b.r.is.tPnl - a.r.is.tPnl);
    const top = cand.slice(0, 40);
    const ok = top.filter(survive);
    md(`## ${s > 0 ? '2' : '3'}. Pattern lookback cho ${s > 0 ? 'LONG' : 'SHORT'} — top 40 theo IS, ${ok.length}/40 vượt kiểm tra OOS\n`);
    md(`Tiêu chí vượt: PnL TB > 0 **và** hơn nến bất kỳ (Δ PnL > 0) ở **cả IS và OOS**, OOS n ≥ 40, và ≥ 60% số coin có Δ PnL dương. (Đã thử ${cand.length} pattern ${s > 0 ? 'long' : 'short'} 2–3 đoạn đủ mẫu.)\n`);
    md('### Vượt kiểm tra\n');
    md(ok.length ? table(H, ok.map(row)) : '_Không có pattern nào._\n');
    md('### Không vượt (top IS nhưng hỏng ở OOS hoặc không đồng đều giữa các coin)\n');
    md(table(H, top.filter((x) => !survive(x)).slice(0, 12).map(row)));
}

// Kiểm tra tổng quát: pattern tốt ở IS có tiếp tục tốt ở OOS không? (so top / giữa / đáy theo IS)
md('## 3b. Tìm pattern theo cách này có thật sự tổng quát không?\n');
md('Với mọi pattern đủ mẫu (cả 1–3 đoạn, OOS n ≥ 40): chia thành 3 nhóm theo t của Δ PnL trên IS, rồi xem **OOS** của mỗi nhóm. Nếu nhóm tốt nhất ở IS vẫn tốt hơn ở OOS thì việc đọc pattern có giá trị thật, không chỉ là may mắn khi chọn.\n');
{
    const rows = [];
    const rank = (xs) => { const idx = xs.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]); const r = new Array(xs.length); idx.forEach(([, i], k) => { r[i] = k; }); return r; };
    for (const s of [1, -1]) {
        const list = all.filter(({ rec, r }) => rec.s === s && r.oos.n >= 40).sort((a, b) => b.r.is.tPnl - a.r.is.tPnl);
        const third = Math.floor(list.length / 3);
        const grp = [['Top 1/3 theo IS', list.slice(0, third)], ['Giữa', list.slice(third, 2 * third)], ['Đáy 1/3 theo IS', list.slice(2 * third)]];
        // tương quan hạng giữa IS t và OOS Δ
        const a = rank(list.map((x) => x.r.is.tPnl)), b = rank(list.map((x) => x.r.oos.dPnl));
        const n = list.length, ma = (n - 1) / 2;
        let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - ma); da += (a[i] - ma) ** 2; db += (b[i] - ma) ** 2; }
        const rho = num / Math.sqrt(da * db);
        for (const [name, g] of grp) {
            const w = g.reduce((t, x) => t + x.r.oos.n, 0);
            rows.push([`${s > 0 ? 'LONG' : 'SHORT'} · ${name}`, g.length,
                `${((g.reduce((t, x) => t + x.r.oos.dPnl * x.r.oos.n, 0) / w) * 100).toFixed(3)}%`,
                `${((g.reduce((t, x) => t + x.r.oos.pnl * x.r.oos.n, 0) / w) * 100).toFixed(3)}%`,
                `${g.filter((x) => x.r.oos.dPnl > 0).length}/${g.length}`, name.startsWith('Top') ? `ρ = ${rho.toFixed(2)} (n=${n})` : '']);
        }
    }
    md(table(['Hướng · nhóm', 'Số pattern', 'OOS Δ PnL TB (gia quyền)', 'OOS PnL TB', '# pattern OOS Δ > 0', 'Tương quan hạng IS→OOS'], rows));
}

// 4. Pattern sống sót trên coin focus + ví dụ để kéo chart xem lại
const survivors = all.filter(({ rec }) => rec.L >= 2).filter(survive).sort((a, b) => b.r.all.tPnl - a.r.all.tPnl);
md(`## 4. ${FOCUS}: các pattern vượt kiểm tra hoạt động thế nào, và ví dụ để kéo chart xem lại\n`);
if (!survivors.length) md('_Không có pattern nào vượt kiểm tra._\n');
for (const x of survivors.slice(0, 6)) {
    const pc = x.r.perCoin[FOCUS] ?? [];
    const Sf = (a) => ({ n: a.length, win: a.filter((y) => y.win).length / a.length, pnl: a.reduce((s, y) => s + y.pnl, 0) / a.length, dPnl: a.reduce((s, y) => s + y.dPnl, 0) / a.length });
    const s = pc.length ? Sf(pc) : null;
    md(`### ${x.rec.s > 0 ? 'LONG' : 'SHORT'} · ${label(x.rec)}\n`);
    md(`Toàn bộ 14 coin: n=${x.r.all.n}, win ${pct(x.r.all.win)}, PnL TB ${pp2(x.r.all.pnl)}, Δ so với nến bất kỳ ${pp2(x.r.all.dPnl)} (t ${x.r.all.tPnl.toFixed(1)}).\n`);
    md(s ? `${FOCUS}: n=${s.n}, win ${pct(s.win)}, PnL TB ${pp2(s.pnl)} (Δ ${pp2(s.dPnl)}).\n` : `${FOCUS}: không xuất hiện.\n`);
    if (pc.length) {
        md(table(['Thời điểm (UTC)', 'Giá', 'Kết quả', 'MFE', 'MAE', 'PnL', 'Số nến tới TH ngược'], pc.slice(-8).map((y) => [
            new Date(y.p.bars.t[y.i]).toISOString().slice(0, 16).replace('T', ' '), y.p.bars.c[y.i].toPrecision(4),
            y.win ? `✅ đạt ${pct(TARGET)}` : '❌ thoát ở TH ngược', pct(y.mfe, 1), pct(y.mae, 1), pp2(y.pnl), y.dur])));
    }
}

writeFileSync(join(HERE, 'reports', `PATTERNS_${(TARGET * 100).toFixed(0)}pct.md`), out.join('\n'));
console.log('\n' + out.slice(0, out.findIndex((l) => l.startsWith('## 4.'))).join('\n'));
