# Event study theo cách đọc chart — futures 15m, win = giá đi theo hướng ≥ 2.0%

**Định nghĩa**
- VWAP phiên = xanh, VWAP tuần = đỏ. `xanh < đỏ` = cấu trúc giảm, `xanh > đỏ` = cấu trúc tăng. Thứ Hai 2 đường trùng nhau → coi là 1 đường VWAP.
- KC(9, 0.5) đại diện cho giá. "KC dưới VWAP" = **KC upper < VWAP** (cả dải nằm dưới). "KC trên VWAP" = KC lower > VWAP.
- **Event** = nến đầu tiên trạng thái xuất hiện. Đo từ close nến event.
- **Win** = trong cửa sổ, giá có lúc đi theo hướng ≥ 2% (max PnL), bất kể có đi ngược trước hay không.
- **Sạch** = chạm +2% theo hướng **trước khi** chạm −2% ngược hướng (cùng nến chạm cả 2 → tính thua).
- **Base** = tỉ lệ tương ứng của **một nến bất kỳ** cùng hướng, cùng cửa sổ. Số trong ngoặc là chênh lệch theo điểm %: `+10` nghĩa là event tốt hơn nến ngẫu nhiên 10 điểm %. Đây mới là thước đo "event có thêm thông tin hay không".
- **z** = chênh lệch "sạch" so với base chia sai số chuẩn. |z| ≥ 2 mới đáng chú ý (event chồng lấn nhau nên z thực tế còn thấp hơn). **IS / OOS** = chênh lệch "sạch" so với base **của cùng giai đoạn** (60% đầu / 40% cuối).
- **Đến hết trạng thái** =từ event tới khi trạng thái mất (tối đa 192 nến).

## 0. Mốc so sánh

| Symbol | ATR(14) 15m trung vị | Base win 4h ↑/↓ | Base win 12h ↑/↓ | Base win 24h ↑/↓ | Base sạch 12h ↑/↓ |
|---|---|---|---|---|---|
| IMXUSDT | 0.72% | 28% / 29% | 52% / 56% | 65% / 69% | 43% / 47% |
| SOLUSDT | 0.55% | 19% / 20% | 41% / 42% | 56% / 57% | 36% / 38% |

> Ví dụ: nếu base win 12h là 60% thì một event "win 62%" gần như không nói lên gì — nến bất kỳ cũng đạt mức đó.

## 1. Bậc thang event GIẢM (short)

Mỗi dòng là một event riêng (nến đầu tiên mà **toàn bộ** điều kiện của dòng đó cùng đúng).

| Event | IMXUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % | SOLUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 · Cấu trúc VWAP (xanh < đỏ) | 275 | 56% (+0) | 45% (-1, z-0.4) | 64% / 50% · 111n | +3 / -6 | 2.3/1.8 | 257 | 43% (+0) | 39% (+2, z0.5) | 54% / 45% · 114n | +3 / +1 | 1.7/1.2 |
| L2 · KC hoàn toàn dưới VWAP phiên | 1900 | 55% (-0) | 48% (+1, z1.1) | 32% / 31% · 20n | +2 / +0 | 2.3/2.0 | 1829 | 45% (+3) | 40% (+3, z2.3) | 24% / 24% · 18n | +3 / +2 | 1.8/1.6 |
| L2b · KC hoàn toàn dưới VWAP tuần | 670 | 56% (+0) | 48% (+2, z1.0) | 43% / 42% · 54n | +3 / -0 | 2.4/2.0 | 642 | 44% (+2) | 41% (+3, z1.7) | 35% / 35% · 53n | +6 / +1 | 1.7/1.5 |
| L3 · KC dưới CẢ 2 VWAP | 1322 | 56% (-0) | 48% (+1, z0.9) | 34% / 33% · 21n | +3 / -1 | 2.4/2.0 | 1253 | 47% (+5) | 42% (+5, z3.5) | 26% / 26% · 18n | +7 / +3 | 1.8/1.6 |
| L4 · L1 + KC dưới VWAP phiên | 942 | 55% (-1) | 46% (-0, z-0.1) | 32% / 31% · 20n | +1 / -1 | 2.3/2.0 | 904 | 47% (+5) | 42% (+4, z2.7) | 25% / 25% · 18n | +6 / +3 | 1.8/1.5 |
| L5 · L1 + KC dưới cả 2 VWAP | 942 | 55% (-1) | 46% (-0, z-0.1) | 32% / 31% · 20n | +1 / -1 | 2.3/2.0 | 904 | 47% (+5) | 42% (+4, z2.7) | 25% / 25% · 18n | +6 / +3 | 1.8/1.5 |
| L6 · L5 + ATRBot đỏ | 809 | 57% (+1) | 47% (+1, z0.5) | 34% / 33% · 21n | +2 / +0 | 2.4/2.1 | 766 | 50% (+7) | 44% (+6, z3.4) | 27% / 27% · 19n | +7 / +5 | 2.0/1.6 |
| L6x · L5 nhưng ATRBot ngược | 229 | 44% (-11) | 39% (-7, z-2.2) | 12% / 12% · 8n | -5 / -8 | 1.7/1.8 | 229 | 37% (-5) | 34% (-4, z-1.1) | 10% / 10% · 8n | -2 / -3 | 1.4/1.4 |
| Thứ Hai · KC dưới VWAP (1 đường) | 276 | 53% (-3) | 47% (+1, z0.2) | 33% / 32% · 18n | +3 / -2 | 2.3/2.4 | 259 | 46% (+4) | 43% (+5, z1.7) | 27% / 27% · 19n | +9 / -2 | 1.8/1.9 |
| Thứ Hai · + ATRBot cùng hướng | 206 | 54% (-1) | 49% (+3, z0.7) | 33% / 33% · 19n | +5 / -1 | 2.4/2.5 | 165 | 52% (+9) | 47% (+10, z2.6) | 32% / 32% · 20n | +13 / +3 | 2.0/1.8 |
| ATRBot đỏ (flip) | 404 | 58% (+3) | 50% (+3, z1.2) | 72% / 55% · 109n | +3 / +3 | 2.4/2.1 | 368 | 45% (+3) | 40% (+2, z0.9) | 64% / 52% · 114n | +4 / +1 | 1.8/1.4 |
| ATRBot flip khi KC đã dưới cả 2 VWAP | 1098 | 57% (+2) | 49% (+2, z1.5) | 36% / 35% · 21n | +4 / +0 | 2.4/2.2 | 1003 | 49% (+7) | 44% (+6, z4.1) | 28% / 28% · 19n | +8 / +5 | 1.9/1.6 |
| ATRBot flip khi KC ngược phía VWAP phiên | 987 | 56% (-0) | 47% (+0, z0.2) | 13% / 12% · 10n | +0 / +1 | 2.3/2.2 | 981 | 45% (+3) | 39% (+1, z0.9) | 7% / 7% · 11n | +0 / +3 | 1.8/1.6 |

## 2. Bậc thang event TĂNG (long)

Mỗi dòng là một event riêng (nến đầu tiên mà **toàn bộ** điều kiện của dòng đó cùng đúng).

| Event | IMXUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % | SOLUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 · Cấu trúc VWAP (xanh > đỏ) | 262 | 53% (+2) | 43% (+0, z0.0) | 59% / 44% · 107n | +5 / -6 | 2.4/2.4 | 258 | 40% (-2) | 35% (-1, z-0.5) | 51% / 44% · 107n | +2 / -7 | 1.5/1.6 |
| L2 · KC hoàn toàn trên VWAP phiên | 1705 | 54% (+2) | 45% (+2, z1.5) | 31% / 30% · 19n | +1 / +3 | 2.2/2.2 | 1815 | 43% (+2) | 38% (+2, z1.4) | 23% / 23% · 19n | +2 / +0 | 1.6/1.7 |
| L2b · KC hoàn toàn trên VWAP tuần | 622 | 59% (+7) | 50% (+7, z3.6) | 45% / 42% · 52n | +11 / +2 | 2.4/2.1 | 657 | 42% (+1) | 37% (+1, z0.6) | 35% / 33% · 50n | +2 / -0 | 1.7/1.9 |
| L3 · KC trên CẢ 2 VWAP | 1057 | 57% (+5) | 49% (+6, z3.7) | 35% / 34% · 20n | +7 / +4 | 2.4/2.2 | 1168 | 44% (+3) | 40% (+3, z2.4) | 25% / 24% · 19n | +4 / +2 | 1.7/1.7 |
| L4 · L1 + KC trên VWAP phiên | 699 | 54% (+2) | 46% (+3, z1.6) | 34% / 33% · 19n | +3 / +2 | 2.3/2.2 | 783 | 44% (+3) | 40% (+4, z2.3) | 24% / 23% · 19n | +5 / +2 | 1.7/1.6 |
| L5 · L1 + KC trên cả 2 VWAP | 699 | 54% (+2) | 46% (+3, z1.6) | 34% / 33% · 19n | +3 / +2 | 2.3/2.2 | 783 | 44% (+3) | 40% (+4, z2.3) | 24% / 23% · 19n | +5 / +2 | 1.7/1.6 |
| L6 · L5 + ATRBot xanh | 600 | 57% (+5) | 47% (+4, z2.0) | 36% / 34% · 20n | +3 / +5 | 2.4/2.2 | 684 | 44% (+3) | 40% (+4, z2.3) | 25% / 25% · 20n | +6 / +1 | 1.7/1.6 |
| L6x · L5 nhưng ATRBot ngược | 158 | 44% (-7) | 39% (-4, z-1.0) | 16% / 15% · 8n | -1 / -9 | 1.8/2.5 | 169 | 38% (-3) | 36% (-1, z-0.2) | 8% / 8% · 9n | -0 / -2 | 1.5/1.6 |
| Thứ Hai · KC trên VWAP (1 đường) | 263 | 61% (+9) | 52% (+9, z2.9) | 37% / 37% · 20n | +9 / +8 | 2.7/2.1 | 268 | 45% (+4) | 38% (+2, z0.7) | 25% / 25% · 20n | +2 / +1 | 1.7/2.1 |
| Thứ Hai · + ATRBot cùng hướng | 172 | 60% (+8) | 51% (+8, z2.2) | 37% / 35% · 22n | +8 / +9 | 2.8/2.6 | 173 | 42% (+1) | 37% (+1, z0.2) | 29% / 29% · 23n | -2 / +5 | 1.4/2.1 |
| ATRBot xanh (flip) | 405 | 58% (+6) | 47% (+4, z1.6) | 65% / 49% · 99n | +7 / +0 | 2.4/2.3 | 369 | 43% (+2) | 39% (+3, z1.1) | 59% / 49% · 109n | +4 / +2 | 1.7/1.5 |
| ATRBot flip khi KC đã trên cả 2 VWAP | 848 | 58% (+6) | 49% (+6, z3.3) | 36% / 34% · 21n | +5 / +6 | 2.5/2.2 | 946 | 44% (+3) | 40% (+3, z2.1) | 26% / 25% · 21n | +3 / +3 | 1.7/1.7 |
| ATRBot flip khi KC ngược phía VWAP phiên | 974 | 47% (-5) | 40% (-3, z-2.1) | 10% / 9% · 11n | -4 / -2 | 1.8/2.3 | 985 | 41% (-0) | 38% (+2, z1.1) | 6% / 5% · 10n | +2 / +2 | 1.6/1.6 |

## 3. Trạng thái "KC dưới/trên cả 2 VWAP + cấu trúc VWAP + ATRBot" — vào giữa chừng thì sao?

Không đo nến đầu tiên mà đo **mọi nến** đang ở trạng thái L6, chia theo trạng thái đã kéo dài bao lâu. Cho biết đến muộn có còn kịp không. (Các nến chồng lấn nhau nên n lớn nhưng không độc lập.)

| Trạng thái L6 | IMXUSDT n nến | Win 12h | Sạch 12h | SOLUSDT n nến | Win 12h | Sạch 12h |
|---|---|---|---|---|---|---|
| Giảm · đã 0–3 nến | 2836 | 58% (+2) | 47% (+0) | 2624 | 49% (+7) | 43% (+5) |
| Giảm · đã 4–15 nến | 5778 | 59% (+4) | 49% (+2) | 5209 | 46% (+4) | 39% (+2) |
| Giảm · đã 16–47 nến | 6842 | 56% (+1) | 48% (+1) | 5632 | 45% (+2) | 39% (+1) |
| Giảm · đã ≥48 nến | 1776 | 49% (-6) | 42% (-5) | 941 | 40% (-2) | 38% (+0) |
| Tăng · đã 0–3 nến | 2081 | 56% (+4) | 48% (+5) | 2389 | 44% (+3) | 40% (+4) |
| Tăng · đã 4–15 nến | 4133 | 59% (+7) | 52% (+9) | 4715 | 46% (+5) | 41% (+5) |
| Tăng · đã 16–47 nến | 4771 | 54% (+2) | 46% (+3) | 5038 | 46% (+5) | 40% (+4) |
| Tăng · đã ≥48 nến | 1038 | 56% (+4) | 46% (+3) | 1291 | 52% (+11) | 46% (+10) |

## 4. Event L6 theo cửa sổ thời gian

| Event L6 | n | Trong 4h | Trong 12h | Trong 24h |
|---|---|---|---|---|
| Giảm · IMXUSDT | 809 | 29% (-1) · sạch 27% (-0) | 57% (+1) · sạch 47% (+1) | 71% (+2) · sạch 52% (+0) |
| Giảm · SOLUSDT | 766 | 27% (+7) · sạch 25% (+6) | 50% (+7) · sạch 44% (+6) | 61% (+4) · sạch 50% (+4) |
| Tăng · IMXUSDT | 600 | 32% (+4) · sạch 30% (+3) | 57% (+5) · sạch 47% (+4) | 69% (+4) · sạch 51% (+4) |
| Tăng · SOLUSDT | 684 | 23% (+4) · sạch 21% (+4) | 44% (+3) · sạch 40% (+4) | 56% (-0) · sạch 48% (+4) |

## 5. Bracket ±2% trong 12h: thắng trước / thua trước / không chạm

Kỳ vọng thô = 2% × (thắng − thua), **chưa trừ phí** (~0.10% khứ hồi futures). Phần "không chạm" tính 0.

| Event | IMXUSDT n | Thắng trước | Thua trước | Không chạm | Kỳ vọng thô | SOLUSDT n | Thắng trước | Thua trước | Không chạm | Kỳ vọng thô |
|---|---|---|---|---|---|---|---|---|---|---|
| Giảm · Nến bất kỳ (base) | 99250 | 47% | 43% | 10% | 0.07% | 99250 | 38% | 36% | 26% | 0.03% |
| Giảm · L3 · KC dưới cả 2 VWAP | 1323 | 48% | 41% | 12% | 0.15% | 1254 | 43% | 34% | 24% | 0.18% |
| Giảm · L6 · + cấu trúc VWAP + ATRBot cùng hướng | 810 | 47% | 43% | 10% | 0.09% | 767 | 44% | 34% | 22% | 0.19% |
| Giảm · L6x · ATRBot ngược | 230 | 40% | 38% | 23% | 0.03% | 230 | 34% | 33% | 32% | 0.02% |
| Giảm · ATRBot flip khi KC đã dưới cả 2 VWAP | 1099 | 49% | 41% | 10% | 0.15% | 1004 | 44% | 33% | 23% | 0.21% |
| Tăng · Nến bất kỳ (base) | 99250 | 43% | 47% | 10% | -0.07% | 99250 | 36% | 38% | 26% | -0.03% |
| Tăng · L3 · KC trên cả 2 VWAP | 1057 | 49% | 42% | 9% | 0.12% | 1170 | 39% | 38% | 22% | 0.03% |
| Tăng · L6 · + cấu trúc VWAP + ATRBot cùng hướng | 600 | 47% | 44% | 9% | 0.07% | 684 | 40% | 37% | 23% | 0.07% |
| Tăng · L6x · ATRBot ngược | 158 | 39% | 49% | 11% | -0.20% | 169 | 36% | 39% | 25% | -0.07% |
| Tăng · ATRBot flip khi KC đã trên cả 2 VWAP | 848 | 49% | 43% | 8% | 0.11% | 948 | 39% | 39% | 22% | 0.02% |
