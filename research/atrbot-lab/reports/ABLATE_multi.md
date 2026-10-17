# Ablation: thành phần nào trong cách đọc chart thực sự đóng góp?

Chiến thuật H3 (vào market khi tất cả điều kiện của dòng cùng đúng, giữ 48 nến kể từ lần cuối còn đúng, không stop), 12 coin kiểm định: ADAUSDT, ARBUSDT, AVAXUSDT, BNBUSDT, BTCUSDT, DOGEUSDT, ETHUSDT, LINKUSDT, NEARUSDT, OPUSDT, SUIUSDT, XRPUSDT. Excess = so với vào ngẫu nhiên cùng tần suất, giữ cố định bằng số nến giữ TB (50 lần mô phỏng).

| Điều kiện | LONG lệnh/coin | LONG avg bps | LONG excess (t, # coin) | LONG IS / OOS | SHORT lệnh/coin | SHORT avg bps | SHORT excess (t, # coin) | SHORT IS / OOS |
|---|---|---|---|---|---|---|---|---|
| `DWOB` Đủ 4 (= score ±4) | 263 | 43.5 | 35.4 (t 5.21, 11/12) | 67.0 / 8.5 | 297 | 7.6 | 16.6 (t 3.96, 11/12) | 7.5 / 8.3 |
| `DWO` Bỏ ATRBot | 227 | 45.6 | 35.2 (t 4.32, 12/12) | 72.9 / 3.6 | 252 | 4.9 | 17.5 (t 3.72, 11/12) | 4.1 / 5.7 |
| `DWB` Bỏ thứ tự VWAP | 340 | 33.4 | 25.0 (t 4.04, 11/12) | 63.5 / -10.5 | 366 | -2.3 | 7.4 (t 2.12, 8/12) | -9.8 / 8.4 |
| `DOB` Bỏ KC vs VWAP tuần | 263 | 43.5 | 36.4 (t 5.04, 11/12) | 67.0 / 8.5 | 297 | 7.6 | 19.1 (t 4.70, 11/12) | 7.5 / 8.3 |
| `WOB` Bỏ KC vs VWAP phiên | 245 | 49.3 | 28.7 (t 3.19, 10/12) | 81.5 / 1.0 | 254 | 15.6 | 23.1 (t 6.06, 12/12) | 15.1 / 17.9 |
| `DW` Chỉ KC trọn phía cả 2 VWAP | 269 | 37.5 | 25.6 (t 3.30, 9/12) | 63.1 / -0.7 | 298 | -9.8 | 0.6 (t 0.11, 7/12) | -20.0 / 5.0 |
| `D` Chỉ KC trọn phía VWAP phiên | 285 | 12.0 | 1.0 (t 0.14, 5/12) | 40.2 / -29.1 | 300 | -10.7 | -0.8 (t -0.11, 6/12) | -19.2 / 2.1 |
| `B` Chỉ ATRBot | 314 | 21.8 | 0.7 (t 0.22, 6/12) | 59.3 / -32.7 | 302 | -10.2 | 3.6 (t 0.73, 7/12) | -35.2 / 28.9 |

`D` KC trọn phía VWAP phiên · `W` KC trọn phía VWAP tuần · `O` VWAP phiên nằm phía đó so với VWAP tuần (thứ Hai không tính) · `B` ATRBot cùng hướng.
