// So khớp port lib/indicators.mjs với file gốc chart/custom_studies/atr-bot.js (chạy qua mock PineJS)
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { loadCsv, atrBot } from './lib/indicators.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const studySrc = readFileSync(join(HERE, '../../chart/custom_studies/atr-bot.js'), 'utf8');
const ctx = {};
vm.runInNewContext(studySrc + '\nthis.createATRBot = createATRBot;', ctx);

const file = process.argv[2] || 'IMXUSDT_15m_futures.csv';
const bars = loadCsv(readFileSync(join(HERE, 'data', file), 'utf8'));
let i = 0;
const PineJS = { Std: {
    high: () => bars.h[i], low: () => bars.l[i], close: () => bars.c[i],
    open: () => bars.o[i], volume: () => bars.v[i],
} };
const inputs = [14, 2, 'hlc3', 'VIDYA', 14];
const study = ctx.createATRBot(PineJS);
const inst = new study.constructor();
inst.init({}, (k) => inputs[k]);

const port = atrBot(bars);
let maxErr = 0, stateMismatch = 0;
for (i = 0; i < bars.n; i++) {
    const [t1, t2] = inst.main({}, (k) => inputs[k]);
    maxErr = Math.max(maxErr, Math.abs(t1 - port.trail1[i]) / t1, Math.abs(t2 - port.trail2[i]) / t1);
    if ((t1 > t2 ? 1 : -1) !== port.state[i]) stateMismatch++;
}
console.log(`${file}: bars=${bars.n} maxRelErr=${maxErr.toExponential(2)} stateMismatch=${stateMismatch}`);
