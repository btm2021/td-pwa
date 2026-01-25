/**
 * Binance Source Declaration
 */
export const binanceSource = {
    name: 'binance',
    wsUrl: 'wss://fstream.binance.com/ws', // For Futures/Perpetuals

    /**
     * Normalize Binance WebSocket message to standard format
     * @param {Object} msg
     * @returns {NormalizedTick | null}
     */
    normalize(msg) {
        if (msg.e !== '24hrTicker') return null;

        return {
            source: 'binance',
            symbol: msg.s,
            type: 'perp',
            timestamp: msg.E,
            open: parseFloat(msg.o),
            high: parseFloat(msg.h),
            low: parseFloat(msg.l),
            close: parseFloat(msg.c),
            volume: parseFloat(msg.v),
            change: parseFloat(msg.P),
        };
    },

    /**
     * Get prescription for subscribing to symbols
     * @param {string[]} symbols
     */
    getSubscribeMsg(symbols) {
        return {
            method: 'SUBSCRIBE',
            params: symbols.map(s => `${s.toLowerCase()}@ticker`),
            id: 1
        };
    }
};
