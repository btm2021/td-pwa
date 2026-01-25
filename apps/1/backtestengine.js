/**
 * BACKTEST ENGINE - Specialized for VSR7
 * Calculation: Binance Futures (isolated/cross logic based on PnL = Side * (Exit - Entry) / Entry)
 * Leverage: Fixed x20
 * Execution: Auto-filled at Close price for Entry, TP, and SL.
 */

export class BacktestEngine {
    constructor(data, leverage = 20) {
        this.data = data; // Array of {time, open, high, low, close, volume}
        this.leverage = leverage;
    }

    /**
     * Run backtest based on signals
     * @param {Array} signals - Array of {time, side: 'LONG'|'SHORT', sl, tp}
     */
    run(signals) {
        const trades = [];
        let balance = 1000; // Simulated start balance for relative PnL tracking
        const initialBalance = balance;

        // Map signals by time for quick lookup
        const signalMap = new Map();
        signals.forEach(s => signalMap.set(s.time, s));

        let activeTrade = null;

        for (let i = 0; i < this.data.length; i++) {
            const bar = this.data[i];

            // 1. Check for Exit if trade is active
            if (activeTrade) {
                let exited = false;
                let exitPrice = null;
                let status = '';

                // Logic: Check if price hit SL or TP during this bar
                // As per requirement: "auto filled theo giá close (entry,tp,sl)"
                // This means we check High/Low but exit at the predefined SL/TP levels or Close

                if (activeTrade.side === 'LONG') {
                    if (bar.low <= activeTrade.sl) {
                        exitPrice = activeTrade.sl;
                        status = 'SL';
                        exited = true;
                    } else if (bar.high >= activeTrade.tp) {
                        exitPrice = activeTrade.tp;
                        status = 'TP';
                        exited = true;
                    }
                } else { // SHORT
                    if (bar.high >= activeTrade.sl) {
                        exitPrice = activeTrade.sl;
                        status = 'SL';
                        exited = true;
                    } else if (bar.low <= activeTrade.tp) {
                        exitPrice = activeTrade.tp;
                        status = 'TP';
                        exited = true;
                    }
                }

                if (exited) {
                    const tradeResult = this.closeTrade(activeTrade, exitPrice, bar.time, status);
                    trades.push(tradeResult);
                    balance += tradeResult.pnlUsdt;
                    activeTrade = null;
                }
            }

            // 2. Check for New Entry (if no active trade)
            if (!activeTrade && signalMap.has(bar.time)) {
                const signal = signalMap.get(bar.time);
                activeTrade = {
                    entryTime: bar.time,
                    entryPrice: bar.close, // Entry at Close of signal bar
                    side: signal.side,
                    sl: signal.sl,
                    tp: signal.tp,
                    amount: 100 // Nominal 100 USDT margin per trade
                };
            }
        }

        // Close any remaining open trade at last bar price
        if (activeTrade) {
            const lastBar = this.data[this.data.length - 1];
            trades.push(this.closeTrade(activeTrade, lastBar.close, lastBar.time, 'CLOSED_FINAL'));
        }

        return this.generateReport(trades, initialBalance);
    }

    closeTrade(trade, exitPrice, exitTime, status) {
        const entryPrice = trade.entryPrice;
        const sideMultiplier = trade.side === 'LONG' ? 1 : -1;

        // Binance Future PnL Formula: PnL = (Exit - Entry) / Entry * Leverage * Margin (for LONG)
        const pnlPct = (exitPrice - entryPrice) / entryPrice * sideMultiplier;
        const roe = pnlPct * this.leverage * 100;
        const pnlUsdt = trade.amount * pnlPct * this.leverage;

        // Calculate R-Multiple: (Exit - Entry) / (Entry - SL)
        const risk = Math.abs(trade.entryPrice - trade.sl);
        const rValue = risk > 0 ? (exitPrice - trade.entryPrice) * sideMultiplier / risk : 0;

        return {
            ...trade,
            exitTime,
            exitPrice,
            status,
            roe,
            pnlUsdt,
            rValue,
            durationBars: 0
        };
    }

    generateReport(trades, initialBalance) {
        const totalTrades = trades.length;
        const winTrades = trades.filter(t => t.pnlUsdt > 0);
        const lossTrades = trades.filter(t => t.pnlUsdt <= 0);

        const totalPnL = trades.reduce((sum, t) => sum + t.pnlUsdt, 0);
        const winRate = totalTrades > 0 ? (winTrades.length / totalTrades) * 100 : 0;

        let maxDrawdown = 0;
        let peak = initialBalance;
        let currentBalance = initialBalance;

        trades.forEach(t => {
            currentBalance += t.pnlUsdt;
            if (currentBalance > peak) peak = currentBalance;
            const dd = (peak - currentBalance) / peak * 100;
            if (dd > maxDrawdown) maxDrawdown = dd;
        });

        const totalR = trades.reduce((sum, t) => sum + t.rValue, 0);

        return {
            summary: {
                totalPnL: totalPnL.toFixed(2),
                netProfit: (currentBalance - initialBalance).toFixed(2),
                winRate: winRate.toFixed(2) + '%',
                totalTrades,
                winTrades: winTrades.length,
                lossTrades: lossTrades.length,
                totalR: totalR.toFixed(2) + 'R',
                maxDrawdown: maxDrawdown.toFixed(2) + '%',
                finalBalance: currentBalance.toFixed(2)
            },
            trades: trades.map(t => ({
                ...t,
                entryPrice: t.entryPrice.toFixed(4),
                exitPrice: t.exitPrice.toFixed(4),
                roe: t.roe.toFixed(2) + '%',
                pnlUsdt: t.pnlUsdt.toFixed(2),
                entryTime: new Date(t.entryTime * 1000).toLocaleString(),
                exitTime: new Date(t.exitTime * 1000).toLocaleString()
            }))
        };
    }
}
