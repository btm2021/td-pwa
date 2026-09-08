/**
 * SMC Trading Range (2 Lines)
 *
 * Mô phỏng đúng cơ chế "SMC Range" đã thêm vào indicator_stat2_box_strategy.js
 * (dự án /fv): range giao dịch hiện hành = khoảng giữa Swing High và Swing
 * Low ĐÃ XÁC NHẬN gần nhất -- đúng lý thuyết SMC (giá coi như đang "ranging"
 * cho tới khi có Break of Structure vượt ra ngoài 1 trong 2 mức này).
 *
 * Causal 100%: một pivot tại bar (now - right_bars) chỉ được xác nhận sau
 * khi đã thấy đủ `right_bars` bar kế tiếp xác nhận nó là cực trị cục bộ --
 * đúng pattern đã dùng ở `swing-points.js` trong cùng thư mục (mọi offset
 * PineJS.Std.* đều là offset lùi về QUÁ KHỨ so với bar hiện tại, không có
 * cách nào nhìn tương lai thật).
 *
 * 2 đường plot:
 *   plot_0 = Range Upper (mức Swing High đã xác nhận gần nhất)
 *   plot_1 = Range Lower (mức Swing Low đã xác nhận gần nhất)
 * + 1 dải mờ tô giữa 2 đường (filledAreas) để nhìn trực quan như 1 "hộp".
 */

function createSMCRange(PineJS) {
    return {
        name: 'SMC Trading Range',
        metainfo: {
            _metainfoVersion: 51,
            id: 'smc_range@tv-basicstudies-1',
            name: 'SMC Trading Range',
            description: 'SMC Trading Range (Swing High/Low Structure)',
            shortDescription: 'SMC Range',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,

            plots: [
                { id: 'plot_0', type: 'line' },  // Range Upper (Swing High)
                { id: 'plot_1', type: 'line' }   // Range Lower (Swing Low)
            ],

            filledAreas: [
                {
                    id: 'range_fill',
                    objAId: 'plot_0',
                    objBId: 'plot_1',
                    type: 'plot_plot',
                    title: 'Range Fill'
                }
            ],

            defaults: {
                styles: {
                    plot_0: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,   // 0 = line liền (step nhờ giá trị forward-fill)
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: '#facc15'   // vàng — Swing High / kháng cự
                    },
                    plot_1: {
                        linestyle: 0,
                        linewidth: 2,
                        plottype: 0,
                        trackPrice: false,
                        transparency: 0,
                        visible: true,
                        color: '#38bdf8'   // xanh dương — Swing Low / hỗ trợ
                    }
                },
                filledAreasStyle: {
                    range_fill: {
                        color: '#94a3b8',
                        transparency: 92,
                        visible: true
                    }
                },
                inputs: {
                    left_bars: 20,
                    right_bars: 20
                }
            },

            inputs: [
                {
                    id: 'left_bars',
                    name: 'Left Bars (Swing confirm)',
                    defval: 20,
                    type: 'integer',
                    min: 1,
                    max: 100
                },
                {
                    id: 'right_bars',
                    name: 'Right Bars (Swing confirm)',
                    defval: 20,
                    type: 'integer',
                    min: 1,
                    max: 100
                }
            ],

            styles: {
                plot_0: {
                    title: 'Range Upper (Swing High)',
                    histogramBase: 0,
                    joinPoints: true
                },
                plot_1: {
                    title: 'Range Lower (Swing Low)',
                    histogramBase: 0,
                    joinPoints: true
                }
            },

            precision: 4,
            format: {
                type: 'price',
                precision: 4
            }
        },

        constructor: function () {
            this.init = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                // State causal: mức Swing High/Low đã XÁC NHẬN gần nhất,
                // forward-fill theo thời gian (giống zone_upper/zone_lower
                // trong bản Python/JS ở dự án /fv).
                this.lastSwingHigh = NaN;
                this.lastSwingLow = NaN;
            };

            this.main = function (context, inputCallback) {
                this._context = context;
                this._input = inputCallback;

                const leftBars = this._input(0);
                const rightBars = this._input(1);

                // Ứng viên pivot = bar cách hiện tại đúng `rightBars` bar về
                // quá khứ. Mọi bar dùng để kiểm tra (cả 2 phía) đều là quá
                // khứ so với "now" -> 100% causal, giống hệt swing-points.js.
                const offset = rightBars;
                const pivotHigh = PineJS.Std.high(this._context, offset);
                const pivotLow = PineJS.Std.low(this._context, offset);

                if (!isNaN(pivotHigh) && !isNaN(pivotLow)) {
                    // Check Swing High tại pivot
                    let isSwingHigh = true;
                    for (let i = 1; i <= leftBars && isSwingHigh; i++) {
                        const pastHigh = PineJS.Std.high(this._context, offset + i);
                        if (isNaN(pastHigh) || pivotHigh <= pastHigh) isSwingHigh = false;
                    }
                    for (let i = 1; i <= rightBars && isSwingHigh; i++) {
                        const newerHigh = PineJS.Std.high(this._context, offset - i);
                        if (isNaN(newerHigh) || pivotHigh <= newerHigh) isSwingHigh = false;
                    }
                    if (isSwingHigh) this.lastSwingHigh = pivotHigh;

                    // Check Swing Low tại pivot
                    let isSwingLow = true;
                    for (let i = 1; i <= leftBars && isSwingLow; i++) {
                        const pastLow = PineJS.Std.low(this._context, offset + i);
                        if (isNaN(pastLow) || pivotLow >= pastLow) isSwingLow = false;
                    }
                    for (let i = 1; i <= rightBars && isSwingLow; i++) {
                        const newerLow = PineJS.Std.low(this._context, offset - i);
                        if (isNaN(newerLow) || pivotLow >= newerLow) isSwingLow = false;
                    }
                    if (isSwingLow) this.lastSwingLow = pivotLow;
                }

                // Forward-fill: trả về mức range hiện hành (đã biết tới lúc
                // này), không phải giá trị tại riêng bar pivot -- đây chính
                // là điểm khác biệt với swing-points.js (chỉ chấm 1 điểm).
                return [this.lastSwingHigh, this.lastSwingLow];
            };
        }
    };
}
