import { useState, useEffect } from 'preact/hooks';
import { Icon } from '../components/Icon';
import {
    accounts,
    selectedAccountId,
    selectAccount,
    accountBalance,
    openPositions,
    openOrders,
    tradeHistory,
    accountStats,
    isLoading,
    formatUSD,
    formatPercent,
    formatTime,
    refreshAccountData,
} from '../state/account';
import { deviceMode } from '../hooks/useDeviceMode';

// Detail Modal Component
function DetailModal({ type, data, onClose }) {
    if (!data) return null;

    return (
        <>
            <div className="modal-backdrop" onClick={onClose} />
            <div className="detail-modal">
                <div className="detail-modal__header">
                    <h3>{type === 'position' ? 'Position Details' : type === 'order' ? 'Order Details' : 'Trade Details'}</h3>
                    <button className="detail-modal__close" onClick={onClose}>
                        <Icon name="close" size={20} />
                    </button>
                </div>
                <div className="detail-modal__body">
                    {type === 'position' && <PositionDetail position={data} />}
                    {type === 'order' && <OrderDetail order={data} />}
                    {type === 'trade' && <TradeDetail trade={data} />}
                </div>
                <div className="detail-modal__footer">
                    {type === 'position' && (
                        <>
                            <button className="btn btn--danger">Close Position</button>
                            <button className="btn btn--secondary">Add TP/SL</button>
                        </>
                    )}
                    {type === 'order' && (
                        <>
                            <button className="btn btn--danger">Cancel Order</button>
                            <button className="btn btn--secondary">Modify</button>
                        </>
                    )}
                    {type === 'trade' && (
                        <button className="btn btn--secondary" onClick={onClose}>Close</button>
                    )}
                </div>
            </div>
        </>
    );
}

// Position Detail Content
function PositionDetail({ position }) {
    const isLong = position.side === 'LONG';
    const isProfit = position.unrealizedPnl >= 0;
    const positionValue = position.entryPrice * position.quantity;
    const roi = (position.unrealizedPnl / position.initialMargin) * 100;

    return (
        <div className="detail-content">
            <div className="detail-header-row">
                <div className="detail-symbol">
                    <span className={`detail-side ${isLong ? 'long' : 'short'}`}>
                        {isLong ? '↑ LONG' : '↓ SHORT'}
                    </span>
                    <span className="detail-symbol-name">{position.symbol}</span>
                </div>
                <span className="detail-leverage">{position.leverage}x</span>
            </div>

            <div className={`detail-pnl-box ${isProfit ? 'positive' : 'negative'}`}>
                <div className="detail-pnl-main">
                    <span className="detail-pnl-label">Unrealized P&L</span>
                    <span className="detail-pnl-value">{formatUSD(position.unrealizedPnl)}</span>
                </div>
                <div className="detail-pnl-percent">
                    <span>{formatPercent(position.unrealizedPnlPercent)}</span>
                    <span className="detail-roi">ROI: {formatPercent(roi)}</span>
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-item">
                    <span className="detail-label">Entry Price</span>
                    <span className="detail-value">{formatUSD(position.entryPrice)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Mark Price</span>
                    <span className="detail-value">{formatUSD(position.markPrice)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Size</span>
                    <span className="detail-value">{position.quantity}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Position Value</span>
                    <span className="detail-value">{formatUSD(positionValue)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Initial Margin</span>
                    <span className="detail-value">{formatUSD(position.initialMargin)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Margin Type</span>
                    <span className="detail-value">{position.marginType.toUpperCase()}</span>
                </div>
                <div className="detail-item detail-item--full detail-item--danger">
                    <span className="detail-label">Liquidation Price</span>
                    <span className="detail-value">{formatUSD(position.liquidationPrice)}</span>
                </div>
            </div>
        </div>
    );
}

// Order Detail Content
function OrderDetail({ order }) {
    const isBuy = order.side === 'BUY';
    const orderValue = order.price * order.origQty;

    return (
        <div className="detail-content">
            <div className="detail-header-row">
                <div className="detail-symbol">
                    <span className={`detail-side ${isBuy ? 'long' : 'short'}`}>
                        {isBuy ? '↑ BUY' : '↓ SELL'}
                    </span>
                    <span className="detail-symbol-name">{order.symbol}</span>
                </div>
                <span className="detail-type-badge">{order.type}</span>
            </div>

            <div className="detail-grid">
                <div className="detail-item">
                    <span className="detail-label">Order Type</span>
                    <span className="detail-value">{order.type}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Status</span>
                    <span className="detail-value detail-value--status">{order.status}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Price</span>
                    <span className="detail-value">{formatUSD(order.price)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Quantity</span>
                    <span className="detail-value">{order.origQty}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Filled</span>
                    <span className="detail-value">{order.executedQty} / {order.origQty}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Order Value</span>
                    <span className="detail-value">{formatUSD(orderValue)}</span>
                </div>
                <div className="detail-item detail-item--full">
                    <span className="detail-label">Created At</span>
                    <span className="detail-value">{formatTime(order.time)}</span>
                </div>
            </div>
        </div>
    );
}

// Trade Detail Content
function TradeDetail({ trade }) {
    const isBuy = trade.side === 'BUY';
    const tradeValue = trade.price * trade.qty;

    return (
        <div className="detail-content">
            <div className="detail-header-row">
                <div className="detail-symbol">
                    <span className={`detail-side ${isBuy ? 'long' : 'short'}`}>
                        {isBuy ? '↑ BUY' : '↓ SELL'}
                    </span>
                    <span className="detail-symbol-name">{trade.symbol}</span>
                </div>
            </div>

            <div className="detail-grid">
                <div className="detail-item">
                    <span className="detail-label">Price</span>
                    <span className="detail-value">{formatUSD(trade.price)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Quantity</span>
                    <span className="detail-value">{trade.qty}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Trade Value</span>
                    <span className="detail-value">{formatUSD(tradeValue)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Commission</span>
                    <span className="detail-value">{formatUSD(trade.commission)}</span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Realized P&L</span>
                    <span className={`detail-value ${trade.realizedPnl >= 0 ? 'positive' : 'negative'}`}>
                        {trade.realizedPnl !== 0 ? formatUSD(trade.realizedPnl) : '-'}
                    </span>
                </div>
                <div className="detail-item">
                    <span className="detail-label">Time</span>
                    <span className="detail-value">{formatTime(trade.time)}</span>
                </div>
            </div>
        </div>
    );
}

// Summary Bar
function SummaryBar() {
    const [totals, setTotals] = useState({ balance: 0, positions: 0, todayPnl: 0 });

    useEffect(() => {
        const allAccounts = accounts.value;
        let totalBalance = 0, totalPositions = 0, totalTodayPnl = 0;
        allAccounts.forEach((acc, i) => {
            totalBalance += (i + 1) * 5000 + Math.random() * 2000;
            totalPositions += (i % 3) + 1;
            totalTodayPnl += (Math.random() - 0.3) * 300;
        });
        setTotals({ balance: totalBalance, positions: totalPositions, todayPnl: totalTodayPnl });
    }, []);

    return (
        <div className="summary-bar">
            <div className="summary-bar__item">
                <span className="summary-bar__label">Total Balance</span>
                <span className="summary-bar__value">{formatUSD(totals.balance)}</span>
            </div>
            <div className="summary-bar__item">
                <span className="summary-bar__label">Positions</span>
                <span className="summary-bar__value">{totals.positions}</span>
            </div>
            <div className="summary-bar__item">
                <span className="summary-bar__label">Today P&L</span>
                <span className={`summary-bar__value ${totals.todayPnl >= 0 ? 'positive' : 'negative'}`}>
                    {formatUSD(totals.todayPnl)}
                </span>
            </div>
        </div>
    );
}

// Widget Container
function Widget({ title, children, className = '' }) {
    return (
        <div className={`widget ${className}`}>
            <div className="widget__header">{title}</div>
            <div className="widget__body">{children}</div>
        </div>
    );
}

function ScrollWidget({ title, children, className = '' }) {
    return (
        <div className={`widget widget--scroll ${className}`}>
            <div className="widget__header">{title}</div>
            <div className="widget__body widget__body--scroll">{children}</div>
        </div>
    );
}

// Combined Account Info Widget (Balance + P&L + Stats)
function AccountInfoWidget({ balance, stats }) {
    return (
        <div className="account-info-combined">
            {/* Balance Section */}
            <div className="account-section">
                <div className="account-section__title">Balance</div>
                <div className="account-grid">
                    <div className="account-item">
                        <span className="account-item__label">Balance</span>
                        <span className="account-item__value">{formatUSD(balance.totalWalletBalance)}</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Equity</span>
                        <span className="account-item__value">{formatUSD(balance.totalMarginBalance)}</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Unrealized</span>
                        <span className={`account-item__value ${balance.totalUnrealizedProfit >= 0 ? 'positive' : 'negative'}`}>
                            {formatUSD(balance.totalUnrealizedProfit)}
                        </span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Available</span>
                        <span className="account-item__value">{formatUSD(balance.availableBalance)}</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Margin</span>
                        <span className="account-item__value">{formatUSD(balance.totalPositionInitialMargin)}</span>
                    </div>
                </div>
            </div>

            {/* P&L Section */}
            <div className="account-section">
                <div className="account-section__title">Profit & Loss</div>
                <div className="account-grid">
                    <div className="account-item">
                        <span className="account-item__label">Total</span>
                        <span className={`account-item__value ${stats.totalPnl >= 0 ? 'positive' : 'negative'}`}>
                            {formatUSD(stats.totalPnl)}
                        </span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Today</span>
                        <span className={`account-item__value ${stats.todayPnl >= 0 ? 'positive' : 'negative'}`}>
                            {formatUSD(stats.todayPnl)}
                        </span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Week</span>
                        <span className={`account-item__value ${stats.weekPnl >= 0 ? 'positive' : 'negative'}`}>
                            {formatUSD(stats.weekPnl)}
                        </span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Month</span>
                        <span className={`account-item__value ${stats.monthPnl >= 0 ? 'positive' : 'negative'}`}>
                            {formatUSD(stats.monthPnl)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="account-section">
                <div className="account-section__title">Statistics</div>
                <div className="account-grid account-grid--stats">
                    <div className="account-item">
                        <span className="account-item__label">Trades</span>
                        <span className="account-item__value">{stats.totalTrades}</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Win Rate</span>
                        <span className="account-item__value positive">{stats.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">PF</span>
                        <span className="account-item__value">{stats.profitFactor.toFixed(2)}</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Sharpe</span>
                        <span className="account-item__value">{stats.sharpeRatio.toFixed(2)}</span>
                    </div>
                    <div className="account-item">
                        <span className="account-item__label">Max DD</span>
                        <span className="account-item__value negative">{stats.maxDrawdown}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Positions Widget - Table format
function PositionsWidget({ positions, onItemClick }) {
    if (positions.length === 0) return <div className="empty-state">No positions</div>;

    return (
        <div className="data-table">
            <div className="data-table__header data-table__header--pos">
                <span>Symbol</span>
                <span>Size</span>
                <span>Entry</span>
                <span>Mark</span>
                <span>P&L</span>
                <span>Liq</span>
            </div>
            <div className="data-table__body">
                {positions.map((pos, i) => {
                    const isLong = pos.side === 'LONG';
                    const isProfit = pos.unrealizedPnl >= 0;

                    return (
                        <div key={i} className="data-table__row data-table__row--pos" onClick={() => onItemClick('position', pos)}>
                            <span className="data-table__symbol">
                                <span className={`data-table__side ${isLong ? 'long' : 'short'}`}>{isLong ? '↑' : '↓'}</span>
                                {pos.symbol}
                                <span className="data-table__badge">{pos.leverage}x</span>
                            </span>
                            <span>{pos.quantity}</span>
                            <span>{formatUSD(pos.entryPrice)}</span>
                            <span>{formatUSD(pos.markPrice)}</span>
                            <span className={isProfit ? 'positive' : 'negative'}>
                                {formatUSD(pos.unrealizedPnl)}
                                <small>{formatPercent(pos.unrealizedPnlPercent)}</small>
                            </span>
                            <span className="data-table__liq">{formatUSD(pos.liquidationPrice)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Orders Widget - Table format
function OrdersWidget({ orders, onItemClick }) {
    if (orders.length === 0) return <div className="empty-state">No orders</div>;

    return (
        <div className="data-table">
            <div className="data-table__header data-table__header--order">
                <span>Symbol</span>
                <span>Type</span>
                <span>Price</span>
                <span>Qty</span>
                <span>Status</span>
            </div>
            <div className="data-table__body">
                {orders.map((order, i) => {
                    const isBuy = order.side === 'BUY';

                    return (
                        <div key={i} className="data-table__row data-table__row--order" onClick={() => onItemClick('order', order)}>
                            <span className="data-table__symbol">
                                <span className={`data-table__side ${isBuy ? 'long' : 'short'}`}>{isBuy ? '↑' : '↓'}</span>
                                {order.symbol}
                            </span>
                            <span className="data-table__type">{order.type}</span>
                            <span>{formatUSD(order.price)}</span>
                            <span>{order.origQty}</span>
                            <span className="data-table__status">{order.status}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// History Widget
function HistoryWidget({ trades, onItemClick }) {
    if (trades.length === 0) return <div className="empty-state">No history</div>;

    return (
        <div className="history-table">
            <div className="history-header">
                <span>Time</span>
                <span>Symbol</span>
                <span>Side</span>
                <span>Price</span>
                <span>Qty</span>
                <span>P&L</span>
            </div>
            <div className="history-body">
                {trades.map((trade, i) => (
                    <div key={i} className="history-row" onClick={() => onItemClick('trade', trade)}>
                        <span className="history-time">{formatTime(trade.time)}</span>
                        <span className="history-symbol">{trade.symbol}</span>
                        <span className={`history-side ${trade.side.toLowerCase()}`}>{trade.side}</span>
                        <span className="history-price">{formatUSD(trade.price)}</span>
                        <span className="history-qty">{trade.qty}</span>
                        <span className={`history-pnl ${trade.realizedPnl >= 0 ? 'positive' : 'negative'}`}>
                            {trade.realizedPnl !== 0 ? formatUSD(trade.realizedPnl) : '-'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Main Account Component
export function Account() {
    const isDesktop = deviceMode.value === 'desktop';
    const loading = isLoading.value;
    const allAccounts = accounts.value;
    const currentAccountId = selectedAccountId.value;

    const balance = accountBalance.value;
    const positions = openPositions.value;
    const orders = openOrders.value;
    const trades = tradeHistory.value;
    const stats = accountStats.value;

    // Modal state
    const [modalData, setModalData] = useState(null);
    const [modalType, setModalType] = useState(null);

    const handleItemClick = (type, data) => {
        setModalType(type);
        setModalData(data);
    };

    const handleCloseModal = () => {
        setModalType(null);
        setModalData(null);
    };

    useEffect(() => {
        refreshAccountData();
    }, [currentAccountId]);

    return (
        <div className={`account-page ${isDesktop ? 'account-page--desktop' : ''}`}>
            {/* Summary Bar */}
            <SummaryBar />

            {/* Account Tabs */}
            <div className="account-tabs">
                {allAccounts.map(account => (
                    <button
                        key={account.id}
                        className={`account-tab ${currentAccountId === account.id ? 'active' : ''}`}
                        onClick={() => selectAccount(account.id)}
                    >
                        <span className="account-tab__avatar">{account.name.charAt(0)}</span>
                        <span className="account-tab__name">{account.name}</span>
                    </button>
                ))}
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="account-loading">
                    <div className="spinner" />
                </div>
            ) : (
                <div className="dashboard-wrapper">
                    {/* Main Grid: Account Info | Positions | Orders */}
                    <div className="dashboard-main">
                        <Widget title="Account Info" className="widget--info">
                            <AccountInfoWidget balance={balance} stats={stats} />
                        </Widget>

                        <ScrollWidget title={`Positions (${positions.length})`} className="widget--positions">
                            <PositionsWidget positions={positions} onItemClick={handleItemClick} />
                        </ScrollWidget>

                        <ScrollWidget title={`Orders (${orders.length})`} className="widget--orders">
                            <OrdersWidget orders={orders} onItemClick={handleItemClick} />
                        </ScrollWidget>
                    </div>

                    {/* History - Full Width */}
                    <Widget title="Trade History" className="widget--history">
                        <HistoryWidget trades={trades} onItemClick={handleItemClick} />
                    </Widget>
                </div>
            )}

            {/* Detail Modal */}
            {modalData && (
                <DetailModal type={modalType} data={modalData} onClose={handleCloseModal} />
            )}
        </div>
    );
}
