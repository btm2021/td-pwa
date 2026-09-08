/**
 * VSR3 — Phân loại volume spike có delta
 *
 * Cài đặt theo "SPEC — VSR3: Phân loại volume spike có delta" do người dùng cung cấp.
 * File này PHẢI được đọc cùng với báo cáo agent gửi kèm (các chỗ spec yêu cầu Pine v5
 * thật nhưng API custom-indicator JS của charting_library không hỗ trợ) — KHÔNG coi
 * file này là bản dịch 1:1 hoàn chỉnh của spec, xem mục "GAPS" bên dưới.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * GAPS — những chỗ spec yêu cầu nhưng KHÔNG cài được trong JS custom-study API
 * của charting_library tự host (không phải Pine Editor thật), báo cáo thay vì
 * âm thầm thay thế:
 *
 *   G1. Nguồn A (delta lower-timeframe qua request.security) KHÔNG THỂ cài.
 *       API custom_indicators_getter/PineJS.Std không có cơ chế lấy dữ liệu
 *       timeframe khác. => Script LUÔN dùng Nguồn B (BVC). Input "deltaSource"
 *       tồn tại nhưng chỉ có giá trị "BVC" — giữ lại để tương thích khi (nếu)
 *       Nguồn A được thêm ở bản sau. Test #2 và #3 ở §9 do đó không chạy được
 *       theo đúng nghĩa (xem báo cáo kiểm thử).
 *
 *   G2. §5.4 "bảng thống kê" (table.new trên pane) KHÔNG vẽ được — API này
 *       không có table/label tự do, chỉ có plots/shapes/fills theo metainfo.
 *       Thay thế: 7 plot ẩn (display: chỉ Data Window) đếm DỒN số lần mỗi
 *       nhãn xuất hiện từ đầu lịch sử đang nạp — cnt_* ở cuối mảng plots.
 *       Xem giá trị bằng cách mở Data Window tại nến cuối cùng.
 *
 *   G3. Tooltip động trên label (score, rangeBand, deltaRatio, gapRatio,
 *       legExtension, nguồn delta cho TỪNG sự kiện) KHÔNG cài được — style
 *       của "shapes" plot trong API này chỉ nhận text/tiêu đề TĨNH theo plot
 *       id, không nhận tooltip động theo từng lần gọi như label.new(tooltip=).
 *       Thay thế: 7 plot ẩn diag_* (score, baseline, rangeBand, deltaRatio,
 *       gapRatio, legExtension, controlSide) trong Data Window — xem được số
 *       liệu của nến đang hover, nhưng không có tooltip gắn liền với icon.
 *
 *   G4. "Giới hạn số label giữ lại qua input" (để không đụng trần label của
 *       Pine) — KHÔNG áp dụng: shapes-plot của API này không đi qua cơ chế
 *       label.new/max_labels_count của Pine nên không có trần tương tự để
 *       giới hạn. Không thêm input này (không bịa tính năng không có tác dụng).
 *
 *   G5. barstate.isconfirmed không tồn tại trong API này. Thay thế: toàn bộ
 *       state (VIDYA/ATR/median/stdev/BVC/flip/zone/đếm nhãn) chỉ được CẬP
 *       NHẬT khi phát hiện một nến MỚI đã mở (nghĩa là nến trước đó vừa đóng),
 *       và giá trị xuất ra được gắn offset:-1 trong metainfo để hiển thị đúng
 *       vào đúng nến đã đóng đó (không phải nến đang hình thành). Đây là cách
 *       duy nhất khả dụng trong framework này để đạt "không phát nhãn trước
 *       khi nến đóng" — tương đương tinh thần of barstate.isconfirmed, không
 *       phải bản sao chính xác. Hệ quả: nhãn/vùng xuất hiện trễ đúng 1 nến so
 *       với thời điểm nến đóng thật (giống Pine khi label chỉ vẽ tại
 *       isconfirmed của nến kế tiếp).
 *
 *   G6. §1 và §6 không cho giá trị mặc định của các tham số ATRBot nội bộ
 *       (cmoLength, maLength, atrLength, atrMult) — spec chỉ liệt kê tham số
 *       của VSR3 ở §6, không có tham số ATRBot. Đã thêm 4 input này với mặc
 *       định lấy đúng theo "ATR Bot"/"VIDYA" đã có sẵn trong repo
 *       (atr-bot.js, vidya.js: atrLength=14, atrMult=2.0, cmoLength=9,
 *       maLength=30) để nhất quán, KHÔNG tự bịa số. Nguồn "source" cho VIDYA
 *       trong ATRBot bị hardcode = close (spec không liệt kê input này ở §6).
 *
 * ════════════════════════════════════════════════════════════════════════════
 * KHUYẾT TẬT ĐÃ BIẾT (§8 của spec) — giữ nguyên, không tự vá:
 *
 *   D1. Chu kỳ khối lượng trong ngày: lenRef=50 trên khung 15m chỉ ~12 tiếng,
 *       nên trung vị (baseline) trộn phiên vắng với phiên sôi động. Một nến
 *       bình thường của phiên Mỹ có thể bị chấm bất thường chỉ vì mốc so
 *       sánh đến từ phiên Á. Vá lỗi này (mốc theo cùng khung giờ) là phạm vi
 *       của phiên bản sau.
 *   D2. BVC là ƯỚC LƯỢNG theo mô hình (giả định log-return chuẩn hoá tuân
 *       phân phối chuẩn, và giả định quan hệ đơn điệu giữa return và tỷ lệ
 *       lệnh chủ động) — không phải delta đo được, và kém tin cậy nhất đúng
 *       tại các nến cực trị mà script quan tâm nhất.
 *   D3. Volume là của một sàn (nguồn dữ liệu hiện có), không phải toàn thị
 *       trường.
 *   D4. Vùng vẫn chỉ rộng bằng một nến, chưa có vòng đời (tuổi vùng, số lần
 *       bị test, hết hạn) — nằm ngoài phạm vi §0 của spec này.
 *
 * ════════════════════════════════════════════════════════════════════════════
 * PHÁT HIỆN KHI KIỂM CHỨNG (đo trên 6000 nến BTCUSDT 15m thật, ~63 ngày).
 * Ghi lại theo §0 spec: đề xuất thì ghi chú, KHÔNG tự ý sửa cây phân loại.
 *
 *   F1. REJECTION là nhãn CHẾT khi chỉ có Nguồn B (BVC). Đo được: 0/5982 nến
 *       có sign(deltaRatio) != barDir — tức 0.00%, không phải "hiếm" mà là
 *       BẤT KHẢ THI VỀ MẶT CẤU TRÚC.
 *       Lý do: BVC suy ra delta từ log(close/close[1]), nên
 *       sign(deltaRatio) = sign(close - close[1]); còn barDir = sign(close - open).
 *       Trên thị trường crypto chạy 24/7, open ~ close[1] (đo được: 50.2% số
 *       nến có open == close[1] CHÍNH XÁC, lệch lớn nhất chỉ 0.0027%) nên hai
 *       đại lượng này luôn cùng dấu. Hai vế của điều kiện REJECTION thực chất
 *       đang đo CÙNG MỘT THỨ.
 *       => REJECTION chỉ sống được với delta đo thật (Nguồn A, xem G1).
 *       ĐỀ XUẤT (chưa code): §4.1 của spec có định nghĩa closePos nhưng §4.2
 *       không dùng tới nó ở bất kỳ ô nào — nhiều khả năng chính là chỗ này.
 *       Nếu đổi điều kiện REJECTION từ barDir sang closePos (delta dương mà
 *       đóng ở nửa dưới, và ngược lại) thì nhãn sống lại: đo được 4/35 nến
 *       burst rộng thỏa. Đây đúng với ví dụ mô tả ở §3.3 của spec.
 *
 *   F2. Hai nhãn ABSORPTION_* không xuất hiện với ngưỡng mặc định vì điều kiện
 *       "narrow" không bao giờ thỏa trên nến burst: 0/45 nến burst có
 *       rangeBand <= 0.35 (rangeBand nhỏ nhất của nến burst là 0.388, trung vị
 *       1.476), trong khi trên TOÀN BỘ chart có tới 33.5% số nến là narrow.
 *       Nguyên nhân: khối lượng và biên độ tương quan mạnh — nến có volume
 *       bùng nổ 3 sigma gần như luôn kèm biên độ giãn.
 *       Các điều kiện khác đều với tới được (deltaStrong 38/45, atExtreme
 *       14/45, inPullback 19/45, matureLeg 26/45) => cơ chế không hỏng.
 *       Đo thêm: hạ thrBurst 3.0 -> 2.0 thì có ngay ABSORPTION_REV=4,
 *       ABSORPTION_CONT=3, CHURN=11. Hạ xuống 1.5 thì 9/6/38.
 *       KHÔNG tự đổi mặc định — đây là tham số người dùng hiệu chỉnh (§6).
 *
 *   F3. closePos định nghĩa ở §4.1 nhưng không ô nào trong §4.2 dùng đến, nên
 *       file này không tính nó (tránh code chết). Xem F1 nếu muốn dùng.
 * ════════════════════════════════════════════════════════════════════════════
 */

(function (root) {
    'use strict';

    // ---- Helpers dùng chung (giống vsr2.js) ------------------------------
    function median(arr) {
        const a = arr.slice().sort((x, y) => x - y);
        const n = a.length;
        if (n === 0) return NaN;
        const rank = Math.max(1, Math.ceil(0.5 * n));
        return a[Math.min(n, rank) - 1];
    }

    function populationStdev(arr) {
        const n = arr.length;
        if (n === 0) return NaN;
        const mean = arr.reduce((s, v) => s + v, 0) / n;
        const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / n;
        return Math.sqrt(variance);
    }

    function sgn(x) {
        return x > 0 ? 1 : (x < 0 ? -1 : 0);
    }

    function clamp01(x) {
        return Math.max(0, Math.min(1, x));
    }

    // Nhãn theo đúng thứ tự ưu tiên §4.2 (index 0..6 = nhãn 1..7)
    const LABELS = [
        'REJECTION',
        'ABSORPTION_REV',
        'ABSORPTION_CONT',
        'CLIMAX',
        'INITIATION',
        'CHURN',
        'UNCLASSIFIED',
    ];
    const LABEL_SHAPE_TEXT = ['REJ', 'AB-R', 'AB-C', 'CLX', 'INIT', 'CHURN', 'UNCL'];

    // ---- Metainfo ----------------------------------------------------------
    function buildMetainfo() {
        const plots = [
            // Vùng theo nhóm màu (§5.1): (1,2) hấp thụ/đảo chiều, (3,5) tiếp diễn, (4) climax.
            // offset:-1 vì mọi giá trị chỉ được xác nhận 1 nến sau khi nến đó đóng (xem G5).
            { id: 'zone_absorb_upper', type: 'line', offset: -1 },
            { id: 'zone_absorb_lower', type: 'line', offset: -1 },
            { id: 'zone_cont_upper', type: 'line', offset: -1 },
            { id: 'zone_cont_lower', type: 'line', offset: -1 },
            { id: 'zone_climax_upper', type: 'line', offset: -1 },
            { id: 'zone_climax_lower', type: 'line', offset: -1 },

            // Nhãn trên chart (§5.2) — text tĩnh ngắn gọn theo từng loại (xem G3 về tooltip).
            { id: 'shape_rejection', type: 'shapes', offset: -1 },
            { id: 'shape_absorption_rev', type: 'shapes', offset: -1 },
            { id: 'shape_absorption_cont', type: 'shapes', offset: -1 },
            { id: 'shape_climax', type: 'shapes', offset: -1 },
            { id: 'shape_initiation', type: 'shapes', offset: -1 },
            { id: 'shape_churn', type: 'shapes', offset: -1 },
            { id: 'shape_unclassified', type: 'shapes', offset: -1 },

            // §5.3 — bắt buộc, chỉ hiện trong Data Window (visible:false trên pane).
            { id: 'diag_score', type: 'line', offset: -1 },
            { id: 'diag_baseline', type: 'line', offset: -1 },
            { id: 'diag_range_band', type: 'line', offset: -1 },
            { id: 'diag_delta_ratio', type: 'line', offset: -1 },
            { id: 'diag_gap_ratio', type: 'line', offset: -1 },
            { id: 'diag_leg_extension', type: 'line', offset: -1 },
            { id: 'diag_control_side', type: 'line', offset: -1 },

            // §5.4 thay thế bằng đếm dồn trong Data Window (xem G2).
            { id: 'cnt_rejection', type: 'line', offset: -1 },
            { id: 'cnt_absorption_rev', type: 'line', offset: -1 },
            { id: 'cnt_absorption_cont', type: 'line', offset: -1 },
            { id: 'cnt_climax', type: 'line', offset: -1 },
            { id: 'cnt_initiation', type: 'line', offset: -1 },
            { id: 'cnt_churn', type: 'line', offset: -1 },
            { id: 'cnt_unclassified', type: 'line', offset: -1 },
        ];

        const styles = {
            zone_absorb_upper: { title: 'Vùng hấp thụ/đảo chiều - biên trên', histogramBase: 0, joinPoints: false },
            zone_absorb_lower: { title: 'Vùng hấp thụ/đảo chiều - biên dưới', histogramBase: 0, joinPoints: false },
            zone_cont_upper: { title: 'Vùng tiếp diễn - biên trên', histogramBase: 0, joinPoints: false },
            zone_cont_lower: { title: 'Vùng tiếp diễn - biên dưới', histogramBase: 0, joinPoints: false },
            zone_climax_upper: { title: 'Vùng CLIMAX - biên trên', histogramBase: 0, joinPoints: false },
            zone_climax_lower: { title: 'Vùng CLIMAX - biên dưới', histogramBase: 0, joinPoints: false },

            shape_rejection: { title: 'REJECTION', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },
            shape_absorption_rev: { title: 'ABSORPTION_REV', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },
            shape_absorption_cont: { title: 'ABSORPTION_CONT', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },
            shape_climax: { title: 'CLIMAX', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },
            shape_initiation: { title: 'INITIATION', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },
            shape_churn: { title: 'CHURN', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },
            shape_unclassified: { title: 'UNCLASSIFIED', location: 'BelowBar', plottype: 'shape_arrow_up', isHidden: false },

            diag_score: { title: 'score (sigma)', histogramBase: 0, joinPoints: false },
            diag_baseline: { title: 'baseline (volume trung vị)', histogramBase: 0, joinPoints: false },
            diag_range_band: { title: 'rangeBand', histogramBase: 0, joinPoints: false },
            diag_delta_ratio: { title: 'deltaRatio (BVC)', histogramBase: 0, joinPoints: false },
            diag_gap_ratio: { title: 'gapRatio', histogramBase: 0, joinPoints: false },
            diag_leg_extension: { title: 'legExtension', histogramBase: 0, joinPoints: false },
            diag_control_side: { title: 'controlSide', histogramBase: 0, joinPoints: false },

            cnt_rejection: { title: 'Đếm dồn REJECTION (thay §5.4, xem G2)', histogramBase: 0, joinPoints: false },
            cnt_absorption_rev: { title: 'Đếm dồn ABSORPTION_REV', histogramBase: 0, joinPoints: false },
            cnt_absorption_cont: { title: 'Đếm dồn ABSORPTION_CONT', histogramBase: 0, joinPoints: false },
            cnt_climax: { title: 'Đếm dồn CLIMAX', histogramBase: 0, joinPoints: false },
            cnt_initiation: { title: 'Đếm dồn INITIATION', histogramBase: 0, joinPoints: false },
            cnt_churn: { title: 'Đếm dồn CHURN', histogramBase: 0, joinPoints: false },
            cnt_unclassified: { title: 'Đếm dồn UNCLASSIFIED', histogramBase: 0, joinPoints: false },
        };

        function lineStyle(color, visible) {
            return {
                linestyle: 0, linewidth: 1, plottype: 0,
                trackPrice: false, transparency: visible ? 0 : 100, visible: !!visible, color,
            };
        }
        function hiddenSeriesStyle() {
            // Xấp xỉ display=display.data_window: ẩn trên pane (visible:false),
            // vẫn liệt kê trong Data Window (xem G3).
            return { linestyle: 0, linewidth: 1, plottype: 0, trackPrice: false, transparency: 100, visible: false, color: '#787B86' };
        }
        function shapeStyle(color) {
            return { color, transparency: 0, linewidth: 2, plottype: 'shape_arrow_up', location: 'BelowBar', visible: true };
        }

        const COLOR_ABSORB = '#AB47BC';   // nhóm hấp thụ/đảo chiều (1,2) — tông tím
        const COLOR_CONT = '#2962FF';     // nhóm tiếp diễn (3,5) — tông xanh dương
        const COLOR_CLIMAX = '#FF6D00';   // CLIMAX (4) — tông cảnh báo riêng, khác tông với INITIATION
        const COLOR_NEUTRAL = '#787B86';  // CHURN/UNCLASSIFIED — trung tính

        const defaultStyles = {
            zone_absorb_upper: lineStyle(COLOR_ABSORB, true),
            zone_absorb_lower: lineStyle(COLOR_ABSORB, true),
            zone_cont_upper: lineStyle(COLOR_CONT, true),
            zone_cont_lower: lineStyle(COLOR_CONT, true),
            zone_climax_upper: lineStyle(COLOR_CLIMAX, true),
            zone_climax_lower: lineStyle(COLOR_CLIMAX, true),

            shape_rejection: shapeStyle(COLOR_ABSORB),
            shape_absorption_rev: shapeStyle(COLOR_ABSORB),
            shape_absorption_cont: shapeStyle(COLOR_CONT),
            shape_climax: shapeStyle(COLOR_CLIMAX),
            shape_initiation: shapeStyle(COLOR_CONT),
            shape_churn: shapeStyle(COLOR_NEUTRAL),
            shape_unclassified: shapeStyle(COLOR_NEUTRAL),

            diag_score: hiddenSeriesStyle(),
            diag_baseline: hiddenSeriesStyle(),
            diag_range_band: hiddenSeriesStyle(),
            diag_delta_ratio: hiddenSeriesStyle(),
            diag_gap_ratio: hiddenSeriesStyle(),
            diag_leg_extension: hiddenSeriesStyle(),
            diag_control_side: hiddenSeriesStyle(),

            cnt_rejection: hiddenSeriesStyle(),
            cnt_absorption_rev: hiddenSeriesStyle(),
            cnt_absorption_cont: hiddenSeriesStyle(),
            cnt_climax: hiddenSeriesStyle(),
            cnt_initiation: hiddenSeriesStyle(),
            cnt_churn: hiddenSeriesStyle(),
            cnt_unclassified: hiddenSeriesStyle(),
        };

        const filledAreas = [
            { id: 'fill_absorb', objAId: 'zone_absorb_upper', objBId: 'zone_absorb_lower', type: 'plot_plot', title: 'Vùng hấp thụ/đảo chiều' },
            { id: 'fill_cont', objAId: 'zone_cont_upper', objBId: 'zone_cont_lower', type: 'plot_plot', title: 'Vùng tiếp diễn' },
            { id: 'fill_climax', objAId: 'zone_climax_upper', objBId: 'zone_climax_lower', type: 'plot_plot', title: 'Vùng CLIMAX' },
        ];
        const filledAreasStyle = {
            fill_absorb: { color: COLOR_ABSORB, transparency: 85, visible: true },
            fill_cont: { color: COLOR_CONT, transparency: 88, visible: true },
            fill_climax: { color: COLOR_CLIMAX, transparency: 82, visible: true },
        };

        const inputs = [
            { id: 'lenRef', name: 'Cửa sổ trung vị khối lượng (lenRef)', defval: 50, type: 'integer', min: 5, max: 2000,
                tooltip: 'Xem D1: 50 nến trên 15m ~12h, trộn phiên vắng/sôi động.' },
            { id: 'lenDisp', name: 'Cửa sổ độ phân tán (lenDisp)', defval: 100, type: 'integer', min: 10, max: 5000 },
            { id: 'thrBurst', name: 'Ngưỡng burst (sigma)', defval: 3.0, type: 'float', min: 0.5, max: 20, step: 0.1 },
            { id: 'thrDryup', name: 'Ngưỡng dryup (sigma)', defval: 3.0, type: 'float', min: 0.5, max: 20, step: 0.1,
                tooltip: 'dryup chỉ là cờ ngữ cảnh, không tạo vùng/nhãn (xem §2 spec).' },
            { id: 'thrWide', name: 'Ngưỡng nến rộng (rangeBand)', defval: 0.8, type: 'float', min: 0.05, max: 5, step: 0.05 },
            { id: 'thrNarrow', name: 'Ngưỡng nến hẹp (rangeBand)', defval: 0.35, type: 'float', min: 0.01, max: 5, step: 0.05 },
            { id: 'thrDelta', name: 'Ngưỡng deltaRatio mạnh', defval: 0.35, type: 'float', min: 0.01, max: 1, step: 0.01 },
            { id: 'thrExtreme', name: 'Ngưỡng gapRatio cực trị leg', defval: 0.85, type: 'float', min: 0.01, max: 1, step: 0.01 },
            { id: 'thrPullback', name: 'Ngưỡng gapRatio pullback', defval: 0.5, type: 'float', min: 0.01, max: 1, step: 0.01 },
            { id: 'thrMature', name: 'Ngưỡng leg trưởng thành (band)', defval: 2.0, type: 'float', min: 0.1, max: 20, step: 0.1 },
            { id: 'lenBVC', name: 'Cửa sổ stdev log-return cho BVC (lenBVC)', defval: 50, type: 'integer', min: 5, max: 2000 },

            { id: 'zoneSrc', name: 'Lấy vùng từ', defval: 'Nến trước', type: 'text', options: ['Nến trước', 'Nến tín hiệu'] },

            // Tham số ATRBot nội bộ — không có trong bảng §6 của spec, xem G6.
            { id: 'atrLength', name: '[ATRBot] ATR Length', defval: 14, type: 'integer', min: 1, max: 500 },
            { id: 'atrMult', name: '[ATRBot] ATR Multiplier', defval: 2.0, type: 'float', min: 0.1, max: 20, step: 0.1 },
            { id: 'cmoLength', name: '[ATRBot] VIDYA CMO Length', defval: 9, type: 'integer', min: 1, max: 200 },
            { id: 'maLength', name: '[ATRBot] VIDYA MA Length', defval: 30, type: 'integer', min: 1, max: 500 },

            // Tắt/bật hiển thị từng nhóm vùng theo yêu cầu người dùng. Chỉ lọc ở
            // bước xuất plot — KHÔNG ảnh hưởng cây phân loại, đếm nhãn (cnt_*)
            // hay các plot chẩn đoán (diag_*): tắt hiển thị rồi bật lại sẽ thấy
            // ngay vùng gần nhất, không bị mất dữ liệu đã tính.
            { id: 'showAbsorbZone', name: 'Hiện vùng hấp thụ/đảo chiều (tím)', defval: true, type: 'bool' },
            { id: 'showContZone', name: 'Hiện vùng tiếp diễn (xanh dương)', defval: true, type: 'bool' },
            { id: 'showClimaxZone', name: 'Hiện vùng CLIMAX (cam)', defval: true, type: 'bool' },
        ];

        const defaultInputs = {
            lenRef: 50, lenDisp: 100, thrBurst: 3.0, thrDryup: 3.0,
            thrWide: 0.8, thrNarrow: 0.35, thrDelta: 0.35, thrExtreme: 0.85, thrPullback: 0.5, thrMature: 2.0,
            lenBVC: 50, zoneSrc: 'Nến trước',
            atrLength: 14, atrMult: 2.0, cmoLength: 9, maLength: 30,
            showAbsorbZone: true, showContZone: true, showClimaxZone: true,
        };

        return {
            _metainfoVersion: 51,
            id: 'vsr3@tv-basicstudies-1',
            name: 'VSR3 - Phân loại volume spike có delta',
            description: 'VSR3 - Phân loại volume spike có delta (BVC)',
            shortDescription: 'VSR3',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,
            plots: plots,
            defaults: { styles: defaultStyles, filledAreasStyle: filledAreasStyle, inputs: defaultInputs },
            inputs: inputs,
            styles: styles,
            filledAreas: filledAreas,
            precision: 4,
            format: { type: 'price', precision: 4 },
        };
    }

    // ---- Study ---------------------------------------------------------------
    function createVSR3(PineJS) {
        return {
            name: 'VSR3 - Phân loại volume spike có delta',
            metainfo: buildMetainfo(),

            constructor: function VSR3Study() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    // --- Nhận diện nến mới (thay barstate.isconfirmed, xem G5) ---
                    this.lastTime = NaN;
                    this.curBar = null;       // snapshot nến đang hình thành
                    this.pendingOutput = null; // output đã "chốt" của nến đã đóng gần nhất

                    // --- ATRBot (§1) ---
                    this.vidyaPrev = NaN;
                    this.cmoGains = [];
                    this.cmoLosses = [];
                    this.atrPrev = NaN;
                    this.prevClose = NaN;      // close[1] dùng chung cho TR và log-return BVC
                    this.trail1PrevBar = NaN;
                    this.trail2Prev = NaN;
                    this.trendPrev = null;
                    this.trail1AtFlip = NaN;

                    // --- Dò sự kiện khối lượng (§2, kế thừa VSR2) ---
                    this.volWindow = [];
                    this.rWindow = [];
                    this.closedBarCount = 0;

                    // --- BVC (§3) ---
                    this.logRetWindow = [];

                    // --- Vùng nến trước (cho zoneSrc = "Nến trước") ---
                    this.prevBarHigh = NaN;
                    this.prevBarLow = NaN;

                    // --- Vùng đã lưu theo nhóm màu (§5.1), valuewhen-style ---
                    this.zoneAbsorb = { hi: NaN, lo: NaN };
                    this.zoneCont = { hi: NaN, lo: NaN };
                    this.zoneClimax = { hi: NaN, lo: NaN };

                    // --- Đếm dồn nhãn (thay bảng §5.4, xem G2) ---
                    this.labelCounts = { REJECTION: 0, ABSORPTION_REV: 0, ABSORPTION_CONT: 0, CLIMAX: 0, INITIATION: 0, CHURN: 0, UNCLASSIFIED: 0 };
                };

                // Tính toán đầy đủ cho MỘT nến đã đóng (bar), cập nhật mọi state,
                // trả về mảng output theo đúng thứ tự plots trong buildMetainfo().
                function finalizeClosedBar(self, inputs, bar) {
                    const { lenRef, lenDisp, thrBurst, thrDryup, thrWide, thrNarrow, thrDelta,
                        thrExtreme, thrPullback, thrMature, lenBVC, zoneSrc,
                        atrLength, atrMult, cmoLength, maLength,
                        showAbsorbZone, showContZone, showClimaxZone } = inputs;

                    const { o, h, l, c, v } = bar;

                    // ============== §1 ATRBot (VIDYA + ATR ratchet) ==============
                    const src = c; // hardcode close — xem G6

                    self.cmoGains.push(Math.max(0, isNaN(self.prevClose) ? 0 : src - self.prevClose));
                    self.cmoLosses.push(Math.max(0, isNaN(self.prevClose) ? 0 : self.prevClose - src));
                    if (self.cmoGains.length > cmoLength) { self.cmoGains.shift(); self.cmoLosses.shift(); }

                    let cmo = 0;
                    if (self.cmoGains.length >= cmoLength) {
                        const sumG = self.cmoGains.reduce((s, x) => s + x, 0);
                        const sumL = self.cmoLosses.reduce((s, x) => s + x, 0);
                        const sumT = sumG + sumL;
                        if (sumT !== 0) cmo = ((sumG - sumL) / sumT) * 100;
                    }
                    const vidyaAlpha = (2 / (maLength + 1)) * (Math.abs(cmo) / 100);
                    const trail1 = isNaN(self.vidyaPrev) ? src : vidyaAlpha * src + (1 - vidyaAlpha) * self.vidyaPrev;
                    self.vidyaPrev = trail1;

                    let tr;
                    if (isNaN(self.prevClose)) tr = h - l;
                    else tr = Math.max(h - l, Math.abs(h - self.prevClose), Math.abs(l - self.prevClose));
                    const atr = isNaN(self.atrPrev) ? tr : (self.atrPrev * (atrLength - 1) + tr) / atrLength;
                    self.atrPrev = atr;

                    const band = atr * atrMult;

                    // Ratchet trail2 — logic giống hệt atr-bot.js đã kiểm chứng trong repo,
                    // thay atr*mult cục bộ bằng "band" chung của toàn script (§1).
                    const trail2PrevSafe = isNaN(self.trail2Prev) ? 0 : self.trail2Prev;
                    const trail1PrevSafe = isNaN(self.trail1PrevBar) ? trail1 : self.trail1PrevBar;
                    let trail2;
                    if (trail1 > trail2PrevSafe) {
                        trail2 = (trail1PrevSafe > trail2PrevSafe) ? Math.max(trail2PrevSafe, trail1 - band) : (trail1 - band);
                    } else {
                        trail2 = (trail1 < trail2PrevSafe && trail1PrevSafe < trail2PrevSafe) ? Math.min(trail2PrevSafe, trail1 + band) : (trail1 + band);
                    }

                    const trend = trail1 > trail2 ? 1 : -1;
                    const isFirstEverBar = self.trendPrev === null;
                    const flip = !isFirstEverBar && trend !== self.trendPrev;
                    if (isFirstEverBar || flip) self.trail1AtFlip = trail1;

                    const gapRatio = band > 0 ? clamp01(Math.abs(trail1 - trail2) / band) : 0;
                    const legExtension = band > 0 ? Math.abs(trail1 - self.trail1AtFlip) / band : 0;

                    self.trail1PrevBar = trail1;
                    self.trail2Prev = trail2;
                    self.trendPrev = trend;

                    // ============== §2 Dò sự kiện khối lượng (kế thừa VSR2) ==============
                    const baseline = self.volWindow.length >= lenRef ? median(self.volWindow) : NaN;
                    const hasVol = Number.isFinite(v) && v > 0 && Number.isFinite(baseline) && baseline > 0;
                    const r = hasVol ? Math.log(v / baseline) : 0.0;
                    const disp = self.rWindow.length > 0 ? populationStdev(self.rWindow) : NaN;
                    const score = (Number.isFinite(disp) && disp > 0) ? r / disp : 0.0;

                    const warmupOK = self.closedBarCount >= (lenRef + lenDisp);
                    const burst = warmupOK && hasVol && score > thrBurst;
                    const dryup = warmupOK && hasVol && score < -thrDryup; // cờ ngữ cảnh, không dùng tiếp (xem đầu file)
                    void dryup;

                    // ============== §3 BVC (Nguồn B — luôn dùng, xem G1) ==============
                    // ƯỚC LƯỢNG theo mô hình, KHÔNG phải delta đo được (xem D2):
                    // giả định log-return chuẩn hoá ~ N(0,1) và quan hệ đơn điệu giữa
                    // return và tỷ lệ lệnh chủ động — cả hai đều có thể sai, đặc biệt
                    // tại chính các nến bùng nổ mà script quan tâm.
                    const logRet = (Number.isFinite(self.prevClose) && self.prevClose > 0 && c > 0)
                        ? Math.log(c / self.prevClose) : 0.0;
                    const stdevLogRet = self.logRetWindow.length > 0 ? populationStdev(self.logRetWindow) : NaN;
                    const z = (Number.isFinite(stdevLogRet) && stdevLogRet > 0) ? logRet / stdevLogRet : 0;
                    const Phi = 1 / (1 + Math.exp(-1.702 * z));
                    const vBuy = v * Phi;
                    const vSell = v - vBuy;               // vBuy + vSell === v theo cấu trúc (test #5)
                    const delta = vBuy - vSell;
                    const deltaRatio = v > 0 ? delta / v : 0;

                    // ============== §4 Cây phân loại ==============
                    const rangeBand = band > 0 ? (h - l) / band : 0;
                    const barDir = c > o ? 1 : (c < o ? -1 : 0);
                    const wide = rangeBand >= thrWide;
                    const narrow = rangeBand <= thrNarrow;
                    const deltaStrong = Math.abs(deltaRatio) >= thrDelta;
                    const atExtreme = gapRatio >= thrExtreme;
                    const inPullback = gapRatio <= thrPullback;
                    const matureLeg = legExtension >= thrMature;
                    const dSign = sgn(deltaRatio);

                    let labelIdx = -1; // -1 = không có sự kiện (không phải burst)
                    let controlSide = 0;

                    if (burst) {
                        if (wide && dSign !== barDir && deltaStrong) {
                            labelIdx = 0; // REJECTION
                            controlSide = -dSign;
                        } else if (narrow && deltaStrong && atExtreme) {
                            labelIdx = 1; // ABSORPTION_REV
                            controlSide = -dSign;
                        } else if (narrow && deltaStrong && inPullback) {
                            labelIdx = 2; // ABSORPTION_CONT
                            controlSide = -dSign;
                        } else if (wide && atExtreme && matureLeg) {
                            labelIdx = 3; // CLIMAX — controlSide = sign(deltaRatio) theo bảng §4.2,
                            controlSide = dSign; // dù vùng tạo ra là nguồn cung NGƯỢC lại (xem tooltip/màu)
                        } else if (wide && dSign === barDir) {
                            labelIdx = 4; // INITIATION
                            controlSide = dSign;
                        } else if (narrow && !deltaStrong) {
                            labelIdx = 5; // CHURN
                            controlSide = 0;
                        } else {
                            labelIdx = 6; // UNCLASSIFIED
                            controlSide = 0;
                        }
                        self.labelCounts[LABELS[labelIdx]] += 1;
                    }

                    // ============== §5.1 Vùng (chỉ nhãn 1..5) ==============
                    const srcHi = zoneSrc === 'Nến trước' ? self.prevBarHigh : h;
                    const srcLo = zoneSrc === 'Nến trước' ? self.prevBarLow : l;
                    if (burst && labelIdx >= 0 && labelIdx <= 4 && Number.isFinite(srcHi) && Number.isFinite(srcLo)) {
                        if (labelIdx === 0 || labelIdx === 1) { self.zoneAbsorb.hi = srcHi; self.zoneAbsorb.lo = srcLo; }
                        else if (labelIdx === 2 || labelIdx === 4) { self.zoneCont.hi = srcHi; self.zoneCont.lo = srcLo; }
                        else if (labelIdx === 3) { self.zoneClimax.hi = srcHi; self.zoneClimax.lo = srcLo; }
                    }

                    // ============== §5.2 Shapes ==============
                    const shapeOut = new Array(7).fill(NaN);
                    if (burst && labelIdx >= 0) shapeOut[labelIdx] = l;

                    // ---- cập nhật state đuôi cho nến kế tiếp ----
                    self.volWindow.push(Number.isFinite(v) ? v : 0);
                    if (self.volWindow.length > lenRef) self.volWindow.shift();
                    self.rWindow.push(r);
                    if (self.rWindow.length > lenDisp) self.rWindow.shift();
                    self.logRetWindow.push(logRet);
                    if (self.logRetWindow.length > lenBVC) self.logRetWindow.shift();
                    self.closedBarCount += 1;
                    self.prevBarHigh = h;
                    self.prevBarLow = l;
                    self.prevClose = c;

                    // Lọc hiển thị theo toggle — chỉ ở bước xuất plot, không đụng
                    // self.zoneAbsorb/zoneCont/zoneClimax (bộ nhớ vùng vẫn cập nhật
                    // đầy đủ dù đang tắt hiển thị, để bật lại là thấy ngay vùng
                    // gần nhất) và không đụng labelCounts/diag_* phía dưới.
                    const outAbsorbHi = showAbsorbZone ? self.zoneAbsorb.hi : NaN;
                    const outAbsorbLo = showAbsorbZone ? self.zoneAbsorb.lo : NaN;
                    const outContHi = showContZone ? self.zoneCont.hi : NaN;
                    const outContLo = showContZone ? self.zoneCont.lo : NaN;
                    const outClimaxHi = showClimaxZone ? self.zoneClimax.hi : NaN;
                    const outClimaxLo = showClimaxZone ? self.zoneClimax.lo : NaN;

                    return [
                        outAbsorbHi, outAbsorbLo,
                        outContHi, outContLo,
                        outClimaxHi, outClimaxLo,
                        shapeOut[0], shapeOut[1], shapeOut[2], shapeOut[3], shapeOut[4], shapeOut[5], shapeOut[6],
                        score, baseline, rangeBand, deltaRatio, gapRatio, legExtension, controlSide,
                        self.labelCounts.REJECTION, self.labelCounts.ABSORPTION_REV, self.labelCounts.ABSORPTION_CONT,
                        self.labelCounts.CLIMAX, self.labelCounts.INITIATION, self.labelCounts.CHURN, self.labelCounts.UNCLASSIFIED,
                    ];
                }

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;

                    const inputs = {
                        lenRef: Math.max(5, Math.round(Number(this._input(0)) || 50)),
                        lenDisp: Math.max(10, Math.round(Number(this._input(1)) || 100)),
                        thrBurst: Number(this._input(2)),
                        thrDryup: Number(this._input(3)),
                        thrWide: Number(this._input(4)),
                        thrNarrow: Number(this._input(5)),
                        thrDelta: Number(this._input(6)),
                        thrExtreme: Number(this._input(7)),
                        thrPullback: Number(this._input(8)),
                        thrMature: Number(this._input(9)),
                        lenBVC: Math.max(5, Math.round(Number(this._input(10)) || 50)),
                        zoneSrc: this._input(11),
                        atrLength: Math.max(1, Math.round(Number(this._input(12)) || 14)),
                        atrMult: Number(this._input(13)),
                        cmoLength: Math.max(1, Math.round(Number(this._input(14)) || 9)),
                        maLength: Math.max(1, Math.round(Number(this._input(15)) || 30)),
                        showAbsorbZone: this._input(16) !== false,
                        showContZone: this._input(17) !== false,
                        showClimaxZone: this._input(18) !== false,
                    };

                    const time = PineJS.Std.time(this._context);
                    const bar = {
                        time,
                        o: PineJS.Std.open(this._context),
                        h: PineJS.Std.high(this._context),
                        l: PineJS.Std.low(this._context),
                        c: PineJS.Std.close(this._context),
                        v: PineJS.Std.volume(this._context),
                    };

                    const isNewBar = isNaN(this.lastTime) || time !== this.lastTime;

                    if (isNewBar) {
                        // Nến đang track trước đó (this.curBar) vừa đóng — chốt nó (§7/G5).
                        if (this.curBar !== null) {
                            this.pendingOutput = finalizeClosedBar(this, inputs, this.curBar);
                        } else {
                            this.pendingOutput = new Array(27).fill(NaN);
                        }
                        this.curBar = bar;
                    } else {
                        // Vẫn nến đang hình thành — không đụng vào state đã chốt.
                        this.curBar = bar;
                    }

                    this.lastTime = time;
                    return this.pendingOutput;
                };
            },
        };
    }

    root.createVSR3 = createVSR3;
})(typeof window !== 'undefined' ? window : globalThis);
