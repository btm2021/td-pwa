# Event study theo cách đọc chart — spot 15m, win = giá đi theo hướng ≥ 2.0%

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
| IMXUSDT | 0.70% | 29% / 29% | 52% / 55% | 65% / 69% | 43% / 46% |
| SOLUSDT | 0.54% | 19% / 20% | 41% / 42% | 56% / 57% | 36% / 37% |

> Ví dụ: nếu base win 12h là 60% thì một event "win 62%" gần như không nói lên gì — nến bất kỳ cũng đạt mức đó.

## 1. Bậc thang event GIẢM (short)

Mỗi dòng là một event riêng (nến đầu tiên mà **toàn bộ** điều kiện của dòng đó cùng đúng).

| Event | IMXUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % | SOLUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 · Cấu trúc VWAP (xanh < đỏ) | 272 | 58% (+3) | 47% (+1, z0.4) | 65% / 52% · 112n | +1 / +2 | 2.4/1.9 | 258 | 43% (+1) | 39% (+1, z0.5) | 54% / 47% · 114n | +2 / +1 | 1.7/1.3 |
| L2 · KC hoàn toàn dưới VWAP phiên | 1965 | 56% (+1) | 48% (+2, z1.6) | 32% / 30% · 20n | +1 / +3 | 2.3/2.0 | 1823 | 44% (+2) | 40% (+3, z2.2) | 24% / 23% · 19n | +3 / +2 | 1.7/1.6 |
| L2b · KC hoàn toàn dưới VWAP tuần | 657 | 56% (+1) | 49% (+3, z1.4) | 45% / 43% · 55n | +3 / +2 | 2.3/2.0 | 637 | 42% (-0) | 40% (+2, z1.2) | 35% / 35% · 54n | +5 / +0 | 1.7/1.5 |
| L3 · KC dưới CẢ 2 VWAP | 1378 | 56% (+0) | 48% (+2, z1.2) | 32% / 31% · 20n | +2 / +2 | 2.3/2.0 | 1265 | 45% (+3) | 41% (+4, z2.8) | 26% / 25% · 19n | +6 / +2 | 1.8/1.5 |
| L4 · L1 + KC dưới VWAP phiên | 977 | 56% (+1) | 47% (+1, z0.7) | 31% / 30% · 20n | -0 / +3 | 2.4/2.0 | 907 | 46% (+4) | 41% (+4, z2.4) | 25% / 24% · 18n | +6 / +3 | 1.8/1.5 |
| L5 · L1 + KC dưới cả 2 VWAP | 977 | 56% (+1) | 47% (+1, z0.7) | 31% / 30% · 20n | -0 / +3 | 2.4/2.0 | 907 | 46% (+4) | 41% (+4, z2.4) | 25% / 24% · 18n | +6 / +3 | 1.8/1.5 |
| L6 · L5 + ATRBot đỏ | 834 | 56% (+1) | 47% (+1, z0.3) | 33% / 32% · 21n | +0 / +1 | 2.4/2.1 | 771 | 48% (+6) | 42% (+5, z2.9) | 27% / 26% · 19n | +7 / +3 | 1.9/1.6 |
| L6x · L5 nhưng ATRBot ngược | 245 | 52% (-3) | 45% (-1, z-0.3) | 12% / 12% · 8n | -4 / +2 | 2.1/1.7 | 231 | 37% (-5) | 35% (-3, z-0.8) | 9% / 9% · 8n | -2 / -1 | 1.5/1.2 |
| Thứ Hai · KC dưới VWAP (1 đường) | 294 | 55% (-1) | 48% (+1, z0.5) | 30% / 29% · 18n | -0 / +4 | 2.3/2.2 | 260 | 43% (+1) | 41% (+4, z1.3) | 27% / 27% · 19n | +8 / -2 | 1.8/1.8 |
| Thứ Hai · + ATRBot cùng hướng | 212 | 55% (-1) | 48% (+2, z0.6) | 35% / 34% · 19n | +4 / -1 | 2.3/2.4 | 170 | 48% (+6) | 46% (+9, z2.3) | 32% / 32% · 20n | +10 / +5 | 1.9/1.7 |
| ATRBot đỏ (flip) | 406 | 56% (+1) | 47% (+1, z0.4) | 71% / 54% · 109n | +3 / -1 | 2.4/2.0 | 381 | 44% (+2) | 39% (+1, z0.5) | 61% / 51% · 112n | +3 / -0 | 1.8/1.4 |
| ATRBot flip khi KC đã dưới cả 2 VWAP | 1126 | 56% (+1) | 48% (+2, z1.2) | 35% / 34% · 21n | +4 / -0 | 2.4/2.1 | 1020 | 47% (+5) | 42% (+5, z3.3) | 28% / 27% · 20n | +7 / +3 | 1.9/1.6 |
| ATRBot flip khi KC ngược phía VWAP phiên | 1024 | 54% (-2) | 46% (-0, z-0.3) | 11% / 11% · 9n | -2 / +1 | 2.2/2.2 | 999 | 43% (+1) | 37% (+0, z0.1) | 7% / 6% · 10n | +0 / -1 | 1.7/1.6 |

## 2. Bậc thang event TĂNG (long)

Mỗi dòng là một event riêng (nến đầu tiên mà **toàn bộ** điều kiện của dòng đó cùng đúng).

| Event | IMXUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % | SOLUSDT n | Win 12h (vs base) | Sạch 12h (vs base) | Đến hết trạng thái: win / sạch · nến | Sạch vs base: IS / OOS | MFE/MAE trung vị % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L1 · Cấu trúc VWAP (xanh > đỏ) | 259 | 58% (+5) | 47% (+4, z1.4) | 60% / 48% · 109n | +7 / +1 | 2.3/2.3 | 254 | 42% (+1) | 36% (+0, z0.0) | 54% / 46% · 109n | +5 / -7 | 1.6/1.6 |
| L2 · KC hoàn toàn trên VWAP phiên | 1807 | 53% (+1) | 45% (+2, z1.9) | 30% / 29% · 17n | +3 / +2 | 2.2/2.2 | 1820 | 42% (+1) | 38% (+1, z1.3) | 23% / 22% · 19n | +2 / +1 | 1.6/1.7 |
| L2b · KC hoàn toàn trên VWAP tuần | 635 | 57% (+5) | 48% (+5, z2.3) | 43% / 41% · 50n | +6 / +2 | 2.4/2.2 | 649 | 43% (+2) | 38% (+2, z1.0) | 35% / 34% · 50n | +2 / +1 | 1.7/1.8 |
| L3 · KC trên CẢ 2 VWAP | 1093 | 56% (+4) | 49% (+5, z3.7) | 34% / 33% · 19n | +7 / +3 | 2.3/2.2 | 1141 | 44% (+3) | 39% (+3, z1.9) | 24% / 24% · 20n | +2 / +3 | 1.7/1.7 |
| L4 · L1 + KC trên VWAP phiên | 744 | 55% (+3) | 48% (+5, z2.6) | 33% / 31% · 17n | +6 / +3 | 2.2/2.2 | 750 | 44% (+3) | 39% (+3, z1.8) | 24% / 23% · 20n | +3 / +2 | 1.7/1.6 |
| L5 · L1 + KC trên cả 2 VWAP | 744 | 55% (+3) | 48% (+5, z2.6) | 33% / 31% · 17n | +6 / +3 | 2.2/2.2 | 750 | 44% (+3) | 39% (+3, z1.8) | 24% / 23% · 20n | +3 / +2 | 1.7/1.6 |
| L6 · L5 + ATRBot xanh | 640 | 57% (+5) | 50% (+6, z3.2) | 35% / 33% · 19n | +8 / +4 | 2.3/2.2 | 659 | 44% (+3) | 39% (+3, z1.6) | 25% / 24% · 20n | +3 / +2 | 1.7/1.7 |
| L6x · L5 nhưng ATRBot ngược | 162 | 44% (-8) | 39% (-4, z-1.1) | 13% / 12% · 7n | -4 / -5 | 1.8/2.3 | 162 | 41% (+0) | 37% (+1, z0.2) | 10% / 10% · 9n | +2 / -3 | 1.7/1.5 |
| Thứ Hai · KC trên VWAP (1 đường) | 262 | 58% (+6) | 49% (+6, z1.9) | 36% / 36% · 20n | +5 / +7 | 2.6/2.2 | 278 | 46% (+5) | 40% (+4, z1.3) | 26% / 25% · 19n | +3 / +6 | 1.7/2.0 |
| Thứ Hai · + ATRBot cùng hướng | 163 | 56% (+4) | 47% (+4, z1.0) | 39% / 37% · 23n | +5 / +2 | 2.6/2.5 | 183 | 43% (+2) | 39% (+3, z0.8) | 28% / 27% · 22n | -1 / +8 | 1.6/2.0 |
| ATRBot xanh (flip) | 407 | 57% (+5) | 47% (+4, z1.7) | 66% / 51% · 99n | +7 / +1 | 2.4/2.3 | 382 | 42% (+1) | 38% (+2, z0.8) | 57% / 48% · 106n | +4 / +0 | 1.6/1.5 |
| ATRBot flip khi KC đã trên cả 2 VWAP | 876 | 57% (+4) | 49% (+6, z3.3) | 36% / 34% · 20n | +8 / +3 | 2.3/2.2 | 925 | 43% (+2) | 39% (+3, z1.7) | 26% / 25% · 21n | +2 / +4 | 1.7/1.7 |
| ATRBot flip khi KC ngược phía VWAP phiên | 1027 | 48% (-4) | 40% (-3, z-2.2) | 11% / 10% · 11n | -2 / -5 | 1.8/2.3 | 988 | 40% (-1) | 37% (+1, z0.8) | 6% / 6% · 10n | +1 / +2 | 1.5/1.6 |

## 3. Trạng thái "KC dưới/trên cả 2 VWAP + cấu trúc VWAP + ATRBot" — vào giữa chừng thì sao?

Không đo nến đầu tiên mà đo **mọi nến** đang ở trạng thái L6, chia theo trạng thái đã kéo dài bao lâu. Cho biết đến muộn có còn kịp không. (Các nến chồng lấn nhau nên n lớn nhưng không độc lập.)

| Trạng thái L6 | IMXUSDT n nến | Win 12h | Sạch 12h | SOLUSDT n nến | Win 12h | Sạch 12h |
|---|---|---|---|---|---|---|
| Giảm · đã 0–3 nến | 2900 | 56% (+1) | 45% (-1) | 2638 | 49% (+7) | 43% (+6) |
| Giảm · đã 4–15 nến | 5849 | 58% (+3) | 48% (+2) | 5284 | 45% (+3) | 39% (+2) |
| Giảm · đã 16–47 nến | 7034 | 56% (+0) | 48% (+1) | 5848 | 44% (+2) | 38% (+1) |
| Giảm · đã ≥48 nến | 1802 | 50% (-5) | 42% (-4) | 1011 | 39% (-3) | 35% (-2) |
| Tăng · đã 0–3 nến | 2160 | 57% (+5) | 50% (+6) | 2324 | 44% (+3) | 40% (+4) |
| Tăng · đã 4–15 nến | 4164 | 58% (+6) | 51% (+8) | 4668 | 45% (+4) | 40% (+4) |
| Tăng · đã 16–47 nến | 4549 | 56% (+4) | 48% (+4) | 5054 | 46% (+5) | 40% (+4) |
| Tăng · đã ≥48 nến | 969 | 59% (+7) | 47% (+4) | 1329 | 51% (+10) | 46% (+10) |

## 4. Event L6 theo cửa sổ thời gian

| Event L6 | n | Trong 4h | Trong 12h | Trong 24h |
|---|---|---|---|---|
| Giảm · IMXUSDT | 834 | 28% (-1) · sạch 26% (-1) | 56% (+1) · sạch 47% (+1) | 69% (+1) · sạch 51% (+0) |
| Giảm · SOLUSDT | 771 | 26% (+6) · sạch 24% (+6) | 48% (+6) · sạch 42% (+5) | 59% (+3) · sạch 49% (+3) |
| Tăng · IMXUSDT | 640 | 33% (+4) · sạch 32% (+5) | 57% (+5) · sạch 50% (+6) | 66% (+1) · sạch 52% (+5) |
| Tăng · SOLUSDT | 659 | 20% (+2) · sạch 20% (+2) | 44% (+3) · sạch 39% (+3) | 56% (+0) · sạch 47% (+3) |

## 5. Bracket ±2% trong 12h: thắng trước / thua trước / không chạm

Kỳ vọng thô = 2% × (thắng − thua), **chưa trừ phí** (~0.10% khứ hồi futures). Phần "không chạm" tính 0.

| Event | IMXUSDT n | Thắng trước | Thua trước | Không chạm | Kỳ vọng thô | SOLUSDT n | Thắng trước | Thua trước | Không chạm | Kỳ vọng thô |
|---|---|---|---|---|---|---|---|---|---|---|
| Giảm · Nến bất kỳ (base) | 99249 | 46% | 43% | 10% | 0.06% | 99249 | 37% | 36% | 27% | 0.02% |
| Giảm · L3 · KC dưới cả 2 VWAP | 1379 | 48% | 40% | 12% | 0.15% | 1266 | 41% | 33% | 25% | 0.15% |
| Giảm · L6 · + cấu trúc VWAP + ATRBot cùng hướng | 835 | 47% | 42% | 11% | 0.09% | 772 | 42% | 33% | 24% | 0.18% |
| Giảm · L6x · ATRBot ngược | 246 | 46% | 37% | 18% | 0.18% | 232 | 34% | 31% | 35% | 0.08% |
| Giảm · ATRBot flip khi KC đã dưới cả 2 VWAP | 1127 | 48% | 41% | 11% | 0.14% | 1021 | 42% | 33% | 25% | 0.19% |
| Tăng · Nến bất kỳ (base) | 99249 | 43% | 46% | 10% | -0.06% | 99249 | 36% | 37% | 27% | -0.02% |
| Tăng · L3 · KC trên cả 2 VWAP | 1093 | 49% | 43% | 9% | 0.12% | 1143 | 39% | 37% | 24% | 0.02% |
| Tăng · L6 · + cấu trúc VWAP + ATRBot cùng hướng | 640 | 50% | 42% | 9% | 0.16% | 659 | 39% | 37% | 24% | 0.04% |
| Tăng · L6x · ATRBot ngược | 162 | 39% | 51% | 10% | -0.23% | 162 | 37% | 36% | 27% | 0.02% |
| Tăng · ATRBot flip khi KC đã trên cả 2 VWAP | 876 | 49% | 42% | 9% | 0.13% | 927 | 39% | 38% | 23% | 0.02% |
