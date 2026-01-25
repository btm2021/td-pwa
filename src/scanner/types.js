/**
 * Normalized OHLCV Data Structure
 * @typedef {Object} NormalizedTick
 * @property {string} source - Source name (e.g., 'binance')
 * @property {string} symbol - Trading pair (e.g., 'BTCUSDT')
 * @property {string} type - 'spot' | 'perp' | 'futures'
 * @property {number} timestamp - Unix timestamp in milliseconds
 * @property {number} open - Open price
 * @property {number} high - High price
 * @property {number} low - Low price
 * @property {number} close - Close price
 * @property {number} volume - Trading volume
 * @property {number} change - 24h price change percentage
 */

export const STANDARDIZED_TIMEFRAMES = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
};
