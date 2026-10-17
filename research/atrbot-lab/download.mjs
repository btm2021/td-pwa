// Tải N nến OHLCV từ Binance (spot hoặc USDT-M futures), phân trang lùi theo thời gian.
// Usage: node download.mjs SYMBOL [interval=15m] [count=100000] [market=futures|spot]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const [symbol = 'SOLUSDT', interval = '15m', countArg = '100000', market = 'futures'] = process.argv.slice(2);
const COUNT = Number(countArg);

const API = market === 'spot'
    ? { url: 'https://api.binance.com/api/v3/klines', limit: 1000 }
    : { url: 'https://fapi.binance.com/fapi/v1/klines', limit: 1500 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(endTime) {
    const qs = new URLSearchParams({ symbol, interval, limit: String(API.limit) });
    if (endTime) qs.set('endTime', String(endTime));
    for (let attempt = 0; attempt < 8; attempt++) {
        const res = await fetch(`${API.url}?${qs}`);
        if (res.ok) return res.json();
        // 429/418 = vượt rate limit: chờ theo Retry-After của sàn
        const wait = res.status === 429 || res.status === 418
            ? (Number(res.headers.get('retry-after')) || 30) * 1000
            : 1000 * (attempt + 1);
        console.warn(`HTTP ${res.status}, chờ ${wait / 1000}s rồi thử lại (${attempt + 1})`);
        await sleep(wait);
    }
    throw new Error('fetch failed');
}

const byTime = new Map();
let endTime;
while (byTime.size < COUNT) {
    const page = await fetchPage(endTime);
    if (!page.length) break;
    for (const k of page) byTime.set(k[0], k);
    endTime = page[0][0] - 1;
    process.stdout.write(`\r${symbol} ${market}: ${byTime.size} bars`);
    if (page.length < API.limit) break; // hết lịch sử
    await sleep(300);
}

const now = Date.now();
const rows = [...byTime.values()]
    .sort((a, b) => a[0] - b[0])
    .filter((k) => k[6] < now) // bỏ nến chưa đóng
    .slice(-COUNT)
    .map((k) => [k[0], k[1], k[2], k[3], k[4], k[5]].join(','));

const out = join(HERE, 'data', `${symbol}_${interval}_${market}.csv`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, 'time,open,high,low,close,volume\n' + rows.join('\n') + '\n');
console.log(`\nSaved ${rows.length} bars -> ${out}`);
