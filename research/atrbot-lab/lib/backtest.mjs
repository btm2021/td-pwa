// Backtest engine 1 vị thế/lần, 1 chiều (long hoặc short).
// - Tín hiệu xác nhận khi nến i đóng -> vào lệnh tại open[i+1].
// - Stop/target kiểm tra intrabar; nếu cùng nến chạm cả 2 -> giả định chạm stop trước (bảo thủ).
// - Exit theo tín hiệu đóng nến -> thoát tại open nến kế tiếp.

/**
 * @param bars   OHLCV
 * @param opts.side       +1 long | -1 short
 * @param opts.entry(i)   true nếu có tín hiệu vào ở nến i (đã đóng)
 * @param opts.stopAt(i, pos)   giá stop hiệu lực cho nến i+1 (hoặc NaN)
 * @param opts.target(pos)      giá chốt lời cố định (hoặc NaN)
 * @param opts.exitSignal(i, pos) true nếu đóng nến i phát tín hiệu thoát
 * @param opts.maxBars    giữ tối đa N nến
 * @param opts.fee        phí + trượt giá mỗi chiều (tỉ lệ)
 */
export function backtest(bars, opts) {
    const { o, h, l, c, n } = bars;
    const { side, entry, stopAt = () => NaN, target = () => NaN, exitSignal = () => false,
        maxBars = Infinity, fee = 0.0005, start = 200 } = opts;
    const trades = [];
    let pos = null;

    const close = (j, price, reason) => {
        const gross = side * (price / pos.entry - 1);
        trades.push({ ...pos, exitIdx: j, exit: price, reason, bars: j - pos.idx + 1,
            gross, net: gross - 2 * fee, r: pos.risk > 0 ? side * (price - pos.entry) / pos.risk : NaN });
        pos = null;
    };

    for (let i = start; i < n - 1; i++) {
        if (pos) {
            // nến i đang chạy: kiểm tra stop/target với mức đã biết từ nến i-1
            const stop = pos.stop, tgt = pos.target;
            if (!isNaN(stop) && side * (o[i] - stop) <= 0) { close(i, o[i], 'stop'); }
            else if (!isNaN(stop) && side * ((side > 0 ? l[i] : h[i]) - stop) <= 0) { close(i, stop, 'stop'); }
            else if (!isNaN(tgt) && side * (o[i] - tgt) >= 0) { close(i, o[i], 'target'); }
            else if (!isNaN(tgt) && side * ((side > 0 ? h[i] : l[i]) - tgt) >= 0) { close(i, tgt, 'target'); }
            if (pos) {
                pos.mfe = Math.max(pos.mfe, side * ((side > 0 ? h[i] : l[i]) - pos.entry));
                pos.mae = Math.min(pos.mae, side * ((side > 0 ? l[i] : h[i]) - pos.entry));
                if (exitSignal(i, pos)) close(i + 1, o[i + 1], 'signal');
                else if (i - pos.idx + 1 >= maxBars) close(i + 1, o[i + 1], 'time');
                else {
                    const s = stopAt(i, pos);
                    // stop chỉ được dời theo hướng có lợi
                    if (!isNaN(s)) pos.stop = isNaN(pos.stop) ? s : side > 0 ? Math.max(pos.stop, s) : Math.min(pos.stop, s);
                }
            }
            if (pos) continue;
            // vừa thoát ở open[i+1] -> không vào lại trên cùng nến
            if (trades.length && trades[trades.length - 1].exitIdx === i + 1) continue;
        }
        if (entry(i)) {
            const px = o[i + 1];
            pos = { idx: i + 1, sigIdx: i, entry: px, mfe: 0, mae: 0, stop: NaN, target: NaN, risk: NaN };
            const s = stopAt(i, pos);
            if (!isNaN(s)) {
                // stop đã nằm sai phía so với giá vào -> bỏ lệnh
                if (side * (px - s) <= 0) { pos = null; continue; }
                pos.stop = s;
                pos.risk = side * (px - s);
            }
            pos.target = target(pos);
        }
    }
    if (pos) close(n - 1, c[n - 1], 'eod');
    return trades;
}

export function stats(trades, { drift = 0, side = 1, splitIdx = Infinity } = {}) {
    const N = trades.length;
    if (!N) return { n: 0 };
    let sum = 0, sq = 0, win = 0, gp = 0, gl = 0, bars = 0, eq = 0, peak = 0, dd = 0, sumR = 0, nR = 0;
    let isSum = 0, isN = 0, oosSum = 0, oosN = 0, driftAdj = 0;
    for (const t of trades) {
        sum += t.net; sq += t.net * t.net; bars += t.bars;
        if (t.net > 0) { win++; gp += t.net; } else gl -= t.net;
        eq += t.net; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq);
        if (!isNaN(t.r)) { sumR += t.net * t.entry / t.risk; nR++; } // R sau phí
        if (t.idx < splitIdx) { isSum += t.net; isN++; } else { oosSum += t.net; oosN++; }
        driftAdj += t.net - side * drift * t.bars;
    }
    const mean = sum / N;
    const sd = Math.sqrt(Math.max(0, sq / N - mean * mean));
    return {
        n: N,
        win: win / N,
        avg: mean,
        pf: gl > 0 ? gp / gl : Infinity,
        total: sum,
        maxDD: dd,
        t: sd > 0 ? mean / (sd / Math.sqrt(N)) : 0,
        avgBars: bars / N,
        avgR: nR ? sumR / nR : NaN,
        isAvg: isN ? isSum / isN : NaN,
        oosAvg: oosN ? oosSum / oosN : NaN,
        isN, oosN,
        edgeVsDrift: driftAdj / N,
    };
}
