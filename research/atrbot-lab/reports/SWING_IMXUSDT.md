# Chiến thuật từ cách đọc chart — IMXUSDT (kiểm tra chéo SOLUSDT), khung nắm giữ 12–24h

**Điểm nhiệt kế** (đọc theo mỗi hướng, rồi lấy long − short, từ −4 đến +4): +1 KC trọn phía VWAP phiên · +1 KC trọn phía VWAP tuần · +1 VWAP phiên nằm phía đó so với VWAP tuần (thứ Hai = 0) · +1 ATRBot cùng hướng.

## 1. Nhiệt kế: điểm càng cao thì giá có đi theo hướng đó nhiều hơn không?

Lấy mẫu **mỗi 16 nến một lần** (không chồng lấn quá nhiều). "Lên 24h" = lợi nhuận close→close sau 96 nến, trừ drift. Bracket ±2%/24h: tỉ lệ +2% trước trừ tỉ lệ −2% trước, theo hướng **tăng**.

| Score | IMXUSDT n | Lên 24h bps (t) | IS / OOS bps | Bracket ±2% (tăng) | SOLUSDT n | Lên 24h bps (t) | IS / OOS bps | Bracket ±2% (tăng) |
|---|---|---|---|---|---|---|---|---|
| -4 | 1051 | 9.4 (t 0.54) | -6.7 / 32.4 | 46%−53% = -7 | 902 | -2.2 (t -0.16) | 8.2 / -15.5 | 41%−50% = -8 |
| -3 | 916 | -19.9 (t -1.02) | -13.5 / -28.2 | 45%−54% = -9 | 928 | -4.1 (t -0.28) | -11.3 / 5.8 | 43%−49% = -6 |
| -2 | 666 | 7.5 (t 0.37) | 8.5 / 6.3 | 46%−52% = -6 | 605 | -20.0 (t -1.15) | -13.2 / -30.5 | 44%−46% = -2 |
| -1 | 492 | -9.2 (t -0.43) | 6.1 / -30.9 | 47%−51% = -4 | 514 | -24.6 (t -1.27) | -29.5 / -18.5 | 42%−46% = -5 |
| 0 | 541 | 0.7 (t 0.03) | 34.3 / -48.6 | 44%−54% = -9 | 502 | 0.2 (t 0.01) | 7.5 / -9.9 | 41%−48% = -8 |
| +1 | 434 | -25.4 (t -1.03) | 4.2 / -66.1 | 45%−51% = -6 | 451 | -0.4 (t -0.02) | 22.0 / -37.7 | 45%−45% = -0 |
| +2 | 561 | 8.6 (t 0.42) | -9.0 / 41.2 | 47%−50% = -3 | 560 | 2.3 (t 0.13) | 31.3 / -48.6 | 45%−48% = -4 |
| +3 | 792 | -10.7 (t -0.57) | -4.4 / -22.1 | 47%−53% = -6 | 898 | -17.1 (t -1.26) | 15.0 / -70.1 | 47%−46% = 1 |
| +4 | 748 | 29.7 (t 1.57) | 32.1 / 25.5 | 51%−47% = 5 | 841 | 53.1 (t 3.63) | 80.1 / 4.5 | 51%−41% = 11 |

## 2. Chiến thuật: event → lệnh chờ → stop/TP rộng, giữ 12–24h

Phí maker 0.02% / taker 0.05%, stop và lệnh market trượt 1 tick, limit phải xuyên 1 tick mới khớp. Lệnh chờ bị huỷ khi ATRBot đổi chiều. 864 cấu hình.

**Trigger:** `S4` score chạm ±4 (đủ cả 4 điều kiện); `S3` score chạm ±3 trở lên; `KB` KC trọn phía cả 2 VWAP + ATRBot cùng hướng (bỏ thứ tự VWAP)
**Entry:** `MKT` Market ngay nến kế; `BASIS` Limit tại KC basis, chờ tối đa 16 nến; `DVWAP` Limit tại VWAP phiên, chờ tối đa 32 nến
**Stop:** `P2` stop 2%; `P3` stop 3%; `A3` stop 3 ATR; `A5` stop 5 ATR; TP = 1 / 1.5 × stop; giữ tối đa 48 / 96 nến.
**Exit thêm:** `NONE` chỉ stop/TP/time; `VETO` thoát khi ATRBot đổi chiều; `SCORE` thoát khi score về 0 hoặc ngược

### 2a. Đóng góp từng thành phần (trung bình avg net bps toàn bộ dữ liệu)

| Thành phần | Chiều | n TB | IMXUSDT IS | IMXUSDT OOS | SOLUSDT | # dương |
|---|---|---|---|---|---|---|
| trig = S4 | LONG | 393 | -11.1 | -40.9 | -0.9 | 0/144 |
| trig = S4 | SHORT | 504 | 15.4 | -27.9 | 7.3 | 55/144 |
| trig = S3 | LONG | 537 | 2.9 | -15.9 | -2.1 | 36/144 |
| trig = S3 | SHORT | 604 | 15.0 | -22.1 | 7.3 | 77/144 |
| trig = KB | LONG | 561 | -0.7 | -36.4 | -6.0 | 3/144 |
| trig = KB | SHORT | 677 | 20.0 | -22.5 | 8.8 | 91/144 |
| entry = MKT | LONG | 548 | -2.6 | -22.8 | -3.3 | 12/144 |
| entry = MKT | SHORT | 658 | 19.4 | -24.2 | 4.5 | 86/144 |
| entry = BASIS | LONG | 507 | -3.0 | -21.9 | -1.3 | 25/144 |
| entry = BASIS | SHORT | 622 | 21.1 | -21.9 | 8.4 | 95/144 |
| entry = DVWAP | LONG | 435 | -3.3 | -48.7 | -4.5 | 2/144 |
| entry = DVWAP | SHORT | 504 | 9.9 | -26.4 | 10.5 | 42/144 |
| stop = P2 | LONG | 547 | -1.6 | -25.9 | -3.4 | 7/108 |
| stop = P2 | SHORT | 646 | 15.7 | -19.0 | 4.6 | 72/108 |
| stop = P3 | LONG | 480 | 0.7 | -34.0 | -1.4 | 11/108 |
| stop = P3 | SHORT | 568 | 27.7 | -27.4 | 9.8 | 82/108 |
| stop = A3 | LONG | 516 | -4.3 | -31.4 | -4.5 | 2/108 |
| stop = A3 | SHORT | 628 | 10.4 | -26.2 | 9.1 | 25/108 |
| stop = A5 | LONG | 445 | -6.8 | -33.2 | -2.8 | 19/108 |
| stop = A5 | SHORT | 537 | 13.4 | -24.0 | 7.6 | 44/108 |
| rr = 1 | LONG | 509 | -3.8 | -32.8 | -3.6 | 10/216 |
| rr = 1 | SHORT | 611 | 13.2 | -20.6 | 7.4 | 98/216 |
| rr = 1.5 | LONG | 484 | -2.1 | -29.4 | -2.4 | 29/216 |
| rr = 1.5 | SHORT | 579 | 20.4 | -27.6 | 8.1 | 125/216 |
| hold = 48 | LONG | 515 | -4.1 | -30.4 | -5.9 | 21/216 |
| hold = 48 | SHORT | 621 | 13.9 | -23.3 | 6.2 | 102/216 |
| hold = 96 | LONG | 479 | -1.8 | -31.8 | -0.2 | 18/216 |
| hold = 96 | SHORT | 569 | 19.7 | -25.0 | 9.4 | 121/216 |
| exit = NONE | LONG | 492 | -5.9 | -35.2 | -3.8 | 4/144 |
| exit = NONE | SHORT | 590 | 15.3 | -25.1 | 7.7 | 64/144 |
| exit = VETO | LONG | 494 | -4.1 | -32.5 | -2.3 | 11/144 |
| exit = VETO | SHORT | 592 | 15.2 | -23.5 | 8.9 | 71/144 |
| exit = SCORE | LONG | 505 | 1.0 | -25.6 | -2.9 | 24/144 |
| exit = SCORE | SHORT | 602 | 19.9 | -23.9 | 6.7 | 88/144 |

### 2b. Top 15 theo t-stat IS (n IS ≥ 40) — OOS và SOLUSDT là phép thử

| Cấu hình | IS n | IS win | IS avg bps | IS PF | IS t | OOS n | OOS win | OOS avg bps | OOS PF | SOLUSDT n | SOLUSDT avg bps | SOLUSDT PF |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| SHORT KB·BASIS·P3·1.5R·96·SCORE | 369 | 46% | 52.5 | 1.40 | 3.02 | 260 | 35% | -32.8 | 0.78 | 540 | 17.4 | 1.15 |
| SHORT KB·MKT·P3·1.5R·48·SCORE | 445 | 51% | 42.5 | 1.36 | 2.93 | 319 | 43% | -24.7 | 0.81 | 678 | 0.2 | 1.00 |
| SHORT KB·MKT·P3·1.5R·48·NONE | 431 | 52% | 42.0 | 1.34 | 2.78 | 314 | 45% | -29.0 | 0.79 | 658 | 2.8 | 1.03 |
| SHORT KB·MKT·P3·1.5R·96·SCORE | 393 | 47% | 47.1 | 1.35 | 2.76 | 275 | 35% | -41.7 | 0.73 | 571 | 11.1 | 1.09 |
| SHORT KB·MKT·P3·1.5R·48·VETO | 431 | 51% | 41.1 | 1.34 | 2.73 | 315 | 44% | -24.9 | 0.81 | 658 | 4.0 | 1.04 |
| SHORT S4·BASIS·P3·1.5R·96·SCORE | 260 | 49% | 57.1 | 1.43 | 2.70 | 197 | 37% | -44.3 | 0.72 | 402 | 12.8 | 1.11 |
| SHORT KB·BASIS·P3·1.5R·48·SCORE | 414 | 49% | 38.8 | 1.34 | 2.65 | 302 | 43% | -19.5 | 0.84 | 636 | 5.3 | 1.05 |
| SHORT KB·BASIS·P3·1.5R·96·VETO | 354 | 48% | 48.4 | 1.34 | 2.62 | 248 | 36% | -41.5 | 0.74 | 506 | 22.4 | 1.19 |
| SHORT KB·BASIS·P3·1.5R·96·NONE | 354 | 49% | 48.5 | 1.33 | 2.58 | 246 | 39% | -42.5 | 0.74 | 499 | 24.5 | 1.19 |
| SHORT KB·MKT·P3·1.5R·96·VETO | 383 | 47% | 45.7 | 1.32 | 2.55 | 263 | 37% | -41.5 | 0.75 | 539 | 14.3 | 1.11 |
| SHORT KB·MKT·P2·1.5R·48·NONE | 488 | 49% | 26.9 | 1.27 | 2.52 | 346 | 42% | -21.1 | 0.81 | 719 | 2.1 | 1.02 |
| SHORT KB·BASIS·P2·1.5R·48·SCORE | 458 | 48% | 26.9 | 1.28 | 2.52 | 335 | 41% | -15.4 | 0.86 | 688 | 4.2 | 1.05 |
| SHORT KB·MKT·P2·1.5R·48·SCORE | 494 | 49% | 26.3 | 1.27 | 2.52 | 351 | 40% | -21.2 | 0.81 | 732 | 0.5 | 1.01 |
| SHORT KB·MKT·P3·1.5R·96·NONE | 383 | 48% | 45.3 | 1.31 | 2.49 | 261 | 39% | -43.9 | 0.74 | 533 | 16.4 | 1.13 |
| SHORT KB·BASIS·P2·1.5R·96·NONE | 425 | 48% | 29.9 | 1.28 | 2.47 | 303 | 39% | -15.6 | 0.88 | 603 | 7.9 | 1.07 |

→ Top 15 theo IS: **0/15 dương ở OOS**, **15/15 dương trên SOLUSDT**, **0/15 dương cả hai**.

### 2c. Dương ở cả IS, OOS và SOLUSDT: 7/864

(Đã nhìn OOS nên có thiên lệch chọn lọc — chỉ để thấy vùng nào ổn định.)

| Cấu hình | IS n | IS win | IS avg bps | IS PF | IS t | OOS n | OOS win | OOS avg bps | OOS PF | SOLUSDT n | SOLUSDT avg bps | SOLUSDT PF |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| LONG S3·BASIS·A5·1.5R·96·SCORE | 280 | 40% | 31.8 | 1.21 | 1.29 | 181 | 36% | 16.7 | 1.12 | 468 | 9.3 | 1.08 |
| SHORT S4·BASIS·A5·1R·96·SCORE | 254 | 52% | 26.5 | 1.17 | 1.15 | 200 | 49% | 1.3 | 1.01 | 405 | 9.9 | 1.08 |
| SHORT S4·BASIS·A5·1R·96·VETO | 254 | 52% | 16.6 | 1.10 | 0.70 | 200 | 48% | 0.4 | 1.00 | 399 | 8.6 | 1.07 |
| LONG S3·BASIS·A5·1.5R·96·VETO | 267 | 41% | 14.3 | 1.08 | 0.53 | 170 | 39% | 0.2 | 1.00 | 446 | 10.3 | 1.08 |
| LONG S3·BASIS·P2·1.5R·48·SCORE | 376 | 41% | 7.7 | 1.07 | 0.65 | 224 | 41% | 2.6 | 1.03 | 587 | 2.1 | 1.02 |
| LONG S3·BASIS·P2·1.5R·48·VETO | 372 | 41% | 7.0 | 1.07 | 0.59 | 220 | 42% | 1.8 | 1.02 | 576 | 1.6 | 1.02 |
| LONG S3·BASIS·A5·1R·96·SCORE | 296 | 44% | 7.8 | 1.05 | 0.39 | 194 | 42% | 8.4 | 1.06 | 491 | 2.1 | 1.02 |

Tần suất thành phần trong nhóm bền: entry=BASIS (7), trig=S3 (5), stop=A5 (5), hold=96 (5), side=1 (5), rr=1.5 (4), exit=SCORE (4), rr=1 (3), exit=VETO (3), trig=S4 (2), side=-1 (2), stop=P2 (2), hold=48 (2)

## 3. So với cùng cách quản lý lệnh nhưng **vào ngẫu nhiên**

Giữ nguyên entry/stop/TP/time/exit, chỉ thay trigger bằng nến ngẫu nhiên (cùng số event). 300 lần mô phỏng mỗi cấu hình. p = tỉ lệ ngẫu nhiên ≥ thực tế.

| Cấu hình | IMXUSDT n | avg bps | p | SOLUSDT n | avg bps | p |
|---|---|---|---|---|---|---|
| LONG S3·BASIS·A5·1.5R·96·SCORE | 461 | 25.9 | 0.023 | 468 | 9.3 | 0.253 |
| SHORT S4·BASIS·A5·1R·96·SCORE | 454 | 15.4 | 0.167 | 405 | 9.9 | 0.273 |
| SHORT S4·BASIS·A5·1R·96·VETO | 454 | 9.5 | 0.370 | 399 | 8.6 | 0.247 |
| LONG S3·BASIS·A5·1.5R·96·VETO | 437 | 8.8 | 0.083 | 446 | 10.3 | 0.327 |
| LONG S3·BASIS·P2·1.5R·48·SCORE | 600 | 5.8 | 0.033 | 587 | 2.1 | 0.183 |
| LONG S3·BASIS·P2·1.5R·48·VETO | 592 | 5.1 | 0.027 | 576 | 1.6 | 0.297 |

## 4. Chi tiết: LONG S3·BASIS·A5·1.5R·96·SCORE

### IMXUSDT: n=461, win 39%, avg 25.9 bps, PF 1.17, tổng 119.3%, maxDD 55.0%, giữ TB 48 nến. Thoát: tp 26%, signal 61%, stop 14%

| Nửa năm | n | Win | Avg bps | PF | Tổng |
|---|---|---|---|---|---|
| 2023H2 | 8 | 50% | 166.1 | 2.20 | 13.3% |
| 2024H1 | 79 | 37% | -13.1 | 0.92 | -10.3% |
| 2024H2 | 82 | 41% | 53.8 | 1.36 | 44.1% |
| 2025H1 | 78 | 44% | 49.8 | 1.31 | 38.9% |
| 2025H2 | 86 | 33% | -22.2 | 0.87 | -19.1% |
| 2026H1 | 83 | 40% | 40.9 | 1.34 | 34.0% |
| 2026H2 | 45 | 38% | 41.0 | 1.36 | 18.5% |

### SOLUSDT: n=468, win 40%, avg 9.3 bps, PF 1.08, tổng 43.5%, maxDD 72.5%, giữ TB 50 nến. Thoát: signal 60%, tp 24%, stop 16%

| Nửa năm | n | Win | Avg bps | PF | Tổng |
|---|---|---|---|---|---|
| 2023H2 | 4 | 75% | 165.3 | 3.96 | 6.6% |
| 2024H1 | 90 | 42% | 39.9 | 1.29 | 35.9% |
| 2024H2 | 90 | 40% | 7.1 | 1.06 | 6.4% |
| 2025H1 | 78 | 42% | 17.6 | 1.13 | 13.8% |
| 2025H2 | 84 | 31% | -48.7 | 0.63 | -40.9% |
| 2026H1 | 76 | 42% | 12.1 | 1.14 | 9.2% |
| 2026H2 | 46 | 41% | 27.2 | 1.35 | 12.5% |
