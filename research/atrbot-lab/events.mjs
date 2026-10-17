// Nghiên cứu event theo cách đọc chart (chưa tìm entry):
// - VWAP phiên (xanh) < VWAP tuần (đỏ) => xu hướng xuống; thứ Hai 2 đường trùng nhau => coi là 1 đường.
// - Dải Keltner(9, 0.5) đại diện cho giá: "KC nằm hoàn toàn dưới VWAP" = KC upper < VWAP.
// - ATRBot là event trạng thái thị trường, thêm độ chắc chắn.
// Đo từ close nến event, nhìn về phía trước: win = giá đi theo hướng >= TARGET (max PnL).
// Usage: node events.mjs [market=futures] [target=0.02]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCsv } from './lib/indicators.mjs';
import { buildFeatures } from './lib/features.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [market = 'futures', targetArg = '0.02'] = process.argv.slice(2);
const TARGET = Number(targetArg);
const SYMBOLS = ['IMXUSDT', 'SOLUSDT'];
const WARMUP = 700;
const HS = [16, 48, 96];       // 4h, 12h, 24h
const UNTIL_CAP = 192;         // "đến hết trạng thái" tối đa 2 ngày
const pct = (x) => (isFinite(x) ? (x * 100).toFixed(0) + '%' : '-');
const pp = (x) => (isFinite(x) ? (x >= 0 ? '+' : '') + (x * 100).toFixed(0) : '-');
const out = [];
const md = (s = '') => out.push(s);
const table = (h, rows) => ['| ' + h.join(' | ') + ' |', '|' + h.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.join(' | ') + ' |')].join('\n') + '\n';

// Kết quả nhìn về trước từ close[i], trong (i, end]: max đi thuận, max đi ngược, và cái nào chạm TARGET trước
function look(bars, i, end, s) {
    const c0 = bars.c[i];
    let mfe = 0, mae = 0, first = 0; // first: +1 chạm thuận trước, -1 chạm ngược trước (cùng nến -> tính ngược)
    for (let j = i + 1; j <= end; j++) {
        const fav = s > 0 ? bars.h[j] / c0 - 1 : 1 - bars.l[j] / c0;
        const adv = s > 0 ? 1 - bars.l[j] / c0 : bars.h[j] / c0 - 1;
        if (fav > mfe) mfe = fav;
        if (adv > mae) mae = adv;
        if (!first) {
            if (adv >= TARGET) first = -1;
            else if (fav >= TARGET) first = 1;
        }
    }
    return { mfe, mae, first };
}

// ---------- load + trạng thái ----------
const data = {};
for (const sym of SYMBOLS) {
    const bars = loadCsv(readFileSync(join(HERE, 'data', `${sym}_15m_${market}.csv`), 'utf8'));
    const f = buildFeatures(bars);
    const n = bars.n;
    const mon = new Uint8Array(n), vs = new Int8Array(n);
    const kcBelowD = new Uint8Array(n), kcBelowW = new Uint8Array(n), kcAboveD = new Uint8Array(n), kcAboveW = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        mon[i] = new Date(bars.t[i]).getUTCDay() === 1 ? 1 : 0;
        vs[i] = mon[i] ? 0 : Math.sign(f.dv[i] - f.wv[i]); // +1 xanh trên đỏ, -1 xanh dưới đỏ, 0 thứ Hai
        kcBelowD[i] = f.kc.upper[i] < f.dv[i] ? 1 : 0;
        kcBelowW[i] = f.kc.upper[i] < f.wv[i] ? 1 : 0;
        kcAboveD[i] = f.kc.lower[i] > f.dv[i] ? 1 : 0;
        kcAboveW[i] = f.kc.lower[i] > f.wv[i] ? 1 : 0;
    }
    // KC hoàn toàn về phía s của VWAP phiên / tuần
    const kcD = (i, s) => (s < 0 ? kcBelowD[i] : kcAboveD[i]) === 1;
    const kcW = (i, s) => (s < 0 ? kcBelowW[i] : kcAboveW[i]) === 1;
    let atrPct = []; for (let i = WARMUP; i < n; i += 50) atrPct.push(f.atr[i] / bars.c[i]); atrPct.sort((a, b) => a - b);

    // baseline: mọi nến, cả 2 hướng
    const base = {};
    for (const s of [1, -1]) for (const H of HS) {
        let win = 0, clean = 0, k = 0;
        for (let i = WARMUP; i < n - H; i++) { const r = look(bars, i, i + H, s); win += r.mfe >= TARGET; clean += r.first === 1; k++; }
        base[`${s}|${H}`] = { win: win / k, clean: clean / k };
    }
    // base theo từng giai đoạn để so IS/OOS công bằng (biến động mỗi giai đoạn khác nhau)
    const split = Math.floor(WARMUP + (n - WARMUP) * 0.6);
    for (const s of [1, -1]) for (const [tag, a, b] of [['is', WARMUP, split], ['oos', split, n - 48]]) {
        let clean = 0, k = 0;
        for (let i = a; i < b; i++) { clean += look(bars, i, i + 48, s).first === 1; k++; }
        base[`${s}|48|${tag}`] = { clean: clean / k };
    }
    data[sym] = { bars, f, mon, vs, kcD, kcW, base, atrMed: atrPct[atrPct.length >> 1], split };
}

// Thống kê 1 tập event. hold(i) dùng để đo "đến hết trạng thái".
function evalEvents(sym, s, cond) {
    const { bars, split } = data[sym];
    const n = bars.n;
    const res = { n: 0, win: {}, clean: {}, untilWin: 0, untilClean: 0, untilBars: 0, isClean: 0, isN: 0, oosClean: 0, oosN: 0, mfe: [], mae: [] };
    for (const H of HS) { res.win[H] = 0; res.clean[H] = 0; }
    for (let i = WARMUP + 1; i < n - Math.max(...HS) - 1; i++) {
        if (!(cond(i) && !cond(i - 1))) continue; // event = nến đầu tiên trạng thái xuất hiện
        res.n++;
        for (const H of HS) { const r = look(bars, i, i + H, s); res.win[H] += r.mfe >= TARGET; res.clean[H] += r.first === 1; if (H === 48) { res.mfe.push(r.mfe); res.mae.push(r.mae); (i < split ? (res.isN++, res.isClean += r.first === 1) : (res.oosN++, res.oosClean += r.first === 1)); } }
        let end = i; while (end + 1 < n && end - i < UNTIL_CAP && cond(end + 1)) end++;
        end = Math.min(n - 1, end + 1); // gồm cả nến trạng thái kết thúc
        const u = look(bars, i, end, s);
        res.untilWin += u.mfe >= TARGET; res.untilClean += u.first === 1; res.untilBars += end - i;
    }
    return res;
}

const median = (a) => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };
function rowsFor(list, s) {
    return list.map(([name, mk]) => {
        const r = [name];
        for (const sym of SYMBOLS) {
            const e = evalEvents(sym, s, mk(data[sym], s));
            const b = data[sym].base[`${s}|48`];
            if (!e.n) { r.push(0, '-', '-', '-', '-', '-'); continue; }
            r.push(e.n,
                `${pct(e.win[48] / e.n)} (${pp(e.win[48] / e.n - b.win)})`,
                `${pct(e.clean[48] / e.n)} (${pp(e.clean[48] / e.n - b.clean)}, z${((e.clean[48] / e.n - b.clean) / Math.sqrt(b.clean * (1 - b.clean) / e.n)).toFixed(1)})`,
                `${pct(e.untilWin / e.n)} / ${pct(e.untilClean / e.n)} · ${Math.round(e.untilBars / e.n)}n`,
                `${pp(e.isClean / e.isN - data[sym].base[`${s}|48|is`].clean)} / ${pp(e.oosClean / e.oosN - data[sym].base[`${s}|48|oos`].clean)}`,
                `${(median(e.mfe) * 100).toFixed(1)}/${(median(e.mae) * 100).toFixed(1)}`);
        }
        return r;
    });
}
const HEAD = ['Event'];
for (const s of SYMBOLS) HEAD.push(`${s} n`, `Win 12h (vs base)`, `Sạch 12h (vs base)`, 'Đến hết trạng thái: win / sạch · nến', 'Sạch vs base: IS / OOS', 'MFE/MAE trung vị %');

// ---------- báo cáo ----------
md(`# Event study theo cách đọc chart — ${market} 15m, win = giá đi theo hướng ≥ ${(TARGET * 100).toFixed(1)}%\n`);
md('**Định nghĩa**');
md('- VWAP phiên = xanh, VWAP tuần = đỏ. `xanh < đỏ` = cấu trúc giảm, `xanh > đỏ` = cấu trúc tăng. Thứ Hai 2 đường trùng nhau → coi là 1 đường VWAP.');
md('- KC(9, 0.5) đại diện cho giá. "KC dưới VWAP" = **KC upper < VWAP** (cả dải nằm dưới). "KC trên VWAP" = KC lower > VWAP.');
md('- **Event** = nến đầu tiên trạng thái xuất hiện. Đo từ close nến event.');
md(`- **Win** = trong cửa sổ, giá có lúc đi theo hướng ≥ ${(TARGET * 100).toFixed(0)}% (max PnL), bất kể có đi ngược trước hay không.`);
md(`- **Sạch** = chạm +${(TARGET * 100).toFixed(0)}% theo hướng **trước khi** chạm −${(TARGET * 100).toFixed(0)}% ngược hướng (cùng nến chạm cả 2 → tính thua).`);
md('- **Base** = tỉ lệ tương ứng của **một nến bất kỳ** cùng hướng, cùng cửa sổ. Số trong ngoặc là chênh lệch theo điểm %: `+10` nghĩa là event tốt hơn nến ngẫu nhiên 10 điểm %. Đây mới là thước đo "event có thêm thông tin hay không".');
md('- **z** = chênh lệch "sạch" so với base chia sai số chuẩn. |z| ≥ 2 mới đáng chú ý (event chồng lấn nhau nên z thực tế còn thấp hơn). **IS / OOS** = chênh lệch "sạch" so với base **của cùng giai đoạn** (60% đầu / 40% cuối).');
md(`- **Đến hết trạng thái** =từ event tới khi trạng thái mất (tối đa ${UNTIL_CAP} nến).\n`);

md('## 0. Mốc so sánh\n');
md(table(['Symbol', 'ATR(14) 15m trung vị', 'Base win 4h ↑/↓', 'Base win 12h ↑/↓', 'Base win 24h ↑/↓', 'Base sạch 12h ↑/↓'],
    SYMBOLS.map((s) => { const b = data[s].base; return [s, (data[s].atrMed * 100).toFixed(2) + '%', ...HS.map((H) => `${pct(b[`1|${H}`].win)} / ${pct(b[`-1|${H}`].win)}`), `${pct(b['1|48'].clean)} / ${pct(b['-1|48'].clean)}`]; })));
md('> Ví dụ: nếu base win 12h là 60% thì một event "win 62%" gần như không nói lên gì — nến bất kỳ cũng đạt mức đó.\n');

// 1. Bậc thang độ chắc chắn — đúng quy trình đọc chart
const ladder = (s) => [
    ['L1 · Cấu trúc VWAP (xanh ' + (s < 0 ? '<' : '>') + ' đỏ)', (d) => (i) => d.vs[i] === s],
    ['L2 · KC hoàn toàn ' + (s < 0 ? 'dưới' : 'trên') + ' VWAP phiên', (d) => (i) => d.kcD(i, s)],
    ['L2b · KC hoàn toàn ' + (s < 0 ? 'dưới' : 'trên') + ' VWAP tuần', (d) => (i) => d.kcW(i, s)],
    ['L3 · KC ' + (s < 0 ? 'dưới' : 'trên') + ' CẢ 2 VWAP', (d) => (i) => d.kcD(i, s) && d.kcW(i, s)],
    ['L4 · L1 + KC ' + (s < 0 ? 'dưới' : 'trên') + ' VWAP phiên', (d) => (i) => d.vs[i] === s && d.kcD(i, s)],
    ['L5 · L1 + KC ' + (s < 0 ? 'dưới' : 'trên') + ' cả 2 VWAP', (d) => (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s)],
    ['L6 · L5 + ATRBot ' + (s < 0 ? 'đỏ' : 'xanh'), (d) => (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === s],
    ['L6x · L5 nhưng ATRBot ngược', (d) => (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === -s],
    ['Thứ Hai · KC ' + (s < 0 ? 'dưới' : 'trên') + ' VWAP (1 đường)', (d) => (i) => d.mon[i] && d.kcD(i, s)],
    ['Thứ Hai · + ATRBot cùng hướng', (d) => (i) => d.mon[i] && d.kcD(i, s) && d.f.st[i] === s],
    ['ATRBot ' + (s < 0 ? 'đỏ' : 'xanh') + ' (flip)', (d) => (i) => d.f.st[i] === s],
    ['ATRBot flip khi KC đã ' + (s < 0 ? 'dưới' : 'trên') + ' cả 2 VWAP', (d) => (i) => d.f.st[i] === s && d.kcD(i, s) && d.kcW(i, s)],
    ['ATRBot flip khi KC ngược phía VWAP phiên', (d) => (i) => d.f.st[i] === s && d.kcD(i, -s)],
].map(([name, mk]) => [name, (d) => mk(d)]);

for (const s of [-1, 1]) {
    md(`## ${s < 0 ? '1' : '2'}. Bậc thang event ${s < 0 ? 'GIẢM (short)' : 'TĂNG (long)'}\n`);
    md('Mỗi dòng là một event riêng (nến đầu tiên mà **toàn bộ** điều kiện của dòng đó cùng đúng).\n');
    md(table(HEAD, rowsFor(ladder(s), s)));
}

// 3. Event đang diễn ra bao lâu rồi: KC dưới VWAP lâu có còn tiếp diễn?
md('## 3. Trạng thái "KC dưới/trên cả 2 VWAP + cấu trúc VWAP + ATRBot" — vào giữa chừng thì sao?\n');
md('Không đo nến đầu tiên mà đo **mọi nến** đang ở trạng thái L6, chia theo trạng thái đã kéo dài bao lâu. Cho biết đến muộn có còn kịp không. (Các nến chồng lấn nhau nên n lớn nhưng không độc lập.)\n');
{
    const buckets = [[0, 4], [4, 16], [16, 48], [48, 1e9]];
    const rows = [];
    for (const s of [-1, 1]) for (const [a, b] of buckets) {
        const r = [`${s < 0 ? 'Giảm' : 'Tăng'} · đã ${b > 1e8 ? '≥' + a : a + '–' + (b - 1)} nến`];
        for (const sym of SYMBOLS) {
            const d = data[sym], { bars } = d;
            const L6 = (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === s;
            let age = 0, n = 0, win = 0, clean = 0;
            for (let i = WARMUP; i < bars.n - 49; i++) {
                age = L6(i) ? age + 1 : 0;
                if (!age || age - 1 < a || age - 1 >= b) continue;
                const x = look(bars, i, i + 48, s); n++; win += x.mfe >= TARGET; clean += x.first === 1;
            }
            const base = d.base[`${s}|48`];
            r.push(n, `${pct(win / n)} (${pp(win / n - base.win)})`, `${pct(clean / n)} (${pp(clean / n - base.clean)})`);
        }
        rows.push(r);
    }
    const h = ['Trạng thái L6']; for (const s of SYMBOLS) h.push(`${s} n nến`, 'Win 12h', 'Sạch 12h');
    md(table(h, rows));
}

// 4. Theo từng cửa sổ thời gian cho event mạnh nhất (L6)
md('## 4. Event L6 theo cửa sổ thời gian\n');
{
    const rows = [];
    for (const s of [-1, 1]) for (const sym of SYMBOLS) {
        const d = data[sym];
        const e = evalEvents(sym, s, (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === s);
        rows.push([`${s < 0 ? 'Giảm' : 'Tăng'} · ${sym}`, e.n, ...HS.map((H) => `${pct(e.win[H] / e.n)} (${pp(e.win[H] / e.n - d.base[`${s}|${H}`].win)}) · sạch ${pct(e.clean[H] / e.n)} (${pp(e.clean[H] / e.n - d.base[`${s}|${H}`].clean)})`)]);
    }
    md(table(['Event L6', 'n', 'Trong 4h', 'Trong 12h', 'Trong 24h'], rows));
}

// 5. Bracket ±TARGET trong 12h: win sạch vs thua sạch -> kỳ vọng thô
md(`## 5. Bracket ±${(TARGET * 100).toFixed(0)}% trong 12h: thắng trước / thua trước / không chạm\n`);
md(`Kỳ vọng thô = ${(TARGET * 100).toFixed(0)}% × (thắng − thua), **chưa trừ phí** (~0.10% khứ hồi futures). Phần "không chạm" tính 0.\n`);
{
    const sel = (s) => [
        ['Nến bất kỳ (base)', () => () => true, true],
        ['L3 · KC ' + (s < 0 ? 'dưới' : 'trên') + ' cả 2 VWAP', (d) => (i) => d.kcD(i, s) && d.kcW(i, s)],
        ['L6 · + cấu trúc VWAP + ATRBot cùng hướng', (d) => (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === s],
        ['L6x · ATRBot ngược', (d) => (i) => d.vs[i] === s && d.kcD(i, s) && d.kcW(i, s) && d.f.st[i] === -s],
        ['ATRBot flip khi KC đã ' + (s < 0 ? 'dưới' : 'trên') + ' cả 2 VWAP', (d) => (i) => d.f.st[i] === s && d.kcD(i, s) && d.kcW(i, s)],
    ];
    const rows = [];
    for (const s of [-1, 1]) for (const [name, mk, every] of sel(s)) {
        const r = [`${s < 0 ? 'Giảm' : 'Tăng'} · ${name}`];
        for (const sym of SYMBOLS) {
            const d = data[sym], cond = mk(d);
            let n = 0, w = 0, l = 0;
            for (let i = WARMUP + 1; i < d.bars.n - 49; i++) {
                if (!(every || (cond(i) && !cond(i - 1)))) continue;
                const x = look(d.bars, i, i + 48, s); n++;
                if (x.first === 1) w++;
                else if (x.first === -1) l++;
            }
            r.push(n, pct(w / n), pct(l / n), pct(1 - (w + l) / n), `${((TARGET * (w - l) / n) * 100).toFixed(2)}%`);
        }
        rows.push(r);
    }
    const h = ['Event']; for (const s of SYMBOLS) h.push(`${s} n`, 'Thắng trước', 'Thua trước', 'Không chạm', 'Kỳ vọng thô');
    md(table(h, rows));
}

mkdirSync(join(HERE, 'reports'), { recursive: true });
const file = join(HERE, 'reports', `EVENTS_${market}_${(TARGET * 100).toFixed(1)}pct.md`);
writeFileSync(file, out.join('\n'));
console.log(out.join('\n'));
