// Nghiên cứu chiến lược scalping 15m từ các event đang dùng trên chart.
// Regime (hướng) = KC(9,0.5) nằm trọn 1 phía VWAP + ATRBot không phủ quyết.
// Entry = lệnh limit chờ giá hồi trong lúc regime còn hiệu lực. Stop/TP theo ATR hoặc cấu trúc VWAP.
// Chọn tham số CHỈ trên IS (60% đầu), báo cáo OOS (40% cuối) và SOLUSDT (không tối ưu) để kiểm tra.
// Usage: node scalp.mjs [symbol=IMXUSDT] [check=SOLUSDT]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCsv } from './lib/indicators.mjs';
import { buildFeatures } from './lib/features.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [SYM = 'IMXUSDT', CHECK = 'SOLUSDT'] = process.argv.slice(2);
const TICK = { IMXUSDT: 0.0001, SOLUSDT: 0.01 };
const FEES = {
    real: { maker: 0.0002, taker: 0.0005, name: 'maker 0.02% / taker 0.05%' },
    taker: { maker: 0.0005, taker: 0.0005, name: 'mọi lệnh taker 0.05%' },
};
const WARMUP = 700;
const MAX_HOLD = 32; // scalping: tối đa 8h

const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';
const bps = (x) => (isFinite(x) ? (x * 1e4).toFixed(1) : '-');
const pct = (x, d = 0) => (isFinite(x) ? (x * 100).toFixed(d) + '%' : '-');
const f2 = (x) => (isFinite(x) ? x.toFixed(2) : x === Infinity ? '∞' : '-');

function load(sym) {
    const bars = loadCsv(readFileSync(join(HERE, 'data', `${sym}_15m_futures.csv`), 'utf8'));
    const f = buildFeatures(bars);
    const n = bars.n;
    const mon = new Uint8Array(n);
    for (let i = 0; i < n; i++) mon[i] = new Date(bars.t[i]).getUTCDay() === 1 ? 1 : 0;
    const kcD = (i, s) => (s > 0 ? f.kc.lower[i] > f.dv[i] : f.kc.upper[i] < f.dv[i]);
    const kcW = (i, s) => (s > 0 ? f.kc.lower[i] > f.wv[i] : f.kc.upper[i] < f.wv[i]);
    return { sym, bars, f, mon, kcD, kcW, tick: TICK[sym], split: Math.floor(WARMUP + (n - WARMUP) * 0.6) };
}

// ---------- Regime: hướng được phép giao dịch tại close nến i ----------
// Trả về hàm armed(i) -> true nếu được đặt lệnh chiều s cho nến i+1
const REGIMES = {
    // chỉ để so sánh: không lọc gì
    R0: { desc: 'Không lọc (đối chứng)', mk: () => () => true },
    // KC trọn phía VWAP phiên + ATRBot cùng hướng, chỉ khi trạng thái còn
    R1: { desc: 'KC trọn phía VWAP phiên + ATRBot cùng hướng', mk: (d, s) => (i) => d.kcD(i, s) && d.f.st[i] === s },
    // KC trọn phía cả 2 VWAP + ATRBot cùng hướng
    R2: { desc: 'KC trọn phía CẢ 2 VWAP + ATRBot cùng hướng', mk: (d, s) => (i) => d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === s },
    // có "trí nhớ": kích hoạt khi R2 xuất hiện, giữ tới 24 nến sau khi R2 mất,
    // huỷ nếu ATRBot đổi chiều hoặc KC sang trọn phía ngược VWAP phiên
    R3: { desc: 'R2 + nhớ 24 nến (huỷ khi ATRBot đổi / KC sang phía ngược dVWAP)', mk: (d, s) => {
        const n = d.bars.n, arr = new Uint8Array(n);
        let last = -1e9;
        for (let i = 1; i < n; i++) {
            if (d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === s) last = i;
            if (d.f.st[i] !== s || d.kcD(i, -s)) last = -1e9;
            arr[i] = i - last <= 24 ? 1 : 0;
        }
        return (i) => arr[i] === 1;
    } },
};

// ---------- Entry: mức giá đặt lệnh cho nến i+1, tính tại close nến i ----------
const ENTRIES = {
    MKT: { desc: 'Market tại open nến kế', level: () => NaN },
    BASIS: { desc: 'Limit tại KC basis (EMA9)', level: (d, i) => d.f.kc.basis[i] },
    BAND: { desc: 'Limit tại biên KC phía sau (long: lower, short: upper)', level: (d, i, s) => (s > 0 ? d.f.kc.lower[i] : d.f.kc.upper[i]) },
    DVWAP: { desc: 'Limit tại VWAP phiên', level: (d, i) => d.f.dv[i] },
    ATR05: { desc: 'Limit cách close 0.5 ATR', level: (d, i, s) => d.bars.c[i] - s * 0.5 * d.f.atr[i] },
};

// ---------- Stop: khoảng cách stop tính từ giá khớp ----------
const STOPS = {
    A075: { desc: '0.75 ATR', dist: (d, i) => 0.75 * d.f.atr[i] },
    A1: { desc: '1 ATR', dist: (d, i) => 1.0 * d.f.atr[i] },
    A15: { desc: '1.5 ATR', dist: (d, i) => 1.5 * d.f.atr[i] },
    // stop cấu trúc: ra ngoài VWAP phiên thêm 0.25 ATR
    VW: { desc: 'Ngoài VWAP phiên 0.25 ATR', dist: (d, i, s, fill) => s * (fill - d.f.dv[i]) + 0.25 * d.f.atr[i] },
};
const TARGETS = [1, 1.5, 2];
const EXITS = {
    NONE: 'Chỉ stop / TP / hết 32 nến',
    STATE: 'Thêm: thoát khi regime mất (close)',
};

/**
 * Mô phỏng 1 chiều. Quy ước bảo thủ:
 * - Lệnh limit chỉ khớp khi giá XUYÊN qua mức đặt ≥ 1 tick; nếu open đã vượt mức -> khớp tại open (taker).
 * - Nến khớp lệnh: chỉ kiểm tra stop, không tính TP (không biết thứ tự trong nến).
 * - Cùng nến chạm cả stop và TP -> tính stop.
 * - Stop / thoát theo tín hiệu / hết giờ: taker + trượt 1 tick. TP: lệnh limit maker, cần xuyên 1 tick.
 */
function simulate(d, cfg, fee) {
    const { bars, f, tick } = d;
    const { o, h, l, c, n } = bars;
    const { side: s, armed, entry, stop, R, exit } = cfg;
    const trades = [];
    let pos = null, pendingExit = false;
    const closePos = (j, px, why, feeRate) => {
        const gross = s * (px / pos.fill - 1);
        trades.push({ idx: pos.idx, j, gross, net: gross - pos.fee - feeRate, why, bars: j - pos.idx + 1, R: (s * (px - pos.fill) - (pos.fee + feeRate) * pos.fill) / pos.risk });
        pos = null;
    };
    for (let j = WARMUP + 1; j < n; j++) {
        const i = j - 1; // thông tin đã biết khi nến j mở
        let exitedThisBar = false;
        if (pos) {
            if (pendingExit) { closePos(j, o[j] - s * tick, 'signal', fee.taker); pendingExit = false; exitedThisBar = true; }
            else if (s * (o[j] - pos.stop) <= 0) { closePos(j, o[j] - s * tick, 'stop', fee.taker); exitedThisBar = true; }
            else if (s * ((s > 0 ? l[j] : h[j]) - pos.stop) <= 0) { closePos(j, pos.stop - s * tick, 'stop', fee.taker); exitedThisBar = true; }
            else if (s * (o[j] - pos.tgt) >= 0) { closePos(j, o[j], 'tp', fee.maker); exitedThisBar = true; }
            else if (s * ((s > 0 ? h[j] : l[j]) - pos.tgt) >= tick) { closePos(j, pos.tgt, 'tp', fee.maker); exitedThisBar = true; }
            if (pos) {
                if (j - pos.idx + 1 >= MAX_HOLD) pendingExit = true;
                else if (exit === 'STATE' && !armed(j)) pendingExit = true;
            }
            continue;
        }
        if (exitedThisBar || !armed(i)) continue;
        // đặt lệnh cho nến j
        const lv = entry.level(d, i, s);
        let fill, feeIn;
        if (isNaN(lv)) { fill = o[j] + s * tick; feeIn = fee.taker; }
        else if (s * (o[j] - lv) <= 0) { fill = o[j]; feeIn = fee.taker; } // open đã tốt hơn mức limit
        else if (s * (lv - (s > 0 ? l[j] : h[j])) >= tick) { fill = lv; feeIn = fee.maker; }
        else continue;
        const dist = stop.dist(d, i, s, fill);
        // bỏ lệnh nếu stop phi lý (âm, quá sát < 0.3 ATR hoặc quá xa > 3 ATR)
        if (!(dist > 0.3 * f.atr[i] && dist < 3 * f.atr[i])) continue;
        pos = { idx: j, fill, fee: feeIn, stop: fill - s * dist, tgt: fill + s * R * dist, risk: dist };
        // nến khớp: chỉ kiểm tra stop
        if (s * ((s > 0 ? l[j] : h[j]) - pos.stop) <= 0) { closePos(j, pos.stop - s * tick, 'stop', fee.taker); continue; }
        if (exit === 'STATE' && !armed(j)) pendingExit = true;
    }
    return trades;
}

function stats(trades, split) {
    const S = (arr) => {
        const n = arr.length;
        if (!n) return { n: 0, win: NaN, avg: NaN, pf: NaN, t: NaN, total: 0, dd: 0, avgR: NaN };
        let s = 0, q = 0, w = 0, gp = 0, gl = 0, eq = 0, pk = 0, dd = 0, r = 0;
        for (const x of arr) {
            s += x.net; q += x.net * x.net; r += x.R;
            if (x.net > 0) { w++; gp += x.net; } else gl -= x.net;
            eq += x.net; pk = Math.max(pk, eq); dd = Math.max(dd, pk - eq);
        }
        const m = s / n, sd = Math.sqrt(Math.max(0, q / n - m * m));
        return { n, win: w / n, avg: m, pf: gl ? gp / gl : Infinity, t: sd ? m / (sd / Math.sqrt(n)) : 0, total: s, dd, avgR: r / n };
    };
    return { all: S(trades), is: S(trades.filter((t) => t.idx < split)), oos: S(trades.filter((t) => t.idx >= split)) };
}

// ---------- chạy grid ----------
const D = { [SYM]: load(SYM), [CHECK]: load(CHECK) };
const armedCache = {};
const armedFn = (d, reg, s) => (armedCache[`${d.sym}${reg}${s}`] ??= REGIMES[reg].mk(d, s));
function run(sym, c, feeKey = 'real') {
    const d = D[sym];
    const trades = simulate(d, { side: c.side, armed: armedFn(d, c.reg, c.side), entry: ENTRIES[c.entry], stop: STOPS[c.stop], R: c.R, exit: c.exit }, FEES[feeKey]);
    return { trades, ...stats(trades, d.split) };
}
const label = (c) => `${c.side > 0 ? 'LONG' : 'SHORT'} ${c.reg}·${c.entry}·${c.stop}·${c.R}R·${c.exit}`;

const grid = [];
for (const reg of Object.keys(REGIMES)) for (const entry of Object.keys(ENTRIES)) for (const stop of Object.keys(STOPS))
    for (const R of TARGETS) for (const exit of Object.keys(EXITS)) for (const side of [1, -1]) {
        const c = { reg, entry, stop, R, exit, side };
        c.res = run(SYM, c);
        grid.push(c);
    }

const d0 = D[SYM];
const days = (n) => n / 96;
const isDays = days(d0.split - WARMUP), oosDays = days(d0.bars.n - d0.split);
md(`# Scalping 15m ${SYM} từ combo ATRBot + VWAP + Keltner\n`);
md(`Dữ liệu: ${new Date(d0.bars.t[WARMUP]).toISOString().slice(0, 10)} → ${new Date(d0.bars.t[d0.bars.n - 1]).toISOString().slice(0, 10)}. ` +
    `IS (chọn tham số) = ${Math.round(isDays)} ngày đầu đến ${new Date(d0.bars.t[d0.split]).toISOString().slice(0, 10)}; OOS = ${Math.round(oosDays)} ngày cuối. ` +
    `${CHECK} chỉ dùng để kiểm tra chéo, không tối ưu.\n`);
md(`Phí: ${FEES.real.name}. Tick ${SYM} = ${TICK[SYM]} (~${pct(TICK[SYM] / d0.bars.c[d0.bars.n - 1], 2)} ở giá hiện tại). ` +
    'Limit chỉ khớp khi giá xuyên qua ≥ 1 tick; stop trượt 1 tick; nến khớp lệnh không tính TP; cùng nến chạm stop & TP → tính stop.\n');
md('**Regime:** ' + Object.entries(REGIMES).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + '\n');
md('**Entry:** ' + Object.entries(ENTRIES).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + '\n');
md('**Stop:** ' + Object.entries(STOPS).map(([k, v]) => `\`${k}\` ${v.desc}`).join('; ') + `. **TP** = ${TARGETS.join(' / ')} R. **Exit:** ` + Object.entries(EXITS).map(([k, v]) => `\`${k}\` ${v}`).join('; ') + '\n');

const H = ['Cấu hình', 'IS n', 'IS win', 'IS avg bps', 'IS PF', 'IS t', 'OOS n', 'OOS win', 'OOS avg bps', 'OOS PF', 'OOS t', `${CHECK} n`, `${CHECK} avg bps`, `${CHECK} PF`];
const rowOf = (c, chk) => {
    const { is, oos } = c.res;
    const k = chk ?? run(CHECK, c).all;
    return [label(c), is.n, pct(is.win), bps(is.avg), f2(is.pf), f2(is.t), oos.n, pct(oos.win), bps(oos.avg), f2(oos.pf), f2(oos.t), k.n, bps(k.avg), f2(k.pf)];
};

// 1. Giá trị của bộ lọc regime
md('## 1. Bộ lọc regime có giá trị không? (trung bình trên mọi entry × stop × TP × exit, IS + OOS)\n');
{
    const rows = [];
    for (const reg of Object.keys(REGIMES)) for (const side of [1, -1]) {
        const g = grid.filter((c) => c.reg === reg && c.side === side && c.res.all.n >= 30);
        const avg = g.reduce((a, c) => a + c.res.all.avg, 0) / g.length;
        const avgR = g.reduce((a, c) => a + c.res.all.avgR, 0) / g.length;
        const nAvg = g.reduce((a, c) => a + c.res.all.n, 0) / g.length;
        rows.push([`${side > 0 ? 'LONG' : 'SHORT'} ${reg}`, REGIMES[reg].desc, Math.round(nAvg), bps(avg), f2(avgR), `${g.filter((c) => c.res.all.avg > 0).length}/${g.length}`]);
    }
    md(table(['Regime', 'Mô tả', 'Số lệnh TB', 'Avg net bps', 'Avg R', '# cấu hình dương'], rows));
}

// 2. Entry nào tốt nhất trong regime
md('## 2. Kiểu entry (trung bình trong regime R1–R3)\n');
{
    const rows = [];
    for (const entry of Object.keys(ENTRIES)) for (const side of [1, -1]) {
        const g = grid.filter((c) => c.entry === entry && c.side === side && c.reg !== 'R0' && c.res.all.n >= 30);
        rows.push([`${side > 0 ? 'LONG' : 'SHORT'} ${entry}`, ENTRIES[entry].desc, Math.round(g.reduce((a, c) => a + c.res.all.n, 0) / g.length),
            bps(g.reduce((a, c) => a + c.res.is.avg, 0) / g.length), bps(g.reduce((a, c) => a + c.res.oos.avg, 0) / g.length), `${g.filter((c) => c.res.all.avg > 0).length}/${g.length}`]);
    }
    md(table(['Entry', 'Mô tả', 'Số lệnh TB', 'IS avg bps', 'OOS avg bps', '# cấu hình dương'], rows));
}

// 3. Chọn trên IS
const MIN_IS = 80;
const cand = grid.filter((c) => c.reg !== 'R0' && c.res.is.n >= MIN_IS).sort((a, b) => b.res.is.t - a.res.is.t);
md(`## 3. Top 15 cấu hình xếp theo t-stat trên IS (n IS ≥ ${MIN_IS}) — OOS và ${CHECK} là phần kiểm tra\n`);
md('Đây là phép thử quan trọng nhất: cấu hình được chọn **chỉ** nhìn IS. Nếu OOS và coin khác vẫn dương thì mới có cơ sở tin.\n');
const top = cand.slice(0, 15).map((c) => ({ c, chk: run(CHECK, c).all }));
md(table(H, top.map(({ c, chk }) => rowOf(c, chk))));
{
    const pos = top.filter(({ c }) => c.res.oos.avg > 0).length, posChk = top.filter(({ chk }) => chk.avg > 0).length;
    md(`→ Trong top 15 theo IS: **${pos}/15 dương ở OOS**, **${posChk}/15 dương trên ${CHECK}**.\n`);
}

// 4. Cấu hình bền nhất: dương ở IS, OOS và coin kiểm tra, xếp theo t nhỏ nhất
const robust = grid.filter((c) => c.reg !== 'R0' && c.res.is.n >= 60 && c.res.oos.n >= 40 && c.res.is.avg > 0 && c.res.oos.avg > 0)
    .map((c) => ({ c, chk: run(CHECK, c).all })).filter(({ chk }) => chk.n >= 60 && chk.avg > 0)
    .sort((a, b) => Math.min(b.c.res.is.t, b.c.res.oos.t, b.chk.t) - Math.min(a.c.res.is.t, a.c.res.oos.t, a.chk.t));
md(`## 4. Cấu hình dương ở cả IS, OOS và ${CHECK}: ${robust.length}/${grid.filter((c) => c.reg !== 'R0').length}\n`);
md('(Lưu ý: danh sách này đã nhìn cả OOS nên có thiên lệch chọn lọc; dùng để tìm vùng tham số ổn định, không phải bằng chứng.)\n');
md(table(H, robust.slice(0, 15).map(({ c, chk }) => rowOf(c, chk))));

// 5. Phân tích sâu cấu hình đại diện
const pick = robust[0]?.c ?? top[0].c;
md(`## 5. Phân tích sâu: ${label(pick)}\n`);
{
    const r = run(SYM, pick);
    const rT = run(SYM, pick, 'taker');
    const byYear = {};
    for (const t of r.trades) { const y = new Date(d0.bars.t[t.idx]).getUTCFullYear() + (new Date(d0.bars.t[t.idx]).getUTCMonth() < 6 ? 'H1' : 'H2'); (byYear[y] ??= []).push(t); }
    md('### Theo nửa năm\n');
    md(table(['Giai đoạn', 'n', 'Win', 'Avg bps', 'PF', 'Tổng'], Object.entries(byYear).map(([y, ts]) => { const s = stats(ts, Infinity).all; return [y, s.n, pct(s.win), bps(s.avg), f2(s.pf), pct(s.total, 1)]; })));
    const why = {}; for (const t of r.trades) why[t.why] = (why[t.why] || 0) + 1;
    md(`Lý do thoát: ${Object.entries(why).map(([k, v]) => `${k} ${pct(v / r.trades.length)}`).join(', ')}. Giữ TB ${(r.trades.reduce((a, t) => a + t.bars, 0) / r.trades.length).toFixed(1)} nến. ` +
        `Tần suất: ${(r.trades.length / days(d0.bars.n - WARMUP) * 7).toFixed(1)} lệnh/tuần.\n`);
    md(`Phí: với ${FEES.real.name} avg = ${bps(r.all.avg)} bps; nếu **mọi lệnh taker** avg = ${bps(rT.all.avg)} bps (OOS ${bps(rT.oos.avg)}).\n`);
    // lân cận tham số
    md('### Độ nhạy: đổi từng tham số, giữ nguyên phần còn lại\n');
    const nb = [];
    for (const k of ['reg', 'entry', 'stop', 'R', 'exit']) {
        const opts = k === 'reg' ? Object.keys(REGIMES) : k === 'entry' ? Object.keys(ENTRIES) : k === 'stop' ? Object.keys(STOPS) : k === 'R' ? TARGETS : Object.keys(EXITS);
        for (const v of opts) {
            const c = { ...pick, [k]: v };
            const x = run(SYM, c), y = run(CHECK, c).all;
            nb.push([`${k} = ${v}${v === pick[k] ? ' ◀' : ''}`, x.is.n, bps(x.is.avg), x.oos.n, bps(x.oos.avg), f2(x.all.pf), y.n, bps(y.avg)]);
        }
    }
    md(table(['Thay đổi', 'IS n', 'IS bps', 'OOS n', 'OOS bps', 'PF toàn bộ', `${CHECK} n`, `${CHECK} bps`], nb));
}

// 6. Phân rã: edge gộp (không phí, không tick) -> thêm phí -> thêm tick
md('## 6. Lỗ đến từ đâu? Phân rã chi phí (trung bình mọi entry × stop × TP × exit)\n');
md('Gộp = không phí, không trượt tick, limit khớp khi chạm. Nếu cột gộp đã ≤ 0 thì tín hiệu không có edge ở khung scalping, tối ưu phí cũng vô ích.\n');
{
    FEES.zero = { maker: 0, taker: 0 };
    const rows = [];
    for (const reg of Object.keys(REGIMES)) for (const side of [1, -1]) {
        const r = [`${side > 0 ? 'LONG' : 'SHORT'} ${reg}`];
        for (const [tag, a, b] of [['IS', 0, 'is'], ['OOS', 0, 'oos']]) {
            void a;
            const cs = grid.filter((c) => c.reg === reg && c.side === side);
            const avgOf = (feeKey, tick) => {
                let s = 0, k = 0;
                for (const c of cs) {
                    const d = { ...D[SYM], tick };
                    const x = stats(simulate(d, { side, armed: armedFn(D[SYM], reg, side), entry: ENTRIES[c.entry], stop: STOPS[c.stop], R: c.R, exit: c.exit }, FEES[feeKey]), D[SYM].split)[b];
                    if (x.n) { s += x.avg; k++; }
                }
                return s / k;
            };
            r.push(bps(avgOf('zero', 0)), bps(avgOf('real', 0)), bps(avgOf('real', D[SYM].tick)));
            void tag;
        }
        rows.push(r);
    }
    md(table(['Regime', 'IS gộp', 'IS + phí', 'IS + phí + tick', 'OOS gộp', 'OOS + phí', 'OOS + phí + tick'], rows));
    // ATR tính theo tick: scalping cần ATR nhiều tick
    const atrTicks = (a, b) => { const xs = []; for (let i = a; i < b; i += 10) xs.push(D[SYM].f.atr[i] / D[SYM].tick); xs.sort((x, y) => x - y); return xs[xs.length >> 1]; };
    md(`ATR(14) 15m trung vị tính theo tick: IS ≈ ${Math.round(atrTicks(WARMUP, D[SYM].split))} tick, OOS ≈ ${Math.round(atrTicks(D[SYM].split, D[SYM].bars.n))} tick.\n`);
}

mkdirSync(join(HERE, 'reports'), { recursive: true });
const file = join(HERE, 'reports', `SCALP_${SYM}.md`);
writeFileSync(file, out.join('\n'));
console.log(out.join('\n'));
