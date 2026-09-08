/**
 * SMC Lux — Smart Money Concepts theo phương pháp LuxAlgo
 *
 * Cài đặt ĐỘC LẬP (tự viết, không sao chép mã nguồn) bám theo cách tính và
 * cách hiển thị của "Smart Money Concepts [LuxAlgo]". Bản gốc phát hành theo
 * giấy phép CC BY-NC-SA 4.0 (ghi công / phi thương mại / chia sẻ tương tự) —
 * xem ghi chú L1 bên dưới.
 *
 * ĐÃ CÓ:
 *   - Cấu trúc thị trường 2 tầng: Internal (len 5) và Swing (len 50)
 *   - BOS / CHoCH cho cả hai tầng
 *   - Nhãn swing HH / HL / LH / LL
 *   - Strong / Weak High-Low
 *   - Order Block (bull/bear) có lọc biến động + mitigation
 *   - Fair Value Gap có ngưỡng tự động + mitigation
 *   - Equal High / Equal Low (EQH/EQL)
 *   - Vùng Premium / Equilibrium / Discount
 *
 * ════════════════════════════════════════════════════════════════════════════
 * GIỚI HẠN NỀN TẢNG — API custom-study JS của charting_library không phải Pine,
 * báo cáo rõ thay vì âm thầm làm khác:
 *
 *   L1. GIẤY PHÉP. Bản gốc LuxAlgo là CC BY-NC-SA 4.0: được phép tạo bản phái
 *       sinh nhưng phải ghi công, KHÔNG dùng cho mục đích thương mại, và bản
 *       phái sinh phải giữ nguyên giấy phép đó. File này viết lại độc lập theo
 *       phương pháp SMC (BOS/CHoCH, OB, FVG, EQH/EQL, premium/discount là kiến
 *       thức giao dịch phổ biến, không thuộc sở hữu của ai), nhưng nếu app này
 *       có yếu tố thương mại thì cần rà lại điều khoản NC.
 *
 *   L2. ĐỘ DÀI SWING BỊ CỐ ĐỊNH (5 và 50). Nhãn swing phải vẽ lùi về đúng nến
 *       tạo swing bằng thuộc tính `offset` trong metainfo, mà `offset` là hằng
 *       số biên dịch — KHÔNG thể lấy từ input của người dùng. Muốn đổi độ dài
 *       thì phải sửa hằng số INTERNAL_LEN / SWING_LEN trong file này.
 *
 *   L3. VÙNG (OB/FVG/PD) BẮT ĐẦU TỪ NẾN PHÁT HIỆN, không phải từ nến gốc.
 *       API này không có box.new; vùng được dựng bằng cặp đường + tô nền giữ
 *       giá trị tiến về phải. MỨC GIÁ của vùng chính xác như LuxAlgo, chỉ có
 *       cạnh trái của hộp là bắt đầu muộn hơn.
 *
 *   L4. SỐ VÙNG ĐỒNG THỜI CÓ TRẦN CỨNG (OB_SLOTS / FVG_SLOTS = 5 mỗi chiều)
 *       vì mọi plot phải khai báo trước. LuxAlgo vẽ không giới hạn.
 *
 *   L5. KHÔNG CÓ mức đa khung thời gian (PDH/PDL, PWH/PWL, PMH/PML). API này
 *       không lấy được dữ liệu khung khác (không có request.security).
 *
 *   L6. Nhãn BOS/CHoCH vẽ tại NẾN PHÁ VỠ (LuxAlgo vẽ ở giữa quãng từ nến swing
 *       tới nến phá vỡ). Text của shape-plot là tĩnh theo plot id nên mỗi loại
 *       nhãn là một plot riêng.
 * ════════════════════════════════════════════════════════════════════════════
 */

(function (root) {
    'use strict';

    // Xem L2: phải là hằng số vì dùng làm `offset` trong metainfo.
    const INTERNAL_LEN = 5;
    const SWING_LEN = 50;
    // EQH/EQL dò bằng pivot NGẮN riêng, không dùng chung swing length —
    // nếu lấy theo swing 50 thì hai đỉnh liền kề cách nhau quá xa nên gần như
    // không bao giờ "bằng nhau" (đo được: chỉ 1 EQH trên 6000 nến).
    const EQ_LEN = 3;

    const OB_SLOTS = 5;   // mỗi chiều (bull/bear) — xem L4
    const FVG_SLOTS = 5;  // mỗi chiều

    // Vá lệch mép trái của hộp OB (xem L3). OB chỉ được BIẾT tại nến phá vỡ, nên
    // hộp vốn bắt đầu muộn (đo trên 6000 nến BTC: trung vị 6 nến, tối đa 164).
    // Cặp plot phụ có offset -OB_BACKFILL vẽ nốt đoạn [nến gốc .. nến phá vỡ]:
    // phát ở các nến nguồn [origin+L .. break+L] thì render đúng vào [origin..break].
    // Điều kiện: leg <= L. Leg dài hơn L thì bỏ backfill, hộp vẫn bắt đầu từ nến
    // phá vỡ như cũ (không vẽ sai, chỉ là không vá được).
    // 180 phủ toàn bộ leg đo được trên 6000 nến BTC (dài nhất 164).
    const OB_BACKFILL = 180;

    const MAX_BARS = 5000;

    // Bảng màu LuxAlgo
    const C_BULL = '#089981';
    const C_BEAR = '#F23645';
    const C_INTERNAL_BULL = '#089981';
    const C_INTERNAL_BEAR = '#F23645';
    const C_OB_BULL = '#3179F5';
    const C_OB_BEAR = '#FF5252';
    const C_FVG_BULL = '#089981';
    const C_FVG_BEAR = '#F23645';
    const C_EQ = '#B2B5BE';
    const C_PREMIUM = '#F23645';
    const C_EQUILIBRIUM = '#B2B5BE';
    const C_DISCOUNT = '#089981';

    // ───────────────────────── helpers ─────────────────────────
    function wilderATR(prevATR, tr, len) {
        return isNaN(prevATR) ? tr : (prevATR * (len - 1) + tr) / len;
    }
    function trueRange(bar, prevClose) {
        if (isNaN(prevClose)) return bar.h - bar.l;
        return Math.max(bar.h - bar.l, Math.abs(bar.h - prevClose), Math.abs(bar.l - prevClose));
    }

    // ───────────────────────── metainfo ─────────────────────────
    function buildMetainfo() {
        const plots = [];
        const styles = {};
        const defaultStyles = {};
        const filledAreas = [];
        const filledAreasStyle = {};

        const addLine = (id, title, color, opts) => {
            const o = opts || {};
            plots.push({ id, type: 'line', offset: o.offset || 0 });
            styles[id] = { title, histogramBase: 0, joinPoints: false };
            defaultStyles[id] = {
                linestyle: o.linestyle || 0, linewidth: o.linewidth || 1,
                plottype: o.plottype === undefined ? 0 : o.plottype,
                trackPrice: false, transparency: o.transparency || 0,
                visible: o.visible === undefined ? true : o.visible, color,
            };
        };
        const addShape = (id, title, text, color, location, plottype, offset) => {
            plots.push({ id, type: 'shapes', offset: offset || 0 });
            styles[id] = { title, text, location, plottype, isHidden: false };
            defaultStyles[id] = {
                color, textColor: '#FFFFFF', transparency: 0,
                plottype, location, size: 'tiny', visible: true,
            };
        };
        const addZone = (idTop, idBot, fillId, title, color, transparency, offset) => {
            // Viền trên/dưới để vùng đọc ra HÌNH HỘP chứ không phải mảng màu loang.
            addLine(idTop, title + ' — viền trên', color, { transparency: 25, linewidth: 1, offset: offset || 0 });
            addLine(idBot, title + ' — viền dưới', color, { transparency: 25, linewidth: 1, offset: offset || 0 });
            filledAreas.push({ id: fillId, objAId: idTop, objBId: idBot, type: 'plot_plot', title });
            filledAreasStyle[fillId] = { color, transparency, visible: true };
        };

        // ── Cấu trúc Swing: BOS / CHoCH (tại nến phá vỡ, xem L6) ──
        addShape('sw_bos_bull', 'Swing BOS ↑', 'BOS', C_BULL, 'BelowBar', 'shape_label_up');
        addShape('sw_bos_bear', 'Swing BOS ↓', 'BOS', C_BEAR, 'AboveBar', 'shape_label_down');
        addShape('sw_choch_bull', 'Swing CHoCH ↑', 'CHoCH', C_BULL, 'BelowBar', 'shape_label_up');
        addShape('sw_choch_bear', 'Swing CHoCH ↓', 'CHoCH', C_BEAR, 'AboveBar', 'shape_label_down');

        // ── Cấu trúc Internal ──
        addShape('in_bos_bull', 'Internal BOS ↑', 'BOS', C_INTERNAL_BULL, 'BelowBar', 'shape_label_up');
        addShape('in_bos_bear', 'Internal BOS ↓', 'BOS', C_INTERNAL_BEAR, 'AboveBar', 'shape_label_down');
        addShape('in_choch_bull', 'Internal CHoCH ↑', 'CHoCH', C_INTERNAL_BULL, 'BelowBar', 'shape_label_up');
        addShape('in_choch_bear', 'Internal CHoCH ↓', 'CHoCH', C_INTERNAL_BEAR, 'AboveBar', 'shape_label_down');

        // ── Nhãn swing HH/HL/LH/LL: vẽ lùi về đúng nến swing (xem L2) ──
        addShape('sw_hh', 'Higher High', 'HH', C_BEAR, 'AboveBar', 'shape_label_down', -SWING_LEN);
        addShape('sw_lh', 'Lower High', 'LH', C_BEAR, 'AboveBar', 'shape_label_down', -SWING_LEN);
        addShape('sw_hl', 'Higher Low', 'HL', C_BULL, 'BelowBar', 'shape_label_up', -SWING_LEN);
        addShape('sw_ll', 'Lower Low', 'LL', C_BULL, 'BelowBar', 'shape_label_up', -SWING_LEN);

        // ── Strong / Weak High-Low ──
        addShape('strong_high', 'Strong High', 'Strong High', C_BEAR, 'AboveBar', 'shape_label_down', -SWING_LEN);
        addShape('weak_high', 'Weak High', 'Weak High', C_BEAR, 'AboveBar', 'shape_label_down', -SWING_LEN);
        addShape('strong_low', 'Strong Low', 'Strong Low', C_BULL, 'BelowBar', 'shape_label_up', -SWING_LEN);
        addShape('weak_low', 'Weak Low', 'Weak Low', C_BULL, 'BelowBar', 'shape_label_up', -SWING_LEN);

        // ── EQH / EQL ──
        addShape('eqh', 'Equal High', 'EQH', C_EQ, 'AboveBar', 'shape_label_down', -EQ_LEN);
        addShape('eql', 'Equal Low', 'EQL', C_EQ, 'BelowBar', 'shape_label_up', -EQ_LEN);

        // ── Đường cấu trúc: kéo từ NẾN SWING tới NẾN PHÁ VỠ ──
        // `offset` phải là hằng số biên dịch nên không vẽ ngược tuỳ ý được.
        // Cách làm: mỗi mức dùng HAI đường cùng giá trị —
        //   *_line  : offset -LEN  -> mép TRÁI rơi đúng vào nến swing
        //   *_level : offset 0     -> mép PHẢI chạy tới nến hiện tại
        // Hai đường cùng mức giá nên hiển thị liền thành một đường duy nhất
        // chạy từ nến swing tới nến phá vỡ (rồi dừng).
        addLine('sw_top_line', 'Swing High — đoạn tới nến swing', C_BEAR, { linestyle: 2, linewidth: 1, offset: -SWING_LEN });
        addLine('sw_bot_line', 'Swing Low — đoạn tới nến swing', C_BULL, { linestyle: 2, linewidth: 1, offset: -SWING_LEN });
        addLine('sw_top_level', 'Swing High level', C_BEAR, { linestyle: 2, linewidth: 1 });
        addLine('sw_bot_level', 'Swing Low level', C_BULL, { linestyle: 2, linewidth: 1 });

        addLine('in_top_line', 'Internal High — đoạn tới nến swing', C_INTERNAL_BEAR, { linestyle: 2, linewidth: 1, offset: -INTERNAL_LEN, transparency: 40 });
        addLine('in_bot_line', 'Internal Low — đoạn tới nến swing', C_INTERNAL_BULL, { linestyle: 2, linewidth: 1, offset: -INTERNAL_LEN, transparency: 40 });
        addLine('in_top_level', 'Internal High level', C_INTERNAL_BEAR, { linestyle: 2, linewidth: 1, transparency: 40 });
        addLine('in_bot_level', 'Internal Low level', C_INTERNAL_BULL, { linestyle: 2, linewidth: 1, transparency: 40 });

        // ── Order Blocks ──
        for (let i = 0; i < OB_SLOTS; i++) {
            addZone('ob_bull_top_' + i, 'ob_bull_bot_' + i, 'fill_ob_bull_' + i, 'OB tăng ' + (i + 1), C_OB_BULL, 82);
        }
        for (let i = 0; i < OB_SLOTS; i++) {
            addZone('ob_bear_top_' + i, 'ob_bear_bot_' + i, 'fill_ob_bear_' + i, 'OB giảm ' + (i + 1), C_OB_BEAR, 82);
        }
        // Đoạn backfill: cùng màu, cùng độ trong suốt nên nối liền với hộp chính.
        for (let i = 0; i < OB_SLOTS; i++) {
            addZone('obb_bull_top_' + i, 'obb_bull_bot_' + i, 'fill_obb_bull_' + i, 'OB tăng ' + (i + 1) + ' (đoạn đầu)', C_OB_BULL, 82, -OB_BACKFILL);
        }
        for (let i = 0; i < OB_SLOTS; i++) {
            addZone('obb_bear_top_' + i, 'obb_bear_bot_' + i, 'fill_obb_bear_' + i, 'OB giảm ' + (i + 1) + ' (đoạn đầu)', C_OB_BEAR, 82, -OB_BACKFILL);
        }

        // ── Fair Value Gaps ──
        for (let i = 0; i < FVG_SLOTS; i++) {
            addZone('fvg_bull_top_' + i, 'fvg_bull_bot_' + i, 'fill_fvg_bull_' + i, 'FVG tăng ' + (i + 1), C_FVG_BULL, 80);
        }
        for (let i = 0; i < FVG_SLOTS; i++) {
            addZone('fvg_bear_top_' + i, 'fvg_bear_bot_' + i, 'fill_fvg_bear_' + i, 'FVG giảm ' + (i + 1), C_FVG_BEAR, 80);
        }

        // ── Premium / Equilibrium / Discount ──
        addZone('prem_top', 'prem_bot', 'fill_premium', 'Vùng Premium', C_PREMIUM, 80);
        addZone('eqm_top', 'eqm_bot', 'fill_equilibrium', 'Vùng Equilibrium', C_EQUILIBRIUM, 80);
        addZone('disc_top', 'disc_bot', 'fill_discount', 'Vùng Discount', C_DISCOUNT, 80);

        const inputs = [
            { id: 'showInternal', name: 'Hiện cấu trúc Internal (len ' + INTERNAL_LEN + ')', defval: true, type: 'bool' },
            { id: 'showSwing', name: 'Hiện cấu trúc Swing (len ' + SWING_LEN + ')', defval: true, type: 'bool' },
            { id: 'showSwingLabels', name: 'Hiện nhãn HH / HL / LH / LL', defval: true, type: 'bool' },
            { id: 'showStrongWeak', name: 'Hiện Strong / Weak High-Low', defval: false, type: 'bool' },
            { id: 'showLevels', name: 'Hiện đường mức swing đang hoạt động', defval: true, type: 'bool' },

            { id: 'showOB', name: 'Hiện Order Blocks', defval: true, type: 'bool' },
            { id: 'obSource', name: 'OB lấy từ cấu trúc', defval: 'Swing', type: 'text', options: ['Swing', 'Internal', 'Cả hai'] },
            { id: 'obFilter', name: 'Lọc nến biến động lớn cho OB', defval: true, type: 'bool' },
            { id: 'obMitigation', name: 'Cách mitigation OB', defval: 'High/Low', type: 'text', options: ['High/Low', 'Close'] },

            { id: 'showFVG', name: 'Hiện Fair Value Gaps', defval: true, type: 'bool' },
            { id: 'fvgAuto', name: 'FVG dùng ngưỡng tự động', defval: true, type: 'bool' },
            { id: 'fvgThreshold', name: 'FVG ngưỡng thủ công (%)', defval: 0.0, type: 'float', min: 0, max: 100, step: 0.01 },

            { id: 'showEQ', name: 'Hiện Equal High / Low', defval: true, type: 'bool' },
            { id: 'eqThreshold', name: 'EQH/EQL ngưỡng (× ATR)', defval: 0.1, type: 'float', min: 0.01, max: 5, step: 0.01 },

            { id: 'showPD', name: 'Hiện vùng Premium / Discount', defval: false, type: 'bool' },
        ];

        const defaultInputs = {
            showInternal: true, showSwing: true, showSwingLabels: true, showStrongWeak: false, showLevels: true,
            showOB: true, obSource: 'Swing', obFilter: true, obMitigation: 'High/Low',
            showFVG: true, fvgAuto: true, fvgThreshold: 0.0,
            showEQ: true, eqThreshold: 0.1,
            showPD: false,
        };

        return {
            _metainfoVersion: 51,
            id: 'smclux@tv-basicstudies-1',
            name: 'SMC Lux - Smart Money Concepts',
            description: 'SMC Lux - Smart Money Concepts (LuxAlgo method)',
            shortDescription: 'SMC Lux',
            is_hidden_study: false,
            is_price_study: true,
            isCustomIndicator: true,
            plots,
            styles,
            filledAreas,
            defaults: { styles: defaultStyles, filledAreasStyle, inputs: defaultInputs },
            inputs,
            precision: 4,
            format: { type: 'price', precision: 4 },
        };
    }

    const META = buildMetainfo();
    const PLOT_COUNT = META.plots.length;
    const PLOT_INDEX = {};
    META.plots.forEach((p, i) => { PLOT_INDEX[p.id] = i; });

    // ───────────────────────── study ─────────────────────────
    function createSMCLux(PineJS) {
        return {
            name: 'SMC Lux - Smart Money Concepts',
            metainfo: META,

            constructor: function SMCLuxStudy() {
                this.init = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;
                    resetState(this);
                };

                function newStructure() {
                    // top/bottom: mức swing gần nhất + đã bị phá chưa
                    return {
                        top: { level: NaN, idx: -1, crossed: false, crossedAt: -1 },
                        bottom: { level: NaN, idx: -1, crossed: false, crossedAt: -1 },
                        trend: 0,          // 1 tăng, -1 giảm, 0 chưa xác định
                        prevLeg: NaN,      // trạng thái leg của nến trước
                    };
                }

                function resetState(self) {
                    self.bars = [];
                    self.lastTime = NaN;

                    self.internal = newStructure();
                    self.swing = newStructure();

                    // swing gần nhất để so HH/LH/HL/LL
                    self.prevSwingHigh = NaN;
                    self.prevSwingLow = NaN;

                    // pivot ngắn riêng cho EQH/EQL
                    self.eqLegPrev = NaN;
                    self.prevEqHigh = NaN;
                    self.prevEqLow = NaN;

                    self.atrPrev = NaN;      // ATR(200) cho ngưỡng EQH/EQL
                    self.atrShortPrev = NaN; // ATR(14) cho lọc OB
                    self.prevClose = NaN;

                    self.rangePctSum = 0;    // cho ngưỡng FVG tự động
                    self.rangePctCount = 0;

                    // Mỗi vùng GIỮ NGUYÊN slot của nó cho tới khi bị mitigation.
                    // Nếu dùng mảng động rồi unshift, vùng mới sẽ đẩy vùng cũ sang
                    // slot khác => đường của cùng một slot nhảy giữa các mức giá và
                    // phần tô nền bị kéo thành dải lớn vô nghĩa.
                    self.obBull = new Array(OB_SLOTS).fill(null);
                    self.obBear = new Array(OB_SLOTS).fill(null);
                    self.fvgBull = new Array(FVG_SLOTS).fill(null);
                    self.fvgBear = new Array(FVG_SLOTS).fill(null);
                    // Vá mép trái. Task nằm ở hàng đợi chờ (rẻ, không giới hạn) và
                    // chỉ chiếm slot vẽ TRONG LÚC thực sự phát — nếu giữ slot suốt
                    // OB_BACKFILL nến thì các OB sinh gần nhau sẽ tranh slot và bị
                    // đuổi, khiến hộp mất đoạn đầu.
                    self.obPendBull = [];
                    self.obPendBear = [];
                    self.obBackBull = new Array(OB_SLOTS).fill(null);
                    self.obBackBear = new Array(OB_SLOTS).fill(null);
                    self.zoneSeq = 0;
                    // Giá trị đã phát của từng đường ở nến trước, để cắt đường khi
                    // mức giá nhảy sang mức khác (xem emitLine).
                    self.lastEmit = {};
                }

                // Phát hiện leg theo cách của LuxAlgo: nến cách đây `size` nến là
                // swing high nếu high của nó vượt toàn bộ `size` nến ĐỨNG SAU nó.
                // Đây là xác nhận một phía (chỉ nhìn bên phải), khác pivot cổ điển.
                function legAt(bars, size) {
                    const n = bars.length - 1;
                    if (n < size) return null;
                    const cand = bars[n - size];
                    let maxH = -Infinity, minL = Infinity;
                    for (let i = n - size + 1; i <= n; i++) {
                        if (bars[i].h > maxH) maxH = bars[i].h;
                        if (bars[i].l < minL) minL = bars[i].l;
                    }
                    if (cand.h > maxH) return { leg: 0, kind: 'high', level: cand.h, idx: n - size };
                    if (cand.l < minL) return { leg: 1, kind: 'low', level: cand.l, idx: n - size };
                    return { leg: NaN, kind: null };
                }

                // Cập nhật một tầng cấu trúc, trả về các sự kiện của nến hiện tại.
                function updateStructure(self, st, size, bar, out, n) {
                    const ev = { newHigh: null, newLow: null, bos: 0, choch: 0 };
                    const res = legAt(self.bars, size);

                    if (res && !isNaN(res.leg)) {
                        const changed = isNaN(st.prevLeg) ? true : res.leg !== st.prevLeg;
                        if (changed) {
                            if (res.kind === 'high') {
                                st.top = { level: res.level, idx: res.idx, crossed: false, crossedAt: -1 };
                                ev.newHigh = res;
                            } else {
                                st.bottom = { level: res.level, idx: res.idx, crossed: false, crossedAt: -1 };
                                ev.newLow = res;
                            }
                        }
                        st.prevLeg = res.leg;
                    }

                    // Phá vỡ cấu trúc: xác nhận bằng GIÁ ĐÓNG CỬA
                    if (!st.top.crossed && Number.isFinite(st.top.level) && bar.c > st.top.level) {
                        ev.bos = st.trend === -1 ? 0 : 1;      // trend giảm -> CHoCH, còn lại -> BOS
                        ev.choch = st.trend === -1 ? 1 : 0;
                        ev.dir = 1;
                        st.top.crossed = true;
                        st.top.crossedAt = n;
                        st.trend = 1;
                        ev.breakFrom = st.top.idx;
                    } else if (!st.bottom.crossed && Number.isFinite(st.bottom.level) && bar.c < st.bottom.level) {
                        ev.bos = st.trend === 1 ? 0 : 1;
                        ev.choch = st.trend === 1 ? 1 : 0;
                        ev.dir = -1;
                        st.bottom.crossed = true;
                        st.bottom.crossedAt = n;
                        st.trend = -1;
                        ev.breakFrom = st.bottom.idx;
                    }
                    void out;
                    return ev;
                }

                // Line plot nối hai điểm liên tiếp lại với nhau. Khi một đường nhảy
                // từ mức giá này sang mức khác (swing mới, hoặc slot vùng bị tái sử
                // dụng), TradingView sẽ vẽ một đoạn CHÉO nối hai mức — thứ không hề
                // tồn tại trong LuxAlgo. Cách chặn: ở đúng nến xảy ra thay đổi thì
                // để trống (NaN), nến kế tiếp mới bắt đầu mức mới.
                function emitLine(self, out, id, value, isNewBar) {
                    const prev = self.lastEmit[id];
                    if (isNewBar) self.lastEmit[id] = value;
                    if (Number.isFinite(prev) && Number.isFinite(value) && prev !== value) return;
                    out[PLOT_INDEX[id]] = value;
                }

                // Đặt vùng mới vào slot TRỐNG đầu tiên; nếu đầy thì thay vùng CŨ
                // NHẤT. Không bao giờ dịch chuyển vùng đang sống sang slot khác.
                function putInSlot(slots, rec) {
                    for (let i = 0; i < slots.length; i++) {
                        if (!slots[i]) { slots[i] = rec; return; }
                    }
                    let oldest = 0;
                    for (let i = 1; i < slots.length; i++) {
                        if (slots[i].seq < slots[oldest].seq) oldest = i;
                    }
                    slots[oldest] = rec;
                }

                // OB nằm ở nến cực trị trong quãng từ nến swing tới nến phá vỡ.
                function buildOrderBlock(self, fromIdx, toIdx, dir, useFilter, atrShort) {
                    if (fromIdx < 0 || toIdx <= fromIdx) return null;
                    let best = null;
                    for (let i = fromIdx; i <= toIdx && i < self.bars.length; i++) {
                        const b = self.bars[i];
                        // Lọc biến động: nến có biên độ > 2×ATR thì dùng THÂN nến thay
                        // vì cả bóng, tránh vùng OB rộng vô lý.
                        let top = b.h, bot = b.l;
                        if (useFilter && Number.isFinite(atrShort) && atrShort > 0 && (b.h - b.l) > 2 * atrShort) {
                            top = Math.max(b.o, b.c);
                            bot = Math.min(b.o, b.c);
                        }
                        if (dir === 1) {
                            if (best === null || bot < best.bottom) best = { top, bottom: bot, idx: i };
                        } else {
                            if (best === null || top > best.top) best = { top, bottom: bot, idx: i };
                        }
                    }
                    return best;
                }

                this.main = function (context, inputCallback) {
                    this._context = context;
                    this._input = inputCallback;
                    const self = this;

                    const showInternal = this._input(0) !== false;
                    const showSwing = this._input(1) !== false;
                    const showSwingLabels = this._input(2) !== false;
                    const showStrongWeak = this._input(3) === true;
                    const showLevels = this._input(4) !== false;
                    const showOB = this._input(5) !== false;
                    const obSource = this._input(6);
                    const obFilter = this._input(7) !== false;
                    const obMitigation = this._input(8);
                    const showFVG = this._input(9) !== false;
                    const fvgAuto = this._input(10) !== false;
                    const fvgThresholdManual = Number(this._input(11)) || 0;
                    const showEQ = this._input(12) !== false;
                    const eqThreshold = Number(this._input(13)) || 0.1;
                    const showPD = this._input(14) === true;

                    const time = PineJS.Std.time(context);
                    const bar = {
                        time,
                        o: PineJS.Std.open(context),
                        h: PineJS.Std.high(context),
                        l: PineJS.Std.low(context),
                        c: PineJS.Std.close(context),
                        v: PineJS.Std.volume(context) || 0,
                    };

                    const out = new Array(PLOT_COUNT).fill(NaN);
                    if (![bar.o, bar.h, bar.l, bar.c].every(Number.isFinite)) return out;

                    // Tua ngược (replay): dựng lại sạch sẽ thay vì để state lẫn lộn.
                    if (!isNaN(self.lastTime) && time < self.lastTime) {
                        const keep = self.bars.filter(b => b.time < time);
                        resetState(self);
                        self.bars = keep;
                    }

                    const isNewBar = isNaN(self.lastTime) || time !== self.lastTime;
                    if (isNewBar) {
                        self.bars.push(bar);
                        if (self.bars.length > MAX_BARS) self.bars.shift();
                    } else if (self.bars.length) {
                        self.bars[self.bars.length - 1] = bar;
                    } else {
                        self.bars.push(bar);
                    }
                    self.lastTime = time;

                    const n = self.bars.length - 1;

                    // ── ATR ──
                    const tr = trueRange(bar, self.prevClose);
                    if (isNewBar || n === 0) {
                        self.atrPrev = wilderATR(self.atrPrev, tr, 200);
                        self.atrShortPrev = wilderATR(self.atrShortPrev, tr, 14);
                        const rangePct = bar.l > 0 ? (bar.h - bar.l) / bar.l * 100 : 0;
                        self.rangePctSum += rangePct;
                        self.rangePctCount += 1;
                        self.prevClose = bar.c;
                    }
                    const atr200 = self.atrPrev;
                    const atr14 = self.atrShortPrev;

                    // ═══════════ 1. Cấu trúc Internal & Swing ═══════════
                    const evInt = updateStructure(self, self.internal, INTERNAL_LEN, bar, out, n);
                    const evSw = updateStructure(self, self.swing, SWING_LEN, bar, out, n);

                    if (showInternal && (evInt.bos || evInt.choch)) {
                        const up = evInt.dir === 1;
                        const id = evInt.choch
                            ? (up ? 'in_choch_bull' : 'in_choch_bear')
                            : (up ? 'in_bos_bull' : 'in_bos_bear');
                        out[PLOT_INDEX[id]] = up ? bar.l : bar.h;
                    }
                    if (showSwing && (evSw.bos || evSw.choch)) {
                        const up = evSw.dir === 1;
                        const id = evSw.choch
                            ? (up ? 'sw_choch_bull' : 'sw_choch_bear')
                            : (up ? 'sw_bos_bull' : 'sw_bos_bear');
                        out[PLOT_INDEX[id]] = up ? bar.l : bar.h;
                    }

                    // ═══════════ 2. Nhãn swing + EQH/EQL + Strong/Weak ═══════════
                    if (evSw.newHigh) {
                        const lvl = evSw.newHigh.level;
                        if (showSwingLabels && Number.isFinite(self.prevSwingHigh)) {
                            out[PLOT_INDEX[lvl > self.prevSwingHigh ? 'sw_hh' : 'sw_lh']] = lvl;
                        }
                        if (showStrongWeak) {
                            // High chưa bị lấy trong xu hướng giảm = Strong High
                            out[PLOT_INDEX[self.swing.trend === -1 ? 'strong_high' : 'weak_high']] = lvl;
                        }
                        self.prevSwingHigh = lvl;
                    }
                    if (evSw.newLow) {
                        const lvl = evSw.newLow.level;
                        if (showSwingLabels && Number.isFinite(self.prevSwingLow)) {
                            out[PLOT_INDEX[lvl < self.prevSwingLow ? 'sw_ll' : 'sw_hl']] = lvl;
                        }
                        if (showStrongWeak) {
                            out[PLOT_INDEX[self.swing.trend === 1 ? 'strong_low' : 'weak_low']] = lvl;
                        }
                        self.prevSwingLow = lvl;
                    }

                    // ═══════════ 2b. Equal High / Equal Low (pivot ngắn riêng) ═══════════
                    if (showEQ) {
                        const eqRes = legAt(self.bars, EQ_LEN);
                        if (eqRes && !isNaN(eqRes.leg)) {
                            const eqChanged = isNaN(self.eqLegPrev) ? true : eqRes.leg !== self.eqLegPrev;
                            if (eqChanged && Number.isFinite(atr200) && atr200 > 0) {
                                const tol = eqThreshold * atr200;
                                if (eqRes.kind === 'high') {
                                    if (Number.isFinite(self.prevEqHigh) && Math.abs(eqRes.level - self.prevEqHigh) < tol) {
                                        out[PLOT_INDEX['eqh']] = eqRes.level;
                                    }
                                    self.prevEqHigh = eqRes.level;
                                } else {
                                    if (Number.isFinite(self.prevEqLow) && Math.abs(eqRes.level - self.prevEqLow) < tol) {
                                        out[PLOT_INDEX['eql']] = eqRes.level;
                                    }
                                    self.prevEqLow = eqRes.level;
                                }
                            }
                            self.eqLegPrev = eqRes.leg;
                        }
                    }

                    if (showLevels) {
                        // Đoạn *_line (offset -LEN) chạy từ nến swing; sau khi bị phá
                        // vỡ vẫn phát thêm LEN nến để mép phải của nó rơi ĐÚNG vào
                        // nến phá vỡ rồi mới dừng.
                        // Đoạn *_level (offset 0) chỉ chạy khi mức CHƯA bị phá.
                        const drawPair = (p, len, lineId, levelId) => {
                            const lineVal = (Number.isFinite(p.level) && (!p.crossed || n <= p.crossedAt + len)) ? p.level : NaN;
                            const levelVal = (Number.isFinite(p.level) && !p.crossed) ? p.level : NaN;
                            emitLine(self, out, lineId, lineVal, isNewBar);
                            emitLine(self, out, levelId, levelVal, isNewBar);
                        };
                        if (showSwing) {
                            drawPair(self.swing.top, SWING_LEN, 'sw_top_line', 'sw_top_level');
                            drawPair(self.swing.bottom, SWING_LEN, 'sw_bot_line', 'sw_bot_level');
                        }
                        if (showInternal) {
                            drawPair(self.internal.top, INTERNAL_LEN, 'in_top_line', 'in_top_level');
                            drawPair(self.internal.bottom, INTERNAL_LEN, 'in_bot_line', 'in_bot_level');
                        }
                    }

                    // ═══════════ 3. Order Blocks ═══════════
                    if (showOB && isNewBar) {
                        const wantSwing = obSource === 'Swing' || obSource === 'Cả hai';
                        const wantInternal = obSource === 'Internal' || obSource === 'Cả hai';
                        const events = [];
                        if (wantSwing && (evSw.bos || evSw.choch)) events.push(evSw);
                        if (wantInternal && (evInt.bos || evInt.choch)) events.push(evInt);

                        for (const ev of events) {
                            const ob = buildOrderBlock(self, ev.breakFrom, n, ev.dir, obFilter, atr14);
                            if (!ob) continue;
                            const rec = { top: ob.top, bottom: ob.bottom, idx: ob.idx, seq: self.zoneSeq++ };
                            putInSlot(ev.dir === 1 ? self.obBull : self.obBear, rec);

                            // Vá mép trái: phát ở nến nguồn [origin+L .. break+L] để
                            // render đúng vào [origin .. break]. Chỉ khả thi khi
                            // leg <= L, vì các nến nguồn đó phải nằm ở TƯƠNG LAI so
                            // với thời điểm ta biết được OB (nến phá vỡ).
                            const lag = n - ob.idx;
                            if (lag >= 0 && lag <= OB_BACKFILL) {
                                (ev.dir === 1 ? self.obPendBull : self.obPendBear).push({
                                    top: ob.top, bottom: ob.bottom,
                                    startSrc: ob.idx + OB_BACKFILL,
                                    endSrc: n + OB_BACKFILL,
                                    seq: self.zoneSeq++,
                                });
                            }
                        }

                        // Mitigation: giá xuyên qua thì vùng hết hiệu lực
                        const byClose = obMitigation === 'Close';
                        const lowRef = byClose ? bar.c : bar.l;
                        const highRef = byClose ? bar.c : bar.h;
                        for (let i = 0; i < OB_SLOTS; i++) {
                            if (self.obBull[i] && lowRef < self.obBull[i].bottom) self.obBull[i] = null;
                            if (self.obBear[i] && highRef > self.obBear[i].top) self.obBear[i] = null;
                        }
                    }
                    if (showOB && isNewBar) {
                        // Trả slot của task đã phát xong, rồi nạp task tới lượt.
                        const pump = (slots, pend) => {
                            for (let i = 0; i < slots.length; i++) {
                                if (slots[i] && n > slots[i].endSrc) slots[i] = null;
                            }
                            for (let k = pend.length - 1; k >= 0; k--) {
                                if (n > pend[k].endSrc) { pend.splice(k, 1); continue; }
                                if (n >= pend[k].startSrc) {
                                    putInSlot(slots, pend[k]);
                                    pend.splice(k, 1);
                                }
                            }
                        };
                        pump(self.obBackBull, self.obPendBull);
                        pump(self.obBackBear, self.obPendBear);
                    }
                    if (showOB) {
                        for (let i = 0; i < OB_SLOTS; i++) {
                            const zu = self.obBull[i], zd = self.obBear[i];
                            emitLine(self, out, 'ob_bull_top_' + i, zu ? zu.top : NaN, isNewBar);
                            emitLine(self, out, 'ob_bull_bot_' + i, zu ? zu.bottom : NaN, isNewBar);
                            emitLine(self, out, 'ob_bear_top_' + i, zd ? zd.top : NaN, isNewBar);
                            emitLine(self, out, 'ob_bear_bot_' + i, zd ? zd.bottom : NaN, isNewBar);

                            const bu = self.obBackBull[i], bd = self.obBackBear[i];
                            const buOn = bu && n >= bu.startSrc && n <= bu.endSrc;
                            const bdOn = bd && n >= bd.startSrc && n <= bd.endSrc;
                            emitLine(self, out, 'obb_bull_top_' + i, buOn ? bu.top : NaN, isNewBar);
                            emitLine(self, out, 'obb_bull_bot_' + i, buOn ? bu.bottom : NaN, isNewBar);
                            emitLine(self, out, 'obb_bear_top_' + i, bdOn ? bd.top : NaN, isNewBar);
                            emitLine(self, out, 'obb_bear_bot_' + i, bdOn ? bd.bottom : NaN, isNewBar);
                        }
                    }

                    // ═══════════ 4. Fair Value Gaps ═══════════
                    if (showFVG && isNewBar && n >= 2) {
                        const b0 = self.bars[n], b2 = self.bars[n - 2], b1 = self.bars[n - 1];
                        // Ngưỡng tự động = 2× biên độ nến trung bình tích luỹ (theo %)
                        const meanRangePct = self.rangePctCount > 0 ? self.rangePctSum / self.rangePctCount : 0;
                        const threshold = fvgAuto ? meanRangePct * 2 : fvgThresholdManual;

                        if (b0.l > b2.h && b1.c > b2.h) {
                            const top = b0.l, bottom = b2.h;
                            const deltaPct = bottom > 0 ? (top - bottom) / bottom * 100 : 0;
                            if (deltaPct > threshold) putInSlot(self.fvgBull, { top, bottom, seq: self.zoneSeq++ });
                        }
                        if (b0.h < b2.l && b1.c < b2.l) {
                            const top = b2.l, bottom = b0.h;
                            const deltaPct = bottom > 0 ? (top - bottom) / bottom * 100 : 0;
                            if (deltaPct > threshold) putInSlot(self.fvgBear, { top, bottom, seq: self.zoneSeq++ });
                        }
                        for (let i = 0; i < FVG_SLOTS; i++) {
                            if (self.fvgBull[i] && bar.l < self.fvgBull[i].bottom) self.fvgBull[i] = null;
                            if (self.fvgBear[i] && bar.h > self.fvgBear[i].top) self.fvgBear[i] = null;
                        }
                    }
                    if (showFVG) {
                        for (let i = 0; i < FVG_SLOTS; i++) {
                            const zu = self.fvgBull[i], zd = self.fvgBear[i];
                            emitLine(self, out, 'fvg_bull_top_' + i, zu ? zu.top : NaN, isNewBar);
                            emitLine(self, out, 'fvg_bull_bot_' + i, zu ? zu.bottom : NaN, isNewBar);
                            emitLine(self, out, 'fvg_bear_top_' + i, zd ? zd.top : NaN, isNewBar);
                            emitLine(self, out, 'fvg_bear_bot_' + i, zd ? zd.bottom : NaN, isNewBar);
                        }
                    }

                    // ═══════════ 5. Premium / Equilibrium / Discount ═══════════
                    if (showPD && Number.isFinite(self.swing.top.level) && Number.isFinite(self.swing.bottom.level)) {
                        const hi = self.swing.top.level, lo = self.swing.bottom.level;
                        const range = hi - lo;
                        if (range > 0) {
                            emitLine(self, out, 'prem_top', hi, isNewBar);
                            emitLine(self, out, 'prem_bot', lo + range * 0.95, isNewBar);
                            emitLine(self, out, 'eqm_top', lo + range * 0.525, isNewBar);
                            emitLine(self, out, 'eqm_bot', lo + range * 0.475, isNewBar);
                            emitLine(self, out, 'disc_top', lo + range * 0.05, isNewBar);
                            emitLine(self, out, 'disc_bot', lo, isNewBar);
                        }
                    }

                    return out;
                };
            },
        };
    }

    root.createSMCLux = createSMCLux;
})(typeof window !== 'undefined' ? window : globalThis);
