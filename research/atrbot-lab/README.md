# ATRBot Lab — nghiên cứu combo ATRBot + VWAP + Keltner

Bộ công cụ Node thuần (không dependency) để kiểm tra xem combo indicator sau có edge trên IMXUSDT / SOLUSDT hay không:

| Indicator | Tham số |
|---|---|
| ATRBot (`chart/custom_studies/atr-bot.js`) | ATR 14, mult 2, source hlc3, MA VIDYA 14 |
| VWAP phiên | hlc3, reset 00:00 UTC |
| VWAP tuần | hlc3, reset thứ Hai 00:00 UTC |
| Keltner Channels | EMA 9, mult 0.5, dùng True Range |

## Chạy

```bash
cd research/atrbot-lab
node download.mjs IMXUSDT 15m 100000 futures   # tải dữ liệu -> data/
node download.mjs SOLUSDT 15m 100000 futures
node verify-port.mjs IMXUSDT_15m_futures.csv    # so khớp port với file atr-bot.js gốc
node analyze.mjs futures 0.0005 15m              # -> reports/REPORT_futures_15m.md
node analyze.mjs futures 0.0005 1h               # resample 15m -> 1h
node explore.mjs futures                         # -> reports/EXPLORE_futures.md
node events.mjs futures 0.02                     # event study theo cách đọc chart, win = đi ≥ 2%
node scalp.mjs IMXUSDT SOLUSDT                   # scalping 15m: chọn trên IS, kiểm tra OOS + SOL
```

## Event study theo cách đọc chart (`events.mjs`)

Cách đọc: VWAP phiên (xanh) và VWAP tuần (đỏ) cho cấu trúc; dải KC(9, 0.5) đại diện cho giá; ATRBot là trạng thái thị trường. Event = nến đầu tiên một trạng thái xuất hiện. Kết quả đo từ close nến event, so với **nến bất kỳ** (base).

- **KC nằm trọn một phía của cả 2 VWAP** có thông tin thật nhưng nhỏ: tỉ lệ "+2% trước −2%" cao hơn base 3–6 điểm %, z 2–4, dương ở cả IS lẫn OOS ở phần lớn trường hợp.
- **Thứ tự xanh/đỏ không thêm thông tin.** Riêng event VWAP cắt nhau ≈ base. Khi xanh < đỏ, "KC dưới VWAP phiên" đã ngầm kéo theo "KC dưới VWAP tuần" (L4 ≡ L5).
- **ATRBot hiệu quả nhất khi dùng làm điều kiện phủ quyết:** khi ATRBot ngược với bức tranh KC/VWAP, kết quả kém hơn base ở cả 4 tổ hợp coin × chiều (spot: 3/4).
- **Trạng thái KC ngoài VWAP chỉ kéo dài khoảng 20 nến (5h).** Mục tiêu 2% thường đạt được sau 12–24h, tức khi trạng thái đã kết thúc.
- **Scalping 15m IMXUSDT (`scalp.mjs`):** 720 cấu hình (regime × entry limit/market × stop × TP × exit), chọn tham số trên IS, kiểm tra trên OOS và SOL → **0/720 dương ở cả 3**. Top 15 theo IS đều âm ở OOS (t −2 đến −5).
  - Edge gộp mỗi lệnh chỉ khoảng ±5 bps, trong khi phí ≈ 7 bps và tick ≈ 9 bps.
  - ATR của IMX đã giảm từ ~101 tick xuống ~12 tick: 1 tick ≈ 0.06% giá, khiến scalping IMX gần như không khả thi về mặt cấu trúc.
- **Nhiệt kế ±4 (`swing.mjs`, `validate.mjs`):** score = +1 KC trọn phía VWAP phiên, +1 KC trọn phía VWAP tuần, +1 thứ tự VWAP, +1 ATRBot (long − short). Trên 12 coin chưa dùng khi phát triển:
  - score +4 → lợi nhuận 24h cao hơn drift +43 bps, dương ở 12/12 coin;
  - score −4 → −16 bps, âm ở 11/12 coin.
  - Các mức điểm ở giữa không có thông tin. IMX là ngoại lệ (−4 không hoạt động).
- **Chiến thuật H3 (`hold24.mjs`):** vào market khi score chạm ±4; mỗi lần score lại = ±4 thì gia hạn; thoát 48 nến sau lần cuối score = ±4; không stop.
  - 12 coin kiểm định: long +43.5 bps/lệnh net, short +7.6. Hơn vào ngẫu nhiên +35 / +18 bps; 11/12 coin; dương ở cả IS lẫn OOS.
  - Danh mục chia đều 12 coin, không đòn bẩy: +67% trong 2.85 năm, MaxDD 25.5%, cả 4 năm đều dương, 20/35 tháng dương. t theo tháng chỉ 1.6 vì các coin tương quan cao.
  - Đặt stop (8 ATR) hoặc bỏ gia hạn đều làm kết quả kém đi. **IMX là coin tệ nhất (−39%).**
- **Ablation (`ablate.mjs`):** lõi tạo edge = **KC trọn phía VWAP phiên + VWAP phiên cùng phía so với VWAP tuần**.
  - ATRBot thừa trong chiến thuật này (bỏ đi không đổi kết quả).
  - KC vs VWAP tuần thừa về logic.
  - Thứ tự VWAP đứng một mình vô dụng nhưng là bắt buộc trong tổ hợp.
- **Tìm pattern không dùng mốc thời gian (`patterns.mjs`):**
  - Cách làm: mỗi nến được mô tả bằng trạng thái (Xanh vs Đỏ · KC vs từng VWAP · màu ATRBot); pattern = 1–3 đoạn trạng thái liên tiếp. Kết quả đo tới tín hiệu ngược (KC nằm trọn phía bên kia VWAP phiên). PnL tính theo "chốt +2%, nếu không thì thoát ở tín hiệu ngược", so với nến bất kỳ.
  - Mốc nền (nến bất kỳ) lỗ −0.06 đến −0.21% mỗi lệnh sau phí.
  - Quét ~235 pattern: long 3/40, short 14/40 vượt kiểm tra IS → OOS.
  - Tuy nhiên, thứ hạng pattern **không giữ được** từ IS sang OOS: long ρ = −0.09, short ρ = 0.19. PnL OOS của nhóm top vẫn âm.
  - Chủ đề lặp lại ở phía short: **KC đánh mất VWAP phiên từ phía trên** (trên → cắt → dưới đường xanh) khi cấu trúc VWAP còn tăng hoặc ATRBot còn xanh. Chỉ nên coi là ứng viên để theo dõi.
- **Bracket ±2% trong 12h:** event tốt nhất cho kỳ vọng thô +0.15–0.21%, so với base +0.03–0.07%. Phần chênh (~0.1%) xấp xỉ bằng phí khứ hồi. Đây là bộ lọc hướng có giá trị, nhưng tự nó chưa đủ thành chiến thuật; cần entry/exit tốt hơn.

Tham số `0.0005` = phí + trượt giá mỗi chiều (0.10% khứ hồi).

### Chiến thuật "nhiệt kế" (phát hiện chính)

```bash
node swing.mjs IMXUSDT SOLUSDT   # nhiệt kế score + grid chiến thuật trên 2 coin phát triển
node validate.mjs 200            # ứng viên chốt sẵn, kiểm định trên 12 coin khác
node hold24.mjs 100              # chiến thuật giữ theo nhiệt kế, 14 coin + danh mục
node ablate.mjs 50               # bỏ từng điều kiện để xem cái nào đóng góp
node patterns.mjs 0.02 IMXUSDT   # tìm pattern theo chuỗi trạng thái, đo tới tín hiệu ngược (không mốc thời gian)
```

Muốn thêm coin: `node download.mjs <SYMBOL> 15m 100000 futures`. Tick size lấy từ `data/ticks.json`; nếu chưa có file này, chạy lại đoạn lấy `exchangeInfo` trong lịch sử phiên.

### Chart xem nhanh (`stat1.html`)

Mở trực tiếp `stat1.html` trong trình duyệt (không cần server). Trang dùng Lightweight Charts 5.1 và dữ liệu Binance Futures, vẽ 4 indicator:

- **ATRBot:** có cloud trạng thái. Code port 1:1 từ `atr-bot.js` và đã đối chiếu cho đủ 6 loại MA.
- **VWAP phiên và VWAP tuần:** reset theo giờ UTC. Chỉ bắt đầu vẽ từ lần reset đầu tiên.
- **Keltner:** có dải tô.

Tương tác:
- Gõ symbol rồi Enter; chọn khung thời gian trên thanh trên cùng.
- Trong legend: biểu tượng mắt để ẩn/hiện; bánh răng để chỉnh tham số, màu, độ dày, kiểu nét. Cài đặt được lưu vào localStorage.
- Nút **Cài đặt** trên thanh trên cùng mở modal 3 tab:
  - **Chung:** số nến tải (mặc định 10.000, từ 500 đến 50.000), múi giờ (UTC / giờ máy; VWAP luôn neo theo UTC), lưới, thang log, crosshair hút giá, màu nến (mặc định chuẩn Binance).
  - **Preset:** lưu / tải / ghi đè / xoá bộ cài đặt (gồm indicator và tuỳ chọn trang); xuất / nhập file JSON.
  - **Dữ liệu:** danh sách dữ liệu đã tải (số nến, khoảng thời gian, số nến còn thiếu, dung lượng), cập nhật hoặc xoá từng bộ hoặc tất cả.

Dữ liệu được cache trong localStorage, mỗi symbol/khung giữ đúng số nến đã cài:
- **Lần đầu:** tải đủ số nến đã cài.
- **Thiếu < 50 nến:** một request 50 nến.
- **Thiếu ≥ 50 nến:** tải bù theo trang.
- **Tăng số nến:** tải thêm lịch sử cũ hơn. Nếu đã chạm nến đầu tiên của symbol thì ghi nhận lại và không tải lại lịch sử nữa.

Cache được nén (giá thành số nguyên chênh lệch base36), khoảng 150KB cho 10.000 nến thay vì ~500KB. Giải nén trả về đúng từng bit giá trị gốc. Cache dạng cũ vẫn đọc được và tự chuyển sang dạng nén.

Realtime dùng WebSocket `wss://fstream.binance.com/market/ws/`. Endpoint cũ `/ws/` vẫn mở kết nối nhưng không còn gửi dữ liệu kline. Nếu một endpoint im lặng quá 30 giây, trang tự chuyển sang endpoint còn lại. Trang cũng tự tải bù khi mất kết nối.

## Cấu trúc

- `lib/indicators.mjs` — port 1:1 ATRBot (khớp tuyệt đối với `atr-bot.js` trên 200k nến), VWAP neo, Keltner, resample.
- `lib/features.mjs` — gộp 4 indicator thành trạng thái tại mỗi nến đóng (không nhìn tương lai).
- `lib/backtest.mjs` — engine 1 vị thế: vào ở open nến kế, stop/target intrabar (cùng nến chạm cả hai thì tính stop trước), có phí.
- `analyze.mjs` — tổng quan ATRBot, bản đồ edge theo trạng thái, nghiên cứu sự kiện flip, grid 462 cấu hình (trigger × filter × exit × chiều), ablation, độ nhạy tham số, kiểm định Monte Carlo so với vào lệnh ngẫu nhiên.
- `explore.mjs` — variance ratio, ATRBot 1h/4h làm bộ lọc, chế độ biến động, giả thuyết momentum và mean-reversion.

## Kết luận chính (Binance futures, 12/2023 → 10/2026, 100k nến 15m mỗi coin)

1. **Không tìm thấy edge vững chắc nào cho combo này.** Trong 462 cấu hình ở 15m chỉ có 3 cấu hình dương ở cả IS lẫn OOS trên cả 2 coin, và cả 3 đều có t < 1. Ở 1h: 0/462. Trên dữ liệu spot: 1/462, và là một cấu hình khác hẳn — dấu hiệu điển hình của nhiễu.
2. **Trạng thái ATRBot gần như không dự báo được lợi nhuận tương lai** (|t| < 0.6 ở H16/H48). Flip đến trễ, trung vị **~7.3 ATR** tính từ đáy/đỉnh. MFE/MAE sau flip ≈ 1.08, tức gần như đối xứng.
3. **Thị trường mang tính mean-reverting:** variance ratio < 1 ở mọi horizon từ 1h đến 4 ngày, trên cả 2 coin và cả 2 nửa dữ liệu. Đây là lý do mang tính cấu trúc khiến các tín hiệu trend-following thất bại.
4. **Keltner(9, 0.5) quá hẹp:** 51–53% số nến đóng ngoài kênh, khoảng 16 lần phá kênh mỗi ngày. Mọi trigger dựa trên KC đều lỗ xấp xỉ đúng bằng phí (≈ −10 bps/lệnh), tức edge trước phí ≈ 0.
5. **Thứ Hai VWAP phiên ≡ VWAP tuần** (reset cùng lúc), nên khoảng 1/7 thời gian combo chỉ còn 3 indicator.
6. **VWAP tuần là thành phần duy nhất có tín hiệu cùng dấu trên cả 2 coin:** khi ATRBot xanh nhưng giá dưới wVWAP thì lợi nhuận tương lai âm. Tuy nhiên chưa đạt mức có ý nghĩa thống kê (|t| ≈ 0.6–1.5).
7. **Ứng viên tốt nhất:** SHORT khi ATRBot flip xuống và giá dưới wVWAP, thoát ở 2R hoặc khi flip ngược. Kiểm định Monte Carlo cho p ≈ 0.045 trên cả 2 coin, nhưng **OOS âm trên cả 2 coin**, và p ≈ 0.05 là mức có thể kỳ vọng từ cấu hình tốt nhất trong 462 cấu hình. Chưa đủ để giao dịch.
8. **Mean-reversion đơn giản** (fade độ lệch khỏi VWAP phiên hoặc tuần, có hoặc không có lọc ATRBot) cũng không qua được: 1/96 cấu hình.
9. **Mức nhiễu tham chiếu:** khoảng 700 lệnh vào ngẫu nhiên, giữ 48 nến, đã cho "edge" dao động từ −26 đến +12 bps. Mọi kết quả nằm trong biên độ này đều không phân biệt được với may rủi.
