// Gộp 4 indicator thành các feature tại thời điểm đóng nến i (không nhìn tương lai)
import { atrBot, vwap, keltner } from './indicators.mjs';

export const DEFAULTS = {
    bot: { atrLen: 14, mult: 2, src: 'hlc3', ma: 'VIDYA', maLen: 14 },
    kc: { len: 9, mult: 0.5, useTR: true },
};

const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

export function buildFeatures(bars, cfg = DEFAULTS) {
    const bot = atrBot(bars, cfg.bot);
    const dv = vwap(bars, 'day');
    const wv = vwap(bars, 'week');
    const kc = keltner(bars, cfg.kc);
    const atr = bot.atr; // RMA(TR,14) — cùng ATR với ATRBot
    const { n, c, t } = bars;

    const st = bot.state;
    const flip = new Int8Array(n);       // +1 flip lên, -1 flip xuống
    const wSide = new Int8Array(n);      // close vs VWAP tuần
    const dSide = new Int8Array(n);      // close vs VWAP phiên
    const stack = new Int8Array(n);      // VWAP phiên vs VWAP tuần
    const kz = new Int8Array(n);         // vùng Keltner: +1 trên upper, -1 dưới lower, 0 trong kênh
    const barsSinceFlip = new Int32Array(n);
    const minuteOfDay = new Int16Array(n);
    const dWv = new Float64Array(n), dDv = new Float64Array(n), spread = new Float64Array(n);

    for (let i = 0; i < n; i++) {
        flip[i] = i > 0 && st[i] !== st[i - 1] ? st[i] : 0;
        wSide[i] = sign(c[i] - wv[i]);
        dSide[i] = sign(c[i] - dv[i]);
        stack[i] = sign(dv[i] - wv[i]);
        kz[i] = c[i] > kc.upper[i] ? 1 : c[i] < kc.lower[i] ? -1 : 0;
        barsSinceFlip[i] = flip[i] ? 0 : i > 0 ? barsSinceFlip[i - 1] + 1 : 0;
        minuteOfDay[i] = Math.floor((t[i] % 86400000) / 60000);
        dWv[i] = (c[i] - wv[i]) / atr[i];
        dDv[i] = (c[i] - dv[i]) / atr[i];
        spread[i] = (bot.trail1[i] - bot.trail2[i]) / atr[i];
    }
    return { ...bot, dv, wv, kc, st, flip, wSide, dSide, stack, kz, barsSinceFlip, minuteOfDay, dWv, dDv, spread };
}
