# Khám phá bổ sung — futures 15m

## 1. Thị trường trending hay mean-reverting? (Variance Ratio)

VR(q) > 1: lợi nhuận có xu hướng tiếp diễn (trend-following có lợi). VR < 1: có xu hướng đảo chiều (mean-reversion có lợi). Đo trên log-return 15m.

| Symbol | Giai đoạn | VR(4) | VR(16) | VR(48) | VR(96) | VR(192) | VR(384) |
|---|---|---|---|---|---|---|---|
| IMXUSDT | toàn bộ | 0.94 | 0.90 | 0.88 | 0.84 | 0.82 | 0.78 |
| IMXUSDT | 60% đầu | 0.97 | 0.94 | 0.94 | 0.92 | 0.88 | 0.86 |
| IMXUSDT | 40% cuối | 0.89 | 0.83 | 0.77 | 0.71 | 0.72 | 0.66 |
| SOLUSDT | toàn bộ | 0.96 | 0.91 | 0.89 | 0.89 | 0.86 | 0.84 |
| SOLUSDT | 60% đầu | 0.96 | 0.90 | 0.88 | 0.87 | 0.83 | 0.82 |
| SOLUSDT | 40% cuối | 0.96 | 0.93 | 0.93 | 0.94 | 0.93 | 0.89 |

## 2. ATRBot flip 15m theo bối cảnh mở rộng (lợi nhuận theo hướng, đã trừ drift, H48, bps)

| Điều kiện | IMXUSDT n | H16 | H48 (t) | H96 | IS/OOS H48 | SOLUSDT n | H16 | H48 (t) | H96 | IS/OOS H48 |
|---|---|---|---|---|---|---|---|---|---|---|
| Tất cả | 791 | 4.7 | 11.8 (0.83) | -10.6 | 39.0/-23.3 | 726 | -2.0 | 3.9 (0.37) | 5.8 | 9.6/-3.7 |
| ATRBot 1h cùng hướng | 306 | -6.3 | 24.1 (0.96) | -8.5 | 47.1/-3.6 | 266 | -17.6 | -21.5 (-1.23) | 7.9 | 0.6/-51.8 |
| ATRBot 1h ngược hướng | 485 | 11.6 | 4.1 (0.24) | -11.9 | 34.1/-36.6 | 460 | 7.0 | 18.6 (1.40) | 4.5 | 14.9/23.6 |
| ATRBot 4h cùng hướng | 375 | 15.6 | 54.4 (2.64) | 23.4 | 58.6/49.0 | 343 | 3.3 | 11.1 (0.73) | -0.3 | 28.2/-11.5 |
| ATRBot 4h ngược hướng | 416 | -5.2 | -26.5 (-1.37) | -41.2 | 21.5/-89.5 | 383 | -6.7 | -2.5 (-0.17) | 11.2 | -6.7/3.4 |
| 1h + 4h cùng hướng | 193 | -3.7 | 59.1 (1.81) | 15.3 | 47.0/73.1 | 178 | -6.4 | -25.9 (-1.17) | 3.5 | -11.0/-47.7 |
| Biến động thấp (rank < 33%) | 249 | 17.9 | 16.9 (0.74) | 6.3 | 39.3/-13.7 | 227 | -9.6 | -24.7 (-1.35) | -19.3 | -12.0/-44.0 |
| Biến động TB (33-66%) | 250 | 7.3 | -1.7 (-0.08) | 3.6 | 37.9/-46.0 | 236 | 8.4 | 37.2 (2.14) | 58.4 | 49.4/22.2 |
| Biến động cao (rank ≥ 66%) | 292 | -8.9 | 19.0 (0.70) | -37.1 | 39.6/-9.6 | 263 | -4.8 | -1.2 (-0.06) | -19.8 | -5.1/4.0 |

## 3. Backtest giả thuyết mới (phí 0.050%/chiều)

| Giả thuyết | Chiều | IMXUSDT n | Win | Avg bps | PF | t | IS/OOS | vs drift | SOLUSDT n | Win | Avg bps | PF | t | IS/OOS | vs drift |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FLIP + 4h cùng hướng, exit flip | LONG | 137 | 34% | 0.4 | 1.00 | 0.01 | 11.7/-20.6 | 9.9 | 175 | 37% | 5.0 | 1.03 | 0.15 | 19.0/-12.0 | -13.2 |
| FLIP + 4h cùng hướng, exit flip | SHORT | 239 | 37% | 31.3 | 1.17 | 0.85 | 79.2/-17.9 | 20.7 | 169 | 37% | -4.7 | 0.97 | -0.13 | -32.5/34.5 | 13.1 |
| FLIP + 4h + wVWAP, exit flip | LONG | 107 | 36% | -9.7 | 0.95 | -0.18 | 17.8/-66.3 | -0.3 | 134 | 36% | 9.5 | 1.06 | 0.24 | 34.0/-19.0 | -9.2 |
| FLIP + 4h + wVWAP, exit flip | SHORT | 178 | 39% | 48.2 | 1.27 | 1.11 | 83.8/17.9 | 37.6 | 137 | 36% | 7.2 | 1.04 | 0.17 | -42.8/71.4 | 25.2 |
| FLIP + 1h + 4h, exit flip | LONG | 65 | 40% | 78.1 | 1.41 | 0.90 | 53.9/128.7 | 88.7 | 85 | 38% | -9.4 | 0.95 | -0.20 | 9.6/-34.1 | -27.5 |
| FLIP + 1h + 4h, exit flip | SHORT | 129 | 36% | 27.7 | 1.14 | 0.51 | 43.1/14.3 | 17.5 | 94 | 33% | 4.0 | 1.02 | 0.07 | -44.7/82.5 | 21.4 |
| Theo ATRBot 4h (vào khi 15m flip cùng 4h), exit khi 4h đổi | LONG | 20 | 45% | -168.1 | 0.76 | -0.52 | -159.0/-185.0 | -30.2 | 22 | 45% | 217.8 | 1.47 | 0.68 | 284.0/76.1 | -61.2 |
| Theo ATRBot 4h (vào khi 15m flip cùng 4h), exit khi 4h đổi | SHORT | 20 | 60% | 1036.1 | 4.34 | 2.28 | 851.8/1378.4 | 809.5 | 24 | 33% | -63.4 | 0.90 | -0.21 | -374.9/559.7 | 177.8 |
| Extension: bot cùng hướng, giá cách wVWAP 6-12 ATR, giữ 16 | LONG | 328 | 43% | -15.3 | 0.82 | -1.31 | -15.1/-15.7 | -13.9 | 335 | 42% | -3.7 | 0.94 | -0.41 | 17.9/-38.6 | -6.0 |
| Extension: bot cùng hướng, giá cách wVWAP 6-12 ATR, giữ 16 | SHORT | 412 | 45% | -25.7 | 0.72 | -2.31 | -27.9/-22.9 | -27.1 | 393 | 43% | -14.6 | 0.80 | -1.56 | -27.2/0.5 | -12.2 |
| Extension: … giữ 48 | LONG | 235 | 43% | -43.6 | 0.73 | -1.95 | -50.9/-30.5 | -39.6 | 227 | 49% | 8.6 | 1.08 | 0.42 | 38.1/-44.7 | 1.8 |
| Extension: … giữ 48 | SHORT | 286 | 51% | -23.3 | 0.85 | -0.99 | -36.6/-6.6 | -27.3 | 259 | 47% | 3.0 | 1.03 | 0.15 | -8.7/16.3 | 9.8 |
| Extension: … exit flip + stop trail2 | LONG | 232 | 28% | -6.5 | 0.95 | -0.25 | -7.0/-5.6 | -2.5 | 233 | 28% | 2.4 | 1.03 | 0.13 | 7.2/-6.1 | -4.7 |
| Extension: … exit flip + stop trail2 | SHORT | 291 | 27% | -5.1 | 0.96 | -0.23 | 14.0/-30.6 | -9.1 | 273 | 27% | -1.7 | 0.98 | -0.10 | -18.2/17.5 | 5.1 |
| Bot cùng hướng nhưng giá phía sai wVWAP → đánh NGƯỢC bot, giữ 48 | LONG | 422 | 50% | 4.6 | 1.03 | 0.24 | 13.4/-7.4 | 8.7 | 377 | 49% | -6.3 | 0.94 | -0.39 | -1.7/-13.2 | -13.1 |
| Bot cùng hướng nhưng giá phía sai wVWAP → đánh NGƯỢC bot, giữ 48 | SHORT | 383 | 51% | -19.4 | 0.88 | -0.94 | -32.7/-3.2 | -23.4 | 389 | 48% | -13.6 | 0.88 | -0.91 | -14.1/-13.1 | -6.8 |

## 4. Tần suất tín hiệu và chi phí

| Symbol | % nến đóng ngoài KC(9,0.5) | Lần phá KC / ngày | Lần cắt dVWAP / ngày | ATRBot flip / ngày |
|---|---|---|---|---|
| IMXUSDT | 53% | 16.5 | 9.7 | 0.78 |
| SOLUSDT | 51% | 16.5 | 10.4 | 0.71 |

## 5. Mean-reversion: fade độ lệch khỏi VWAP (vì VR < 1)

Vào khi close lần đầu lệch quá k·ATR khỏi anchor (ngược hướng lệch). Thoát khi close về tới anchor, hoặc hết T nến. Stop thảm hoạ = thêm k·ATR nữa tính từ giá vào. Filter bot: `pullback` = ATRBot cùng hướng lệnh (mua dip trong trend xanh), `counter` = ATRBot ngược hướng lệnh.

### 5a. Cấu hình dương ở cả IS & OOS trên cả 2 symbol: 1/96

| Cấu hình | IMXUSDT n | Win | Avg bps | PF | t | IS/OOS | vs drift | SOLUSDT n | Win | Avg bps | PF | t | IS/OOS | vs drift |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SHORT wVWAP k4 pullback T48 | 115 | 58% | 26.2 | 1.23 | 0.96 | 14.2/48.6 | 23.8 | 79 | 52% | 14.2 | 1.16 | 0.54 | 9.5/26.6 | 18.7 |

### 5b. Ablation filter ATRBot trong mean-reversion (TB avg bps trên mọi anchor × k × T)

| Filter | IMXUSDT avg bps | # dương | SOLUSDT avg bps | # dương |
|---|---|---|---|---|
| LONG - | -22.6 | 0/16 | -13.5 | 4/16 |
| SHORT - | -27.8 | 4/16 | -27.6 | 4/16 |
| LONG pullback | -41.0 | 3/16 | -18.2 | 1/14 |
| SHORT pullback | -106.4 | 4/16 | -103.0 | 4/16 |
| LONG counter | -20.8 | 4/16 | -12.2 | 6/16 |
| SHORT counter | -31.0 | 3/16 | -26.5 | 4/16 |
