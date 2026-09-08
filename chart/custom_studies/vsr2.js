/**
 * Volume Based S/R v2 (VSR2)
 *
 * Port of the Pine v5 script "Volume Based S/R v2".
 * Fixes #1 and #2 of the original VSR:
 *   #1 blind to sustained bursts  -> baseline is now a rolling MEDIAN volume
 *      over a prior window, not just volume[1].
 *   #2 tiny denominator blows up the ratio -> median is robust to a single
 *      abnormally quiet/loud bar.
 *   Uses log-ratio normalized by its own rolling stdev (a z-score) instead
 *      of a raw percent change, so the threshold means the same thing
 *      across symbols/timeframes.
 *
 * Not fixed here (out of scope, see original Pine comments):
 *   #3 abs() still merges "burst" and "exhaustion" into one label.
 *   #4 threshold is still a fixed sigma value, not a percentile-based one.
 *   Zone width is still one bar, not ATR-normalized; only the most recent
 *   zone is kept (no zone age / retest count).
 */

(function (root) {
    'use strict';

    function median(sortedAscHelperArr) {
        const arr = sortedAscHelperArr.slice().sort((a, b) => a - b);
        const n = arr.length;
        if (n === 0) return NaN;
        // ta.percentile_nearest_rank(., ., 50): nearest-rank method, 1-indexed rank.
        const rank = Math.max(1, Math.ceil(0.5 * n));
        return arr[Math.min(n, rank) - 1];
    }

    function populationStdev(arr) {
        const n = arr.length;
        if (n === 0) return NaN;
        const mean = arr.reduce((s, v) => s + v, 0) / n;
        const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
        return Math.sqrt(variance);
    }

    function buildMetainfo() {
        const plots = [
            { id: 'plot_upper', type: 'line' },
            { id: 'plot_lower', type: 'line' },
            { id: 'shape_trigger', type: 'shapes' },
        ];

        const styles = {
            plot_upper: { title: 'Biên trên', histogramBase: 0, joinPoints: false },
            plot_lower: { title: 'Biên dưới', histogramBase: 0, joinPoints: false },
            shape_trigger: {
                title: 'Sự kiện khối lượng',
                location: 'BelowBar',
                plottype: 'shape_arrow_up',
                isHidden: false,
            },
        };

        const defaultStyles = {
            plot_upper: {
                visible: true, color: '#2962FF', linewidth: 1, linestyle: 0,
                plottype: 2, trackPrice: false, transparency: 0,
            },
            plot_lower: {
                visible: true, color: '#2962FF', linewidth: 1, linestyle: 0,
                plottype: 2, trackPrice: false, transparency: 0,
            },
            shape_trigger: {
                color: '#FF9800', transparency: 0, linewidth: 3,
                plottype: 'shape_arrow_up', location: 'BelowBar', visible: true,
            },
        };

        const filledAreas = [
            { id: 'fillarea_zone', objAId: 'plot_upper', objBId: 'plot_lower', type: 'plot_plot', title: 'Vùng' },
        ];

        const filledAreasStyle = {
            fillarea_zone: { color: '#089981', transparency: 90, visible: true },
        };

        const inputs = [
            {
                id: 'lenRef', name: 'Cửa sổ trung vị khối lượng', defval: 50, type: 'integer', min: 5, max: 2000,
                tooltip: 'Số nến dùng để tính trung vị làm mốc so sánh. Càng dài thì mốc càng ổn định nhưng càng chậm phản ứng khi regime khối lượng đổi.',
            },
            {
                id: 'lenDisp', name: 'Cửa sổ độ phân tán', defval: 100, type: 'integer', min: 10, max: 5000,
                tooltip: 'Số nến dùng để chuẩn hóa log-ratio về đơn vị sigma.',
            },
            {
                id: 'thresh', name: 'Ngưỡng (sigma)', defval: 3.0, type: 'float', min: 0.5, max: 20, step: 0.1,
                tooltip: 'Bản gốc dùng 5 trên một đại lượng khác hẳn. Với log-ratio đã chuẩn hóa, vùng hợp lý thường là 2.5 - 3.5.',
            },
            {
                id: 'zoneSrc', name: 'Lấy vùng từ', defval: 'Nến trước', type: 'text', options: ['Nến trước', 'Nến tín hiệu'],
                tooltip: 'Bản gốc lấy high[1]/low[1]. Đây là biến rẻ nhất để đem đi so sánh.',
            },
        ];

        const defaultInputs = {
            lenRef: 50,
            lenDisp: 100,
            thresh: 3.0,
            zoneSrc: 'Nến trước',
        };

        return {
            _metainfoVersion: 51,
            id: 'vsr2@tv-basicstudies-1',
            name: 'Volume Based S/R v2',
            description: 'Volume Based S/R v2',
            shortDescription: 'VSR2',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,
            plots: plots,
            defaults: {
                styles: defaultStyles,
                filledAreasStyle: filledAreasStyle,
                inputs: defaultInputs,
            },
            inputs: inputs,
            styles: styles,
            filledAreas: filledAreas,
            precision: 4,
            format: { type: 'price', precision: 4 },
        };
    }

    function createVSR2(PineJS) {
        return {
            name: 'Volume Based S/R v2',
            metainfo: buildMetainfo(),

            constructor: function VSR2Study() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    this.barCount = 0;
                    this.volWindow = [];
                    this.rWindow = [];
                    this.prevHigh = NaN;
                    this.prevLow = NaN;
                    this.levelHi = NaN;
                    this.levelLo = NaN;
                };

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const lenRef = Math.max(5, Math.round(Number(this._input(0)) || 50));
                    const lenDisp = Math.max(10, Math.round(Number(this._input(1)) || 100));
                    const thresh = Number(this._input(2));
                    const zoneSrc = this._input(3);

                    const high = PineJS.Std.high(this._context);
                    const low = PineJS.Std.low(this._context);
                    const volume = PineJS.Std.volume(this._context);

                    const barIndex = this.barCount;

                    // Baseline: median volume of the window BEFORE the current bar
                    // (mirrors ta.percentile_nearest_rank(volume, lenRef, 50)[1]).
                    const baseline = this.volWindow.length >= lenRef ? median(this.volWindow) : NaN;

                    const hasVol = Number.isFinite(volume) && volume > 0 && Number.isFinite(baseline) && baseline > 0;

                    const r = hasVol ? Math.log(volume / baseline) : 0.0;

                    // Dispersion: stdev of r over the window BEFORE the current bar
                    // (mirrors ta.stdev(r, lenDisp)[1]).
                    const disp = this.rWindow.length > 0 ? populationStdev(this.rWindow) : NaN;

                    const score = (Number.isFinite(disp) && disp > 0) ? r / disp : 0.0;

                    const warmup = barIndex < (lenRef + lenDisp);
                    const trigger = !warmup && hasVol && Math.abs(score) > thresh;

                    const srcHi = zoneSrc === 'Nến trước' ? this.prevHigh : high;
                    const srcLo = zoneSrc === 'Nến trước' ? this.prevLow : low;

                    if (trigger && Number.isFinite(srcHi) && Number.isFinite(srcLo)) {
                        this.levelHi = srcHi;
                        this.levelLo = srcLo;
                    }

                    // Roll history windows forward for the NEXT bar.
                    this.volWindow.push(Number.isFinite(volume) ? volume : 0);
                    if (this.volWindow.length > lenRef) this.volWindow.shift();

                    this.rWindow.push(r);
                    if (this.rWindow.length > lenDisp) this.rWindow.shift();

                    this.prevHigh = high;
                    this.prevLow = low;
                    this.barCount++;

                    return [
                        this.levelHi,
                        this.levelLo,
                        trigger ? low : NaN,
                    ];
                };
            },
        };
    }

    root.createVSR2 = createVSR2;
})(typeof window !== 'undefined' ? window : globalThis);
