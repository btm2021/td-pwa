# Pattern từ cách đọc chart — 14 coin futures 15m, win = giá đi theo hướng ≥ 2% trước tín hiệu ngược

## Cách đọc báo cáo

- **Trạng thái nến** = `Xanh>Đỏ / Xanh<Đỏ / T2` (VWAP phiên so với VWAP tuần; thứ Hai 2 đường trùng nhau) · vị trí cả dải KC(9, 0.5) so với từng VWAP (`trên` = cả dải nằm trên, `dưới` = cả dải nằm dưới, `cắt` = dải chạm/cắt đường) · màu ATRBot.
- **Đoạn** = các nến liền nhau có cùng trạng thái. **Pattern** = 1, 2 hoặc 3 đoạn liên tiếp, đọc từ trái sang phải (`→`); lần xuất hiện được tính tại nến đầu tiên của đoạn cuối, đo từ close nến đó.
- **Không dùng mốc thời gian**: long được đo tới khi **cả dải KC nằm dưới VWAP phiên** (tín hiệu ngược rõ ràng), short tới khi **cả dải KC nằm trên VWAP phiên**. Chặn an toàn 1500 nến.
- **Win** (định nghĩa của bạn) = trong khoảng đó giá có lúc đi theo hướng ≥ 2% (max PnL).
- **PnL** = kết quả thật nếu làm đúng như vậy: **chốt khi giá đi được 2%**; nếu không đạt thì **thoát ở close nến có tín hiệu ngược** (có thể lời ít hoặc lỗ). Đã trừ 0.12% phí + trượt giá. Đây là chỉ số chính.
- **Δ PnL** = PnL của pattern − PnL nếu vào ở **nến bất kỳ** (cùng coin, cùng giai đoạn, cùng hướng, cùng cách thoát). Δ > 0 nghĩa là pattern cho thêm thông tin, không chỉ ăn theo cách thoát lệnh. Các lần xuất hiện chồng lên nhau trong cùng một coin chỉ tính lần đầu.
- **IS** = 60% dữ liệu đầu mỗi coin (dùng để **tìm** pattern, cần n ≥ 150); **OOS** = 40% cuối (dùng để **kiểm tra**). **# coin** = số coin có Δ PnL dương (trong số coin có ≥ 5 lần).

## 0. Mốc nền: nến bất kỳ (trung bình 14 coin)

| Hướng · giai đoạn | Win (≥ mục tiêu) | PnL TB (chốt mục tiêu / thoát ở TH ngược) | Nếu chỉ giữ tới TH ngược |
|---|---|---|---|
| LONG IS | 38% | -0.08% | 0.02% |
| LONG OOS | 29% | -0.21% | -0.21% |
| SHORT IS | 39% | -0.06% | -0.11% |
| SHORT OOS | 33% | -0.09% | -0.08% |

## 1. Bản đồ: mỗi trạng thái vừa xuất hiện nói gì? (pattern 1 đoạn)

### Đánh giá cho LONG

| Pattern | IS n | IS win | IS PnL TB | IS Δ PnL (t) | OOS n | OOS win | OOS PnL TB | OOS Δ PnL (t) | # coin | Thời gian TB (nến) | MFE / MAE TV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼ | 926 | 54% | +0.13% | +0.21% (2.8) | 568 | 37% | -0.32% | -0.11% (-1.4) | 9/14 | 41 | 1.8% / 1.6% |
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲ | 1099 | 51% | +0.10% | +0.18% (2.8) | 720 | 41% | -0.26% | -0.06% (-0.7) | 11/14 | 41 | 1.8% / 1.5% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼ | 1603 | 44% | +0.04% | +0.13% (2.3) | 998 | 38% | +0.05% | +0.26% (4.8) | 13/14 | 25 | 1.4% / 1.0% |
| Xanh<Đỏ · KC trên Xanh · KC trên Đỏ · Bot▲ | 972 | 46% | +0.01% | +0.09% (1.3) | 737 | 34% | -0.36% | -0.16% (-2.1) | 5/14 | 43 | 1.5% / 1.4% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼ | 1984 | 35% | +0.01% | +0.09% (2.4) | 1162 | 26% | -0.17% | +0.04% (0.8) | 9/14 | 22 | 1.0% / 0.9% |
| Xanh>Đỏ · KC trên Xanh · KC trên Đỏ · Bot▲ | 3428 | 47% | +0.00% | +0.08% (2.3) | 2053 | 36% | -0.19% | +0.02% (0.4) | 10/14 | 39 | 1.5% / 1.4% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲ | 5332 | 36% | -0.02% | +0.06% (2.6) | 3100 | 27% | -0.17% | +0.03% (1.2) | 10/14 | 19 | 1.0% / 0.9% |
| Xanh>Đỏ · KC trên Xanh · KC trên Đỏ · Bot▼ | 1182 | 42% | -0.07% | +0.01% (0.2) | 663 | 33% | -0.26% | -0.06% (-0.8) | 8/14 | 38 | 1.4% / 1.4% |
| Xanh<Đỏ · KC trên Xanh · KC cắt Đỏ · Bot▲ | 967 | 45% | -0.08% | +0.01% (0.1) | 795 | 33% | -0.40% | -0.19% (-2.6) | 7/14 | 40 | 1.4% / 1.4% |
| Xanh<Đỏ · KC trên Xanh · KC dưới Đỏ · Bot▲ | 1392 | 41% | -0.09% | -0.01% (-0.2) | 1231 | 29% | -0.40% | -0.19% (-3.7) | 3/14 | 39 | 1.2% / 1.3% |
| Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼ | 639 | 32% | -0.10% | -0.02% (-0.2) | 453 | 25% | -0.27% | -0.07% (-0.9) | 5/14 | 18 | 0.8% / 0.9% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▲ | 1881 | 28% | -0.11% | -0.03% (-0.8) | 1857 | 21% | -0.19% | +0.02% (0.6) | 6/14 | 15 | 0.7% / 0.8% |
| Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼ | 758 | 39% | -0.12% | -0.04% (-0.5) | 538 | 32% | -0.30% | -0.10% (-1.2) | 6/14 | 28 | 1.2% / 1.2% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲ | 1325 | 34% | -0.13% | -0.04% (-1.0) | 932 | 32% | -0.10% | +0.11% (2.1) | 8/14 | 18 | 1.0% / 1.0% |
| Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲ | 794 | 29% | -0.13% | -0.05% (-0.8) | 652 | 18% | -0.35% | -0.14% (-2.6) | 5/14 | 11 | 0.7% / 0.8% |
| Xanh<Đỏ · KC trên Xanh · KC cắt Đỏ · Bot▼ | 986 | 46% | -0.14% | -0.06% (-0.8) | 711 | 37% | -0.24% | -0.03% (-0.4) | 7/14 | 39 | 1.5% / 1.5% |
| Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲ | 612 | 32% | -0.16% | -0.08% (-1.1) | 559 | 23% | -0.31% | -0.10% (-1.5) | 3/14 | 17 | 0.9% / 1.0% |
| Xanh<Đỏ · KC trên Xanh · KC trên Đỏ · Bot▼ | 562 | 45% | -0.17% | -0.09% (-0.9) | 363 | 39% | -0.24% | -0.03% (-0.3) | 7/14 | 39 | 1.5% / 1.5% |
| Xanh<Đỏ · KC trên Xanh · KC dưới Đỏ · Bot▼ | 3388 | 42% | -0.18% | -0.10% (-2.7) | 2421 | 34% | -0.18% | +0.03% (0.8) | 4/14 | 37 | 1.4% / 1.3% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 6561 | 32% | -0.20% | -0.12% (-5.5) | 5155 | 27% | -0.16% | +0.05% (2.2) | 3/14 | 22 | 1.0% / 1.0% |

### Đánh giá cho SHORT

| Pattern | IS n | IS win | IS PnL TB | IS Δ PnL (t) | OOS n | OOS win | OOS PnL TB | OOS Δ PnL (t) | # coin | Thời gian TB (nến) | MFE / MAE TV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▲ | 815 | 50% | +0.10% | +0.16% (2.2) | 560 | 44% | +0.01% | +0.10% (1.2) | 11/14 | 38 | 1.8% / 1.3% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 5541 | 38% | +0.05% | +0.11% (4.9) | 4009 | 31% | -0.08% | +0.01% (0.2) | 12/14 | 20 | 1.1% / 0.8% |
| Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼ | 3547 | 50% | +0.05% | +0.11% (2.9) | 2733 | 42% | -0.06% | +0.04% (1.0) | 12/14 | 41 | 1.8% / 1.3% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲ | 1492 | 40% | +0.01% | +0.07% (1.4) | 1037 | 33% | -0.09% | +0.00% (0.1) | 9/14 | 22 | 1.2% / 1.0% |
| Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲ | 666 | 36% | -0.02% | +0.04% (0.5) | 611 | 33% | +0.08% | +0.17% (2.8) | 10/14 | 20 | 1.0% / 0.8% |
| T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼ | 1055 | 48% | -0.02% | +0.03% (0.5) | 680 | 41% | -0.18% | -0.09% (-1.1) | 6/14 | 36 | 1.8% / 1.4% |
| Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲ | 734 | 43% | -0.03% | +0.03% (0.4) | 605 | 39% | +0.15% | +0.24% (3.7) | 12/14 | 31 | 1.4% / 1.1% |
| Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼ | 614 | 38% | -0.04% | +0.02% (0.3) | 427 | 36% | +0.09% | +0.19% (2.5) | 9/14 | 21 | 1.2% / 0.9% |
| Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▲ | 1162 | 44% | -0.04% | +0.02% (0.3) | 1147 | 36% | -0.12% | -0.03% (-0.6) | 5/14 | 39 | 1.4% / 1.2% |
| Xanh>Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼ | 993 | 48% | -0.05% | +0.00% (0.0) | 657 | 40% | +0.00% | +0.09% (1.2) | 9/14 | 45 | 1.7% / 1.3% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▲ | 1992 | 34% | -0.08% | -0.02% (-0.6) | 1957 | 28% | -0.11% | -0.02% (-0.6) | 4/14 | 22 | 0.9% / 0.8% |
| Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▲ | 921 | 47% | -0.08% | -0.02% (-0.3) | 696 | 42% | -0.08% | +0.02% (0.2) | 8/14 | 44 | 1.8% / 1.4% |
| Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▼ | 1006 | 47% | -0.10% | -0.04% (-0.5) | 627 | 40% | -0.01% | +0.08% (1.0) | 5/14 | 44 | 1.6% / 1.3% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼ | 1975 | 30% | -0.12% | -0.06% (-1.5) | 1119 | 29% | +0.04% | +0.13% (3.1) | 8/14 | 17 | 0.9% / 0.8% |
| Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▼ | 1468 | 45% | -0.15% | -0.09% (-1.5) | 774 | 39% | +0.03% | +0.12% (1.8) | 6/14 | 45 | 1.6% / 1.4% |
| Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼ | 857 | 30% | -0.17% | -0.10% (-1.6) | 626 | 28% | +0.05% | +0.14% (2.6) | 7/14 | 12 | 0.8% / 0.7% |
| Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▲ | 3321 | 43% | -0.18% | -0.12% (-3.1) | 1765 | 37% | -0.11% | -0.01% (-0.3) | 3/14 | 39 | 1.5% / 1.3% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲ | 6614 | 34% | -0.18% | -0.12% (-5.4) | 3776 | 31% | -0.03% | +0.06% (2.2) | 1/14 | 22 | 1.1% / 0.9% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼ | 1470 | 35% | -0.20% | -0.14% (-2.9) | 924 | 25% | -0.43% | -0.33% (-6.3) | 1/14 | 16 | 1.0% / 1.1% |
| Xanh>Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▲ | 475 | 46% | -0.30% | -0.24% (-1.4) | 408 | 44% | -0.04% | +0.05% (0.5) | 5/14 | 47 | 1.7% / 1.5% |

## 2. Pattern lookback cho LONG — top 40 theo IS, 3/40 vượt kiểm tra OOS

Tiêu chí vượt: PnL TB > 0 **và** hơn nến bất kỳ (Δ PnL > 0) ở **cả IS và OOS**, OOS n ≥ 40, và ≥ 60% số coin có Δ PnL dương. (Đã thử 118 pattern long 2–3 đoạn đủ mẫu.)

### Vượt kiểm tra

| Pattern | IS n | IS win | IS PnL TB | IS Δ PnL (t) | OOS n | OOS win | OOS PnL TB | OOS Δ PnL (t) | # coin | Thời gian TB (nến) | MFE / MAE TV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼ | 689 | 42% | +0.06% | +0.15% (2.2) | 439 | 36% | +0.09% | +0.30% (4.0) | 11/14 | 24 | 1.3% / 1.0% |
| Xanh<Đỏ · KC trên Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC trên Xanh · KC cắt Đỏ · Bot▼  →  Xanh<Đỏ · KC trên Xanh · KC cắt Đỏ · Bot▲ | 164 | 54% | +0.11% | +0.20% (1.1) | 116 | 42% | +0.00% | +0.21% (1.1) | 10/14 | 44 | 1.9% / 1.4% |
| Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▼  →  Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼ | 176 | 35% | +0.02% | +0.10% (0.7) | 93 | 30% | +0.19% | +0.40% (2.8) | 11/14 | 24 | 1.1% / 0.8% |

### Không vượt (top IS nhưng hỏng ở OOS hoặc không đồng đều giữa các coin)

| Pattern | IS n | IS win | IS PnL TB | IS Δ PnL (t) | OOS n | OOS win | OOS PnL TB | OOS Δ PnL (t) | # coin | Thời gian TB (nến) | MFE / MAE TV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼ | 836 | 57% | +0.33% | +0.41% (5.8) | 512 | 37% | -0.35% | -0.14% (-1.6) | 12/14 | 43 | 2.0% / 1.5% |
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼ | 285 | 60% | +0.36% | +0.44% (3.6) | 152 | 41% | -0.02% | +0.19% (1.3) | 13/14 | 48 | 2.2% / 1.4% |
| T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼ | 528 | 54% | +0.24% | +0.33% (3.6) | 299 | 34% | -0.33% | -0.13% (-1.2) | 10/14 | 40 | 1.8% / 1.5% |
| Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▲  →  Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼ | 509 | 40% | +0.15% | +0.23% (3.2) | 243 | 29% | -0.14% | +0.05% (0.5) | 11/14 | 23 | 1.2% / 1.0% |
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲ | 513 | 55% | +0.23% | +0.31% (3.1) | 292 | 31% | -0.72% | -0.51% (-4.3) | 10/14 | 43 | 1.8% / 1.7% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲ | 511 | 55% | +0.23% | +0.31% (3.1) | 288 | 31% | -0.70% | -0.49% (-4.1) | 10/14 | 43 | 1.8% / 1.7% |
| Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼ | 1359 | 35% | +0.03% | +0.11% (2.6) | 704 | 28% | -0.06% | +0.14% (2.4) | 12/14 | 21 | 1.0% / 0.9% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲  →  Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▲  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲ | 2550 | 34% | -0.01% | +0.07% (2.1) | 1384 | 27% | -0.12% | +0.08% (2.1) | 12/14 | 18 | 0.9% / 0.9% |
| Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▲  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲ | 3359 | 34% | -0.02% | +0.06% (2.1) | 1785 | 28% | -0.08% | +0.12% (3.5) | 11/14 | 18 | 1.0% / 0.9% |
| T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼ | 988 | 41% | +0.03% | +0.11% (2.0) | 633 | 33% | -0.07% | +0.14% (2.2) | 10/14 | 22 | 1.2% / 1.0% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲  →  Xanh>Đỏ · KC trên Xanh · KC trên Đỏ · Bot▲ | 2617 | 46% | -0.01% | +0.08% (1.9) | 1430 | 38% | -0.06% | +0.14% (2.9) | 12/14 | 38 | 1.6% / 1.3% |
| Xanh<Đỏ · KC trên Xanh · KC trên Đỏ · Bot▲  →  Xanh>Đỏ · KC trên Xanh · KC trên Đỏ · Bot▲ | 449 | 49% | +0.10% | +0.18% (1.9) | 335 | 34% | -0.32% | -0.12% (-1.1) | 10/14 | 40 | 1.5% / 1.4% |

## 3. Pattern lookback cho SHORT — top 40 theo IS, 14/40 vượt kiểm tra OOS

Tiêu chí vượt: PnL TB > 0 **và** hơn nến bất kỳ (Δ PnL > 0) ở **cả IS và OOS**, OOS n ≥ 40, và ≥ 60% số coin có Δ PnL dương. (Đã thử 117 pattern short 2–3 đoạn đủ mẫu.)

### Vượt kiểm tra

| Pattern | IS n | IS win | IS PnL TB | IS Δ PnL (t) | OOS n | OOS win | OOS PnL TB | OOS Δ PnL (t) | # coin | Thời gian TB (nến) | MFE / MAE TV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 266 | 45% | +0.29% | +0.35% (3.4) | 184 | 36% | +0.01% | +0.10% (0.9) | 12/14 | 22 | 1.5% / 0.9% |
| Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼  →  Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▼ | 181 | 56% | +0.41% | +0.47% (3.2) | 132 | 43% | +0.12% | +0.22% (1.4) | 11/14 | 41 | 2.1% / 1.2% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼ | 256 | 51% | +0.27% | +0.34% (2.9) | 194 | 42% | +0.16% | +0.26% (2.1) | 10/14 | 35 | 1.8% / 1.1% |
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▲ | 476 | 50% | +0.17% | +0.23% (2.4) | 321 | 49% | +0.22% | +0.31% (2.9) | 12/14 | 41 | 2.0% / 1.3% |
| Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼ | 279 | 51% | +0.16% | +0.22% (1.8) | 208 | 42% | +0.04% | +0.13% (1.1) | 11/14 | 41 | 1.9% / 1.2% |
| Xanh<Đỏ · KC trên Xanh · KC cắt Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 162 | 49% | +0.21% | +0.27% (1.8) | 117 | 38% | +0.06% | +0.16% (1.1) | 11/14 | 34 | 1.7% / 0.9% |
| Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲  →  Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲ | 154 | 49% | +0.16% | +0.22% (1.4) | 142 | 46% | +0.16% | +0.25% (1.6) | 11/14 | 42 | 1.8% / 1.0% |
| T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼ | 409 | 46% | +0.06% | +0.12% (1.1) | 262 | 44% | +0.15% | +0.25% (2.2) | 9/14 | 42 | 1.8% / 1.3% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼ | 400 | 45% | +0.05% | +0.11% (1.0) | 261 | 43% | +0.15% | +0.24% (2.1) | 9/14 | 42 | 1.8% / 1.3% |
| Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC dưới Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▼ | 242 | 51% | +0.09% | +0.15% (1.0) | 149 | 39% | +0.03% | +0.12% (0.8) | 11/14 | 46 | 1.8% / 1.2% |
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲ | 297 | 47% | +0.04% | +0.11% (0.9) | 184 | 48% | +0.47% | +0.56% (4.7) | 11/14 | 32 | 1.8% / 1.0% |
| Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▲  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▲ | 224 | 50% | +0.06% | +0.12% (0.9) | 231 | 48% | +0.26% | +0.35% (2.9) | 12/14 | 46 | 1.9% / 1.1% |
| Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▼  →  Xanh>Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼ | 705 | 49% | +0.00% | +0.06% (0.6) | 454 | 39% | +0.01% | +0.10% (1.1) | 10/14 | 45 | 1.7% / 1.3% |
| Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▲  →  Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▲ | 168 | 38% | +0.01% | +0.07% (0.6) | 148 | 38% | +0.06% | +0.15% (1.1) | 10/14 | 16 | 0.9% / 0.9% |

### Không vượt (top IS nhưng hỏng ở OOS hoặc không đồng đều giữa các coin)

| Pattern | IS n | IS win | IS PnL TB | IS Δ PnL (t) | OOS n | OOS win | OOS PnL TB | OOS Δ PnL (t) | # coin | Thời gian TB (nến) | MFE / MAE TV |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Xanh<Đỏ · KC trên Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼ | 1680 | 53% | +0.19% | +0.24% (4.9) | 1156 | 44% | -0.02% | +0.07% (1.3) | 11/14 | 38 | 2.0% / 1.3% |
| Xanh<Đỏ · KC trên Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 3446 | 38% | +0.07% | +0.12% (4.6) | 2408 | 30% | -0.06% | +0.03% (1.0) | 12/14 | 19 | 1.0% / 0.8% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲ | 649 | 43% | +0.21% | +0.27% (4.1) | 464 | 32% | -0.10% | -0.01% (-0.1) | 12/14 | 20 | 1.1% / 0.9% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC trên Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 2798 | 37% | +0.06% | +0.12% (3.9) | 1955 | 31% | -0.07% | +0.02% (0.5) | 11/14 | 19 | 1.0% / 0.8% |
| Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼ | 165 | 53% | +0.44% | +0.49% (3.6) | 163 | 17% | -1.01% | -0.92% (-7.3) | 3/14 | 15 | 1.2% / 1.6% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼ | 2695 | 50% | +0.07% | +0.13% (3.2) | 1978 | 42% | -0.04% | +0.05% (1.1) | 14/14 | 38 | 1.8% / 1.3% |
| Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▲  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼ | 519 | 40% | +0.15% | +0.21% (2.8) | 465 | 29% | -0.18% | -0.09% (-0.7) | 9/14 | 19 | 1.2% / 0.8% |
| Xanh<Đỏ · KC trên Xanh · KC cắt Đỏ · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼ | 273 | 41% | +0.20% | +0.26% (2.8) | 191 | 29% | -0.08% | +0.01% (0.1) | 11/14 | 16 | 1.1% / 0.7% |
| T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▲ | 739 | 50% | +0.14% | +0.20% (2.6) | 505 | 44% | -0.05% | +0.04% (0.5) | 11/14 | 40 | 1.9% / 1.3% |
| T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲ | 945 | 40% | +0.05% | +0.11% (2.0) | 674 | 34% | -0.03% | +0.06% (1.1) | 11/14 | 21 | 1.2% / 0.9% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▲  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▲ | 977 | 44% | -0.00% | +0.05% (0.9) | 967 | 36% | -0.11% | -0.02% (-0.4) | 8/14 | 39 | 1.4% / 1.1% |
| Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▲  →  Xanh<Đỏ · KC dưới Xanh · KC dưới Đỏ · Bot▲  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▲ | 488 | 32% | -0.00% | +0.06% (0.8) | 531 | 26% | -0.11% | -0.02% (-0.4) | 9/14 | 18 | 0.8% / 0.7% |

## 3b. Tìm pattern theo cách này có thật sự tổng quát không?

Với mọi pattern đủ mẫu (cả 1–3 đoạn, OOS n ≥ 40): chia thành 3 nhóm theo t của Δ PnL trên IS, rồi xem **OOS** của mỗi nhóm. Nếu nhóm tốt nhất ở IS vẫn tốt hơn ở OOS thì việc đọc pattern có giá trị thật, không chỉ là may mắn khi chọn.

| Hướng · nhóm | Số pattern | OOS Δ PnL TB (gia quyền) | OOS PnL TB | # pattern OOS Δ > 0 | Tương quan hạng IS→OOS |
|---|---|---|---|---|---|
| LONG · Top 1/3 theo IS | 46 | 0.019% | -0.185% | 23/46 | ρ = -0.09 (n=138) |
| LONG · Giữa | 46 | -0.085% | -0.290% | 15/46 |  |
| LONG · Đáy 1/3 theo IS | 46 | 0.022% | -0.186% | 24/46 |  |
| SHORT · Top 1/3 theo IS | 45 | 0.036% | -0.055% | 30/45 | ρ = 0.19 (n=137) |
| SHORT · Giữa | 45 | 0.018% | -0.074% | 27/45 |  |
| SHORT · Đáy 1/3 theo IS | 47 | 0.011% | -0.081% | 27/47 |  |

## 4. IMXUSDT: các pattern vượt kiểm tra hoạt động thế nào, và ví dụ để kéo chart xem lại

### LONG · T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▼

Toàn bộ 14 coin: n=1128, win 39%, PnL TB +0.07%, Δ so với nến bất kỳ +0.21% (t 4.1).

IMXUSDT: n=111, win 41%, PnL TB -0.04% (Δ +0.13%).

| Thời điểm (UTC) | Giá | Kết quả | MFE | MAE | PnL | Số nến tới TH ngược |
|---|---|---|---|---|---|---|
| 2026-09-07 05:00 | 0.1325 | ❌ thoát ở TH ngược | 0.3% | 0.5% | -0.65% | 3 |
| 2026-09-07 06:00 | 0.1325 | ❌ thoát ở TH ngược | 0.1% | 0.5% | -0.50% | 1 |
| 2026-09-07 09:00 | 0.1326 | ❌ thoát ở TH ngược | 0.1% | 1.0% | -0.95% | 3 |
| 2026-09-07 10:30 | 0.1321 | ✅ đạt 2% | 4.8% | 0.0% | +1.88% | 34 |
| 2026-09-14 16:45 | 0.1238 | ❌ thoát ở TH ngược | 1.3% | 0.5% | -0.36% | 45 |
| 2026-10-05 04:30 | 0.1810 | ❌ thoát ở TH ngược | 0.3% | 0.1% | -0.01% | 1 |
| 2026-10-05 05:00 | 0.1826 | ✅ đạt 2% | 2.5% | 1.7% | +1.88% | 39 |
| 2026-10-05 19:45 | 0.1829 | ✅ đạt 2% | 3.3% | 0.0% | +1.88% | 17 |

### SHORT · T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC cắt VWAP · Bot▲  →  T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▲

Toàn bộ 14 coin: n=797, win 50%, PnL TB +0.19%, Δ so với nến bất kỳ +0.26% (t 3.6).

IMXUSDT: n=57, win 63%, PnL TB +0.70% (Δ +0.72%).

| Thời điểm (UTC) | Giá | Kết quả | MFE | MAE | PnL | Số nến tới TH ngược |
|---|---|---|---|---|---|---|
| 2026-06-15 19:45 | 0.1475 | ❌ thoát ở TH ngược | 2.0% | 0.8% | -0.05% | 44 |
| 2026-06-22 18:30 | 0.1400 | ✅ đạt 2% | 4.0% | 0.0% | +1.88% | 23 |
| 2026-07-06 12:45 | 0.1370 | ❌ thoát ở TH ngược | 0.9% | 4.6% | -4.43% | 13 |
| 2026-07-27 11:00 | 0.1260 | ✅ đạt 2% | 7.5% | 0.3% | +1.88% | 52 |
| 2026-08-03 22:45 | 0.1106 | ❌ thoát ở TH ngược | 0.4% | 0.1% | +0.24% | 5 |
| 2026-08-10 23:45 | 0.1110 | ❌ thoát ở TH ngược | 0.2% | 0.1% | -0.12% | 1 |
| 2026-08-17 08:45 | 0.1076 | ❌ thoát ở TH ngược | 2.0% | 0.9% | +1.46% | 61 |
| 2026-09-07 19:00 | 0.1326 | ✅ đạt 2% | 2.4% | 3.2% | +1.88% | 146 |

### SHORT · Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▼  →  Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼

Toàn bộ 14 coin: n=450, win 47%, PnL TB +0.23%, Δ so với nến bất kỳ +0.30% (t 3.6).

IMXUSDT: n=24, win 75%, PnL TB +0.77% (Δ +0.80%).

| Thời điểm (UTC) | Giá | Kết quả | MFE | MAE | PnL | Số nến tới TH ngược |
|---|---|---|---|---|---|---|
| 2026-01-23 02:00 | 0.2541 | ❌ thoát ở TH ngược | 0.6% | 2.5% | -1.85% | 11 |
| 2026-02-24 01:00 | 0.1549 | ✅ đạt 2% | 3.4% | 1.9% | +1.88% | 55 |
| 2026-02-28 03:15 | 0.1641 | ✅ đạt 2% | 8.3% | 0.1% | +1.88% | 65 |
| 2026-04-12 03:00 | 0.1408 | ✅ đạt 2% | 3.3% | 4.4% | +1.88% | 108 |
| 2026-05-15 13:45 | 0.1906 | ✅ đạt 2% | 8.4% | 1.2% | +1.88% | 94 |
| 2026-07-10 06:00 | 0.1396 | ✅ đạt 2% | 4.1% | 1.2% | +1.88% | 116 |
| 2026-09-01 07:00 | 0.1248 | ✅ đạt 2% | 3.0% | 1.1% | +1.88% | 27 |
| 2026-09-15 07:30 | 0.1235 | ✅ đạt 2% | 5.0% | 1.3% | +1.88% | 66 |

### SHORT · Xanh>Đỏ · KC cắt Xanh · KC cắt Đỏ · Bot▼  →  Xanh>Đỏ · KC dưới Xanh · KC cắt Đỏ · Bot▼

Toàn bộ 14 coin: n=313, win 51%, PnL TB +0.29%, Δ so với nến bất kỳ +0.36% (t 3.4).

IMXUSDT: n=24, win 63%, PnL TB +0.35% (Δ +0.38%).

| Thời điểm (UTC) | Giá | Kết quả | MFE | MAE | PnL | Số nến tới TH ngược |
|---|---|---|---|---|---|---|
| 2025-11-25 19:00 | 0.3136 | ❌ thoát ở TH ngược | 1.1% | 2.2% | -1.91% | 9 |
| 2026-01-15 04:15 | 0.2759 | ✅ đạt 2% | 5.2% | 2.1% | +1.88% | 92 |
| 2026-01-23 02:15 | 0.2535 | ❌ thoát ở TH ngược | 0.4% | 2.8% | -2.09% | 10 |
| 2026-02-28 03:30 | 0.1633 | ✅ đạt 2% | 7.9% | 0.2% | +1.88% | 64 |
| 2026-04-12 03:30 | 0.1405 | ✅ đạt 2% | 3.1% | 4.6% | +1.88% | 106 |
| 2026-07-10 06:45 | 0.1390 | ✅ đạt 2% | 3.7% | 1.7% | +1.88% | 113 |
| 2026-09-01 08:00 | 0.1234 | ❌ thoát ở TH ngược | 1.9% | 2.3% | -2.31% | 23 |
| 2026-09-15 05:00 | 0.1228 | ✅ đạt 2% | 4.5% | 1.9% | +1.88% | 76 |

### SHORT · T2 (Xanh=Đỏ) · KC trên VWAP · Bot▲  →  Xanh>Đỏ · KC cắt Xanh · KC trên Đỏ · Bot▲

Toàn bộ 14 coin: n=481, win 48%, PnL TB +0.21%, Δ so với nến bất kỳ +0.28% (t 3.3).

IMXUSDT: n=32, win 69%, PnL TB +0.49% (Δ +0.53%).

| Thời điểm (UTC) | Giá | Kết quả | MFE | MAE | PnL | Số nến tới TH ngược |
|---|---|---|---|---|---|---|
| 2026-02-10 00:00 | 0.1591 | ✅ đạt 2% | 8.1% | 0.4% | +1.88% | 185 |
| 2026-02-17 00:00 | 0.1707 | ❌ thoát ở TH ngược | 0.5% | 2.7% | -2.35% | 13 |
| 2026-04-14 00:00 | 0.1487 | ✅ đạt 2% | 3.8% | 1.1% | +1.88% | 109 |
| 2026-04-21 00:00 | 0.1674 | ❌ thoát ở TH ngược | 0.8% | 2.9% | -2.87% | 28 |
| 2026-06-02 00:00 | 0.1628 | ✅ đạt 2% | 10.4% | 0.0% | +1.88% | 118 |
| 2026-07-07 00:00 | 0.1443 | ✅ đạt 2% | 8.2% | 1.7% | +1.88% | 163 |
| 2026-08-25 00:00 | 0.1311 | ❌ thoát ở TH ngược | 0.6% | 2.8% | -2.26% | 19 |
| 2026-09-22 00:00 | 0.1507 | ✅ đạt 2% | 2.5% | 1.7% | +1.88% | 55 |

### SHORT · T2 (Xanh=Đỏ) · KC dưới VWAP · Bot▼  →  Xanh<Đỏ · KC cắt Xanh · KC dưới Đỏ · Bot▼

Toàn bộ 14 coin: n=450, win 42%, PnL TB +0.18%, Δ so với nến bất kỳ +0.25% (t 3.2).

IMXUSDT: n=25, win 52%, PnL TB +0.28% (Δ +0.32%).

| Thời điểm (UTC) | Giá | Kết quả | MFE | MAE | PnL | Số nến tới TH ngược |
|---|---|---|---|---|---|---|
| 2025-12-23 00:00 | 0.2271 | ✅ đạt 2% | 2.3% | 1.3% | +1.88% | 47 |
| 2025-12-30 00:00 | 0.2266 | ❌ thoát ở TH ngược | 1.2% | 0.5% | -0.38% | 31 |
| 2026-01-13 00:00 | 0.2619 | ❌ thoát ở TH ngược | 0.7% | 1.3% | -1.42% | 16 |
| 2026-06-16 00:00 | 0.1479 | ✅ đạt 2% | 2.2% | 0.3% | +1.88% | 27 |
| 2026-06-23 00:00 | 0.1358 | ❌ thoát ở TH ngược | 0.6% | 0.1% | +0.32% | 1 |
| 2026-06-30 00:00 | 0.1200 | ✅ đạt 2% | 5.7% | 0.2% | +1.88% | 96 |
| 2026-07-14 00:00 | 0.1285 | ❌ thoát ở TH ngược | 1.6% | 0.8% | -0.35% | 25 |
| 2026-09-01 00:00 | 0.1249 | ❌ thoát ở TH ngược | 0.3% | 1.0% | -1.00% | 17 |
