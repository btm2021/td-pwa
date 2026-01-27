import { signal, computed } from '@preact/signals';

// ===== Multi-Account Configuration =====
// Keys from .env are comma-separated
// VITE_BINANCE_API_KEY=api1,api2
// VITE_BINANCE_API_SECRET=sec1,sec2
// VITE_BINANCE_NAME_ALIAS=baotm,tuan

function parseEnvAccounts() {
    const apiKeys = (import.meta.env.VITE_BINANCE_API_KEY || '').split(',').filter(Boolean);
    const secrets = (import.meta.env.VITE_BINANCE_API_SECRET || '').split(',').filter(Boolean);
    const names = (import.meta.env.VITE_BINANCE_NAME_ALIAS || '').split(',').filter(Boolean);

    // If no env config, use mock accounts
    if (apiKeys.length === 0) {
        return [
            { id: 'mock1', name: 'Main Account', apiKey: 'mock_key_1', secret: 'mock_secret_1' },
            { id: 'mock2', name: 'Trading Bot', apiKey: 'mock_key_2', secret: 'mock_secret_2' },
            { id: 'mock3', name: 'Scalping', apiKey: 'mock_key_3', secret: 'mock_secret_3' },
        ];
    }

    return apiKeys.map((key, index) => ({
        id: `account_${index}`,
        name: names[index] || `Account ${index + 1}`,
        apiKey: key.trim(),
        secret: (secrets[index] || '').trim(),
    }));
}

// Available accounts
export const accounts = signal(parseEnvAccounts());

// Currently selected account
export const selectedAccountId = signal(accounts.value[0]?.id || 'mock1');

// Computed selected account
export const selectedAccount = computed(() => {
    return accounts.value.find(a => a.id === selectedAccountId.value) || accounts.value[0];
});

// Switch account
export function selectAccount(accountId) {
    selectedAccountId.value = accountId;
    // Refresh data for new account
    refreshAccountData();
}

// ===== Mock Data Generator =====
// Generate different mock data for each account
function generateMockDataForAccount(accountId) {
    const seed = accountId.charCodeAt(accountId.length - 1);
    const multiplier = (seed % 5) + 1;

    return {
        balance: {
            totalWalletBalance: 5000 * multiplier + Math.random() * 2000,
            totalUnrealizedProfit: (Math.random() - 0.3) * 500 * multiplier,
            totalMarginBalance: 5200 * multiplier + Math.random() * 2000,
            availableBalance: 3500 * multiplier + Math.random() * 1500,
            totalPositionInitialMargin: 1200 * multiplier + Math.random() * 800,
            totalOpenOrderInitialMargin: 100 * multiplier,
        },
        positions: generateMockPositions(seed),
        orders: generateMockOrders(seed),
        trades: generateMockTrades(seed),
        pnl: generateMockPnL(seed),
        stats: generateMockStats(seed),
    };
}

function generateMockPositions(seed) {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT'];
    const count = (seed % 4) + 1;
    const positions = [];

    for (let i = 0; i < count; i++) {
        const isLong = (seed + i) % 2 === 0;
        const symbol = symbols[(seed + i) % symbols.length];
        const entryPrice = getBasePrice(symbol) * (0.95 + Math.random() * 0.1);
        const markPrice = entryPrice * (isLong ? 1 + Math.random() * 0.05 : 1 - Math.random() * 0.05);
        const qty = getBaseQty(symbol) * (1 + (seed % 3));
        const leverage = [5, 10, 15, 20][(seed + i) % 4];
        const pnl = (markPrice - entryPrice) * qty * (isLong ? 1 : -1);

        positions.push({
            symbol,
            side: isLong ? 'LONG' : 'SHORT',
            entryPrice,
            markPrice,
            quantity: qty,
            leverage,
            unrealizedPnl: pnl,
            unrealizedPnlPercent: (pnl / (entryPrice * qty / leverage)) * 100,
            marginType: i % 2 === 0 ? 'cross' : 'isolated',
            liquidationPrice: entryPrice * (isLong ? 0.85 : 1.15),
            initialMargin: (entryPrice * qty) / leverage,
        });
    }

    return positions;
}

function generateMockOrders(seed) {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
    const count = seed % 3;
    const orders = [];

    for (let i = 0; i < count; i++) {
        const symbol = symbols[i % symbols.length];
        const basePrice = getBasePrice(symbol);

        orders.push({
            orderId: `ORD${seed}${i}`,
            symbol,
            side: i % 2 === 0 ? 'BUY' : 'SELL',
            type: ['LIMIT', 'STOP_LOSS', 'TAKE_PROFIT'][i % 3],
            price: basePrice * (0.95 + i * 0.02),
            origQty: getBaseQty(symbol),
            executedQty: 0,
            status: 'NEW',
            time: Date.now() - (i + 1) * 3600000,
        });
    }

    return orders;
}

function generateMockTrades(seed) {
    const symbols = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT'];
    const trades = [];

    for (let i = 0; i < 8; i++) {
        const symbol = symbols[i % symbols.length];
        const isBuy = (seed + i) % 2 === 0;

        trades.push({
            id: seed * 100 + i,
            symbol,
            side: isBuy ? 'BUY' : 'SELL',
            price: getBasePrice(symbol) * (0.98 + Math.random() * 0.04),
            qty: getBaseQty(symbol),
            realizedPnl: i % 3 === 0 ? (Math.random() - 0.3) * 200 : 0,
            commission: Math.random() * 5,
            time: Date.now() - (i + 1) * 86400000,
        });
    }

    return trades;
}

function generateMockPnL(seed) {
    const pnl = [];
    let cumulative = 0;

    // Generate 30 days of history
    for (let i = 30; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const daily = (Math.random() - 0.4) * 300 * ((seed % 3) + 1);
        cumulative += daily;

        pnl.push({
            date: date.toISOString().split('T')[0],
            pnl: daily,
            cumulative,
        });
    }

    return pnl;
}

function generateMockStats(seed) {
    const multiplier = (seed % 3) + 1;
    return {
        totalTrades: 50 * multiplier + seed,
        winRate: 55 + (seed % 20),
        avgWin: 100 + seed * 10,
        avgLoss: 60 + seed * 5,
        profitFactor: 1.5 + (seed % 10) / 10,
        maxDrawdown: 5 + (seed % 10),
        sharpeRatio: 1.5 + (seed % 15) / 10,
        totalPnl: 1000 * multiplier + Math.random() * 2000,
        todayPnl: (Math.random() - 0.3) * 300,
        weekPnl: (Math.random() - 0.2) * 1000,
        monthPnl: (Math.random() - 0.1) * 3000,
    };
}

function getBasePrice(symbol) {
    const prices = {
        BTCUSDT: 42500,
        ETHUSDT: 2300,
        SOLUSDT: 98,
        BNBUSDT: 310,
        XRPUSDT: 0.52,
        DOGEUSDT: 0.08,
    };
    return prices[symbol] || 100;
}

function getBaseQty(symbol) {
    const qty = {
        BTCUSDT: 0.1,
        ETHUSDT: 1,
        SOLUSDT: 20,
        BNBUSDT: 2,
        XRPUSDT: 1000,
        DOGEUSDT: 5000,
    };
    return qty[symbol] || 1;
}

// ===== Account Data Signals =====
export const accountData = signal(null);
export const isLoading = signal(false);

// Computed values from account data
export const accountBalance = computed(() => accountData.value?.balance || {
    totalWalletBalance: 0,
    totalUnrealizedProfit: 0,
    totalMarginBalance: 0,
    availableBalance: 0,
    totalPositionInitialMargin: 0,
});

export const openPositions = computed(() => accountData.value?.positions || []);
export const openOrders = computed(() => accountData.value?.orders || []);
export const tradeHistory = computed(() => accountData.value?.trades || []);
export const pnlHistory = computed(() => accountData.value?.pnl || []);
export const accountStats = computed(() => accountData.value?.stats || {
    totalTrades: 0, winRate: 0, avgWin: 0, avgLoss: 0,
    profitFactor: 0, maxDrawdown: 0, sharpeRatio: 0,
    totalPnl: 0, todayPnl: 0, weekPnl: 0, monthPnl: 0,
});

// ===== Format Helpers =====
export function formatUSD(value, decimals = 2) {
    if (value === undefined || value === null) return '$0.00';
    const num = parseFloat(value);
    if (isNaN(num)) return '$0.00';

    const sign = num >= 0 ? '' : '-';
    const absValue = Math.abs(num);

    if (absValue >= 1000000) {
        return `${sign}$${(absValue / 1000000).toFixed(2)}M`;
    }
    if (absValue >= 1000) {
        return `${sign}$${(absValue / 1000).toFixed(2)}K`;
    }
    return `${sign}$${absValue.toFixed(decimals)}`;
}

export function formatPercent(value) {
    if (value === undefined || value === null) return '0.00%';
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00%';
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(2)}%`;
}

export function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

// ===== API Functions =====
export async function refreshAccountData() {
    isLoading.value = true;

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generate mock data for selected account
    const data = generateMockDataForAccount(selectedAccountId.value);
    accountData.value = data;

    isLoading.value = false;
    return data;
}

// Get total balance across all accounts
export async function getTotalBalance() {
    let total = 0;

    for (const account of accounts.value) {
        const data = generateMockDataForAccount(account.id);
        total += data.balance.totalMarginBalance;
    }

    return total;
}

// Initialize data on load
refreshAccountData();
