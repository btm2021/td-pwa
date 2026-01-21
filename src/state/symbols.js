// Trading Symbols Data
export const symbols = [
  {
    id: 'btcusdt',
    symbol: 'BTCUSDT.P',
    name: 'Bitcoin',
    description: 'Bitcoin / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 90850.1,
    change: -1.88,
    iconClass: 'price-row__icon--btc',
    iconLetter: 'B',
  },
  {
    id: 'ethusdt',
    symbol: 'ETHUSDT.P',
    name: 'Ethereum',
    description: 'Ethereum / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 3245.67,
    change: 2.45,
    iconClass: 'price-row__icon--eth',
    iconLetter: 'E',
  },
  {
    id: 'solusdt',
    symbol: 'SOLUSDT.P',
    name: 'Solana',
    description: 'Solana / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 198.54,
    change: 5.12,
    iconClass: 'price-row__icon--sol',
    iconLetter: 'S',
  },
  {
    id: 'bnbusdt',
    symbol: 'BNBUSDT.P',
    name: 'BNB',
    description: 'BNB / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 712.35,
    change: -0.54,
    iconClass: '',
    iconLetter: 'B',
  },
  {
    id: 'xrpusdt',
    symbol: 'XRPUSDT.P',
    name: 'XRP',
    description: 'XRP / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 2.4521,
    change: 8.23,
    iconClass: '',
    iconLetter: 'X',
  },
  {
    id: 'adausdt',
    symbol: 'ADAUSDT.P',
    name: 'Cardano',
    description: 'Cardano / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 1.0234,
    change: -3.12,
    iconClass: '',
    iconLetter: 'A',
  },
  {
    id: 'dogeusdt',
    symbol: 'DOGEUSDT.P',
    name: 'Dogecoin',
    description: 'Dogecoin / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 0.3876,
    change: 1.23,
    iconClass: '',
    iconLetter: 'D',
  },
  {
    id: 'avaxusdt',
    symbol: 'AVAXUSDT.P',
    name: 'Avalanche',
    description: 'Avalanche / TetherUS PERPETUAL',
    exchange: 'BINANCE',
    price: 42.15,
    change: -2.87,
    iconClass: '',
    iconLetter: 'A',
  },
];

export const timeframes = [
  { id: '1m', label: '1m' },
  { id: '5m', label: '5m' },
  { id: '15m', label: '15m' },
  { id: '30m', label: '30m' },
  { id: '1h', label: '1H' },
  { id: '4h', label: '4H' },
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
];

export const overviewTimeframes = [
  { id: '1d', label: '1D' },
  { id: '1w', label: '1W' },
  { id: '1m', label: '1M' },
  { id: '3m', label: '3M' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
  { id: '5y', label: '5Y' },
  { id: 'all', label: 'All' },
];

export function getSymbolById(id) {
  return symbols.find((s) => s.id === id) || symbols[0];
}

export function formatPrice(price) {
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } else if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  }
}

export function formatChange(change) {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
