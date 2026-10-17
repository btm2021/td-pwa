# Scalping 15m IMXUSDT từ combo ATRBot + VWAP + Keltner

Dữ liệu: 2023-12-17 → 2026-10-17. IS (chọn tham số) = 621 ngày đầu đến 2025-08-29; OOS = 414 ngày cuối. SOLUSDT chỉ dùng để kiểm tra chéo, không tối ưu.

Phí: maker 0.02% / taker 0.05%. Tick IMXUSDT = 0.0001 (~0.06% ở giá hiện tại). Limit chỉ khớp khi giá xuyên qua ≥ 1 tick; stop trượt 1 tick; nến khớp lệnh không tính TP; cùng nến chạm stop & TP → tính stop.

**Regime:** `R0` Không lọc (đối chứng); `R1` KC trọn phía VWAP phiên + ATRBot cùng hướng; `R2` KC trọn phía CẢ 2 VWAP + ATRBot cùng hướng; `R3` R2 + nhớ 24 nến (huỷ khi ATRBot đổi / KC sang phía ngược dVWAP)

**Entry:** `MKT` Market tại open nến kế; `BASIS` Limit tại KC basis (EMA9); `BAND` Limit tại biên KC phía sau (long: lower, short: upper); `DVWAP` Limit tại VWAP phiên; `ATR05` Limit cách close 0.5 ATR

**Stop:** `A075` 0.75 ATR; `A1` 1 ATR; `A15` 1.5 ATR; `VW` Ngoài VWAP phiên 0.25 ATR. **TP** = 1 / 1.5 / 2 R. **Exit:** `NONE` Chỉ stop / TP / hết 32 nến; `STATE` Thêm: thoát khi regime mất (close)

## 1. Bộ lọc regime có giá trị không? (trung bình trên mọi entry × stop × TP × exit, IS + OOS)

| Regime | Mô tả | Số lệnh TB | Avg net bps | Avg R | # cấu hình dương |
|---|---|---|---|---|---|
| LONG R0 | Không lọc (đối chứng) | 14111 | -14.3 | -0.24 | 0/114 |
| SHORT R0 | Không lọc (đối chứng) | 13845 | -9.9 | -0.18 | 0/114 |
| LONG R1 | KC trọn phía VWAP phiên + ATRBot cùng hướng | 2922 | -13.0 | -0.18 | 0/114 |
| SHORT R1 | KC trọn phía VWAP phiên + ATRBot cùng hướng | 3593 | -9.1 | -0.15 | 0/114 |
| LONG R2 | KC trọn phía CẢ 2 VWAP + ATRBot cùng hướng | 2315 | -10.3 | -0.14 | 0/114 |
| SHORT R2 | KC trọn phía CẢ 2 VWAP + ATRBot cùng hướng | 2970 | -9.4 | -0.15 | 0/114 |
| LONG R3 | R2 + nhớ 24 nến (huỷ khi ATRBot đổi / KC sang phía ngược dVWAP) | 3333 | -12.7 | -0.18 | 0/114 |
| SHORT R3 | R2 + nhớ 24 nến (huỷ khi ATRBot đổi / KC sang phía ngược dVWAP) | 4275 | -10.4 | -0.17 | 0/114 |

## 2. Kiểu entry (trung bình trong regime R1–R3)

| Entry | Mô tả | Số lệnh TB | IS avg bps | OOS avg bps | # cấu hình dương |
|---|---|---|---|---|---|
| LONG MKT | Market tại open nến kế | 4451 | -10.6 | -17.8 | 0/72 |
| SHORT MKT | Market tại open nến kế | 5580 | -4.4 | -18.8 | 0/72 |
| LONG BASIS | Limit tại KC basis (EMA9) | 2939 | -9.0 | -15.7 | 0/72 |
| SHORT BASIS | Limit tại KC basis (EMA9) | 3762 | -2.3 | -14.6 | 0/72 |
| LONG BAND | Limit tại biên KC phía sau (long: lower, short: upper) | 2213 | -7.9 | -18.6 | 0/72 |
| SHORT BAND | Limit tại biên KC phía sau (long: lower, short: upper) | 2835 | -5.2 | -13.6 | 0/72 |
| LONG DVWAP | Limit tại VWAP phiên | 1310 | -4.7 | -24.4 | 0/54 |
| SHORT DVWAP | Limit tại VWAP phiên | 1656 | -10.3 | -18.0 | 0/54 |
| LONG ATR05 | Limit cách close 0.5 ATR | 2986 | -8.9 | -15.5 | 0/72 |
| SHORT ATR05 | Limit cách close 0.5 ATR | 3741 | -2.4 | -20.3 | 0/72 |

## 3. Top 15 cấu hình xếp theo t-stat trên IS (n IS ≥ 80) — OOS và SOLUSDT là phần kiểm tra

Đây là phép thử quan trọng nhất: cấu hình được chọn **chỉ** nhìn IS. Nếu OOS và coin khác vẫn dương thì mới có cơ sở tin.

| Cấu hình | IS n | IS win | IS avg bps | IS PF | IS t | OOS n | OOS win | OOS avg bps | OOS PF | OOS t | SOLUSDT n | SOLUSDT avg bps | SOLUSDT PF |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SHORT R1·ATR05·A15·2R·NONE | 1575 | 40% | 5.9 | 1.07 | 1.26 | 1019 | 31% | -20.3 | 0.75 | -3.96 | 2135 | -4.7 | 0.93 |
| SHORT R2·ATR05·A15·2R·NONE | 1280 | 40% | 6.7 | 1.08 | 1.26 | 877 | 30% | -22.6 | 0.73 | -4.00 | 1784 | -2.3 | 0.97 |
| SHORT R2·ATR05·VW·1.5R·NONE | 805 | 45% | 8.5 | 1.10 | 1.14 | 566 | 38% | -25.9 | 0.69 | -3.35 | 1222 | -5.3 | 0.92 |
| SHORT R2·BASIS·A15·2R·NONE | 1109 | 40% | 6.2 | 1.08 | 1.11 | 769 | 33% | -17.7 | 0.78 | -3.06 | 1575 | -2.9 | 0.96 |
| SHORT R2·MKT·A15·2R·NONE | 1489 | 40% | 4.6 | 1.05 | 0.90 | 1048 | 31% | -23.0 | 0.72 | -4.57 | 2164 | -7.8 | 0.89 |
| SHORT R2·ATR05·VW·2R·NONE | 744 | 41% | 7.4 | 1.09 | 0.89 | 526 | 33% | -24.5 | 0.72 | -2.76 | 1122 | -3.6 | 0.95 |
| LONG R2·DVWAP·A15·2R·STATE | 433 | 32% | 4.9 | 1.12 | 0.83 | 237 | 25% | -22.0 | 0.52 | -3.49 | 783 | -2.9 | 0.91 |
| SHORT R3·ATR05·VW·1.5R·NONE | 1025 | 44% | 4.7 | 1.06 | 0.79 | 672 | 37% | -22.4 | 0.71 | -3.31 | 1516 | -5.1 | 0.92 |
| SHORT R2·BASIS·A15·1.5R·NONE | 1292 | 45% | 3.5 | 1.05 | 0.75 | 885 | 38% | -16.5 | 0.78 | -3.37 | 1811 | -2.5 | 0.96 |
| SHORT R1·ATR05·A15·1.5R·NONE | 1843 | 44% | 2.6 | 1.04 | 0.69 | 1143 | 35% | -21.4 | 0.72 | -4.91 | 2523 | -1.6 | 0.97 |
| SHORT R2·BASIS·VW·2R·NONE | 857 | 39% | 4.6 | 1.06 | 0.67 | 601 | 34% | -13.8 | 0.81 | -2.04 | 1326 | -4.8 | 0.92 |
| SHORT R2·ATR05·VW·1.5R·STATE | 839 | 42% | 4.3 | 1.06 | 0.66 | 588 | 37% | -21.1 | 0.71 | -3.13 | 1277 | -5.6 | 0.90 |
| SHORT R2·BASIS·VW·1.5R·NONE | 928 | 44% | 3.8 | 1.05 | 0.64 | 652 | 39% | -12.2 | 0.82 | -2.05 | 1457 | -4.1 | 0.93 |
| SHORT R1·BASIS·A15·2R·NONE | 1389 | 39% | 3.1 | 1.04 | 0.63 | 900 | 33% | -16.7 | 0.78 | -3.20 | 1893 | -4.0 | 0.94 |
| SHORT R1·ATR05·VW·1.5R·NONE | 993 | 44% | 4.0 | 1.05 | 0.62 | 655 | 39% | -22.7 | 0.72 | -3.26 | 1447 | -6.3 | 0.90 |

→ Trong top 15 theo IS: **0/15 dương ở OOS**, **0/15 dương trên SOLUSDT**.

## 4. Cấu hình dương ở cả IS, OOS và SOLUSDT: 0/720

(Lưu ý: danh sách này đã nhìn cả OOS nên có thiên lệch chọn lọc; dùng để tìm vùng tham số ổn định, không phải bằng chứng.)

| Cấu hình | IS n | IS win | IS avg bps | IS PF | IS t | OOS n | OOS win | OOS avg bps | OOS PF | OOS t | SOLUSDT n | SOLUSDT avg bps | SOLUSDT PF |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

## 5. Phân tích sâu: SHORT R1·ATR05·A15·2R·NONE

### Theo nửa năm

| Giai đoạn | n | Win | Avg bps | PF | Tổng |
|---|---|---|---|---|---|
| 2023H2 | 46 | 35% | -12.2 | 0.85 | -5.6% |
| 2024H1 | 445 | 40% | 1.9 | 1.02 | 8.4% |
| 2024H2 | 458 | 38% | 0.5 | 1.01 | 2.5% |
| 2025H1 | 498 | 41% | 15.6 | 1.20 | 77.6% |
| 2025H2 | 436 | 34% | -6.0 | 0.93 | -26.0% |
| 2026H1 | 462 | 31% | -21.6 | 0.73 | -99.7% |
| 2026H2 | 249 | 28% | -28.3 | 0.60 | -70.6% |

Lý do thoát: stop 61%, tp 30%, signal 8%. Giữ TB 11.5 nến. Tần suất: 17.6 lệnh/tuần.

Phí: với maker 0.02% / taker 0.05% avg = -4.4 bps; nếu **mọi lệnh taker** avg = -8.3 bps (OOS -24.0).

### Độ nhạy: đổi từng tham số, giữ nguyên phần còn lại

| Thay đổi | IS n | IS bps | OOS n | OOS bps | PF toàn bộ | SOLUSDT n | SOLUSDT bps |
|---|---|---|---|---|---|---|---|
| reg = R0 | 4657 | -4.0 | 3072 | -14.6 | 0.90 | 7449 | -6.5 |
| reg = R1 ◀ | 1575 | 5.9 | 1019 | -20.3 | 0.94 | 2135 | -4.7 |
| reg = R2 | 1280 | 6.7 | 877 | -22.6 | 0.94 | 1784 | -2.3 |
| reg = R3 | 1623 | 0.3 | 1161 | -22.8 | 0.89 | 2374 | -3.4 |
| entry = MKT | 1837 | 1.8 | 1205 | -22.1 | 0.91 | 2586 | -8.2 |
| entry = BASIS | 1389 | 3.1 | 900 | -16.7 | 0.94 | 1893 | -4.0 |
| entry = BAND | 1175 | 0.6 | 799 | -14.5 | 0.93 | 1603 | -5.7 |
| entry = DVWAP | 558 | -5.9 | 401 | -16.5 | 0.87 | 835 | -0.9 |
| entry = ATR05 ◀ | 1575 | 5.9 | 1019 | -20.3 | 0.94 | 2135 | -4.7 |
| stop = A075 | 3288 | -5.8 | 1951 | -18.4 | 0.78 | 4381 | -6.5 |
| stop = A1 | 2468 | -1.2 | 1510 | -19.2 | 0.86 | 3302 | -6.1 |
| stop = A15 ◀ | 1575 | 5.9 | 1019 | -20.3 | 0.94 | 2135 | -4.7 |
| stop = VW | 922 | 3.8 | 610 | -19.6 | 0.93 | 1336 | -4.9 |
| R = 1 | 2318 | -2.0 | 1360 | -21.0 | 0.86 | 3085 | -3.9 |
| R = 1.5 | 1843 | 2.6 | 1143 | -21.4 | 0.91 | 2523 | -1.6 |
| R = 2 ◀ | 1575 | 5.9 | 1019 | -20.3 | 0.94 | 2135 | -4.7 |
| exit = NONE ◀ | 1575 | 5.9 | 1019 | -20.3 | 0.94 | 2135 | -4.7 |
| exit = STATE | 1666 | 1.5 | 1076 | -19.9 | 0.90 | 2290 | -7.1 |

## 6. Lỗ đến từ đâu? Phân rã chi phí (trung bình mọi entry × stop × TP × exit)

Gộp = không phí, không trượt tick, limit khớp khi chạm. Nếu cột gộp đã ≤ 0 thì tín hiệu không có edge ở khung scalping, tối ưu phí cũng vô ích.

| Regime | IS gộp | IS + phí | IS + phí + tick | OOS gộp | OOS + phí | OOS + phí + tick |
|---|---|---|---|---|---|---|
| LONG R0 | -2.6 | -10.1 | -11.7 | -2.4 | -9.9 | -18.3 |
| SHORT R0 | 2.0 | -5.4 | -7.0 | 1.6 | -5.8 | -14.5 |
| LONG R1 | 0.7 | -6.3 | -8.2 | -4.6 | -11.8 | -20.8 |
| SHORT R1 | 4.2 | -2.9 | -4.6 | 0.4 | -6.7 | -16.1 |
| LONG R2 | 1.2 | -5.8 | -7.6 | 0.3 | -6.8 | -15.2 |
| SHORT R2 | 4.8 | -2.2 | -4.0 | -0.4 | -7.5 | -17.1 |
| LONG R3 | -0.4 | -7.7 | -9.4 | -2.7 | -10.1 | -18.3 |
| SHORT R3 | 3.5 | -3.7 | -5.4 | -1.1 | -8.5 | -17.8 |

ATR(14) 15m trung vị tính theo tick: IS ≈ 101 tick, OOS ≈ 12 tick.
