import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { selectedSymbol, selectedTimeframe, isChartReady, setChartReady } from '../state/store';
import { tickerData, formatPrice, formatPercent } from '../state/watchlist';
import { DesktopChart } from './desktop/DesktopChart';
import './Futures.css';

export function Futures() {
    const symbol = selectedSymbol.value;
    const tickers = tickerData.value;
    const ticker = tickers[symbol.symbol] || {};

    const [activeBottomTab, setActiveBottomTab] = useState('positions');
    const [orderType, setOrderType] = useState('limit');
    const [side, setSide] = useState('buy');

    // Mock Order Book Data
    const asks = [
        { price: 386.62, size: 10.45, total: 10.45 },
        { price: 386.61, size: 2.13, total: 12.58 },
        { price: 386.60, size: 55.20, total: 67.78 },
        { price: 386.58, size: 1.84, total: 69.62 },
        { price: 386.57, size: 12.30, total: 81.92 },
        { price: 386.54, size: 0.90, total: 82.82 },
        { price: 386.52, size: 30.00, total: 112.82 },
        { price: 386.51, size: 0.84, total: 113.66 },
    ].reverse();

    const bids = [
        { price: 386.49, size: 8.26, total: 8.26 },
        { price: 386.48, size: 15.40, total: 23.66 },
        { price: 386.46, size: 0.90, total: 24.56 },
        { price: 386.44, size: 30.00, total: 54.56 },
        { price: 386.42, size: 0.84, total: 55.40 },
        { price: 386.41, size: 1.20, total: 56.60 },
        { price: 386.40, size: 10.30, total: 66.90 },
        { price: 386.39, size: 1.25, total: 68.15 },
    ];

    // Mock Positions Data
    const positions = [
        {
            symbol: 'BNBBUSD',
            type: 'Long',
            leverage: '10x',
            size: '12.5',
            entryPrice: '382.45',
            markPrice: '386.50',
            liqPrice: '345.12',
            pnl: '+50.62',
            roe: '+10.58%'
        },
        {
            symbol: 'BTCUSDT',
            type: 'Short',
            leverage: '20x',
            size: '0.15',
            entryPrice: '45820.5',
            markPrice: '45231.2',
            liqPrice: '48120.0',
            pnl: '+88.35',
            roe: '+3.85%'
        }
    ];

    return (
        <div className="futures-screen">
            {/* Header: Binance-style Stats Bar */}
            <header className="futures-header">
                <div className="futures-header__symbol">
                    <h2>{symbol.symbol} <span style={{ color: '#848e9c', fontSize: '11px' }}>Perpetual</span></h2>
                    <Icon name="chevronDown" size={14} />
                </div>

                <div className="futures-header__price-group">
                    <span className={`futures-header__price ${ticker.priceChangePercent < 0 ? 'negative' : ''}`}>
                        {formatPrice(ticker.price || 386.50)}
                    </span>
                </div>

                <div className="futures-header__stats">
                    <div className="futures-header__stat">
                        <span className="label">Index Price</span>
                        <span className="value">386.67</span>
                    </div>
                    <div className="futures-header__stat">
                        <span className="label">Mark Price</span>
                        <span className="value">386.56</span>
                    </div>
                    <div className="futures-header__stat">
                        <span className="label">Funding / Countdown</span>
                        <span className="value" style={{ color: '#f0b90b' }}>0.0100% / 06:35:09</span>
                    </div>
                    <div className="futures-header__stat">
                        <span className="label">24h Change</span>
                        <span className={`value ${ticker.priceChangePercent < 0 ? 'negative' : 'positive'}`}>
                            {formatPrice(ticker.priceChange || 1.15)} {formatPercent(ticker.priceChangePercent || 0.30)}
                        </span>
                    </div>
                </div>
            </header>

            <div className="futures-grid">
                {/* Main Content Area: Chart */}
                <div className="futures-chart-area">
                    <DesktopChart />
                </div>

                {/* Order Book Column */}
                <div className="futures-order-book">
                    <div className="order-book-header">
                        <span>Price(BUSD)</span>
                        <span style={{ textAlign: 'right' }}>Size(BNB)</span>
                        <span style={{ textAlign: 'right' }}>Total</span>
                    </div>

                    <div className="order-book-list">
                        <div className="order-book-section asks">
                            {asks.map((ask, i) => (
                                <div key={i} className="order-book-row ask">
                                    <span className="price">{ask.price.toFixed(2)}</span>
                                    <span className="size">{ask.size.toFixed(2)}</span>
                                    <span className="total">{ask.total.toFixed(2)}</span>
                                    <div className="order-book-bar" style={{ width: `${(ask.size / 100) * 100}%` }}></div>
                                </div>
                            ))}
                        </div>

                        <div className="order-book-spread">
                            <span className="mid-price" style={{ color: ticker.priceChangePercent < 0 ? '#f6465d' : '#0ecb81' }}>
                                386.50
                            </span>
                            <span style={{ fontSize: '11px', color: '#848e9c' }}>More</span>
                        </div>

                        <div className="order-book-section bids">
                            {bids.map((bid, i) => (
                                <div key={i} className="order-book-row bid">
                                    <span className="price">{bid.price.toFixed(2)}</span>
                                    <span className="size">{bid.size.toFixed(2)}</span>
                                    <span className="total">{bid.total.toFixed(2)}</span>
                                    <div className="order-book-bar" style={{ width: `${(bid.size / 100) * 100}%` }}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Order Form Column */}
                <div className="futures-order-form">
                    <div className="order-form-modes">
                        <button className="mode-btn">Cross</button>
                        <button className="mode-btn">20x</button>
                    </div>

                    <div className="order-type-tabs">
                        <button className={`type-tab ${orderType === 'limit' ? 'active' : ''}`} onClick={() => setOrderType('limit')}>Limit</button>
                        <button className={`type-tab ${orderType === 'market' ? 'active' : ''}`} onClick={() => setOrderType('market')}>Market</button>
                        <button className={`type-tab ${orderType === 'stop' ? 'active' : ''}`} onClick={() => setOrderType('stop')}>Stop</button>
                    </div>

                    <div className="input-group">
                        <label>Price</label>
                        <div className="input-wrapper">
                            <input type="text" value="386.50" />
                            <span className="suffix">BUSD</span>
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Size</label>
                        <div className="input-wrapper">
                            <input type="text" placeholder="0.00" />
                            <span className="suffix">BNB</span>
                        </div>
                    </div>

                    <div className="percent-slider">
                        {[25, 50, 75, 100].map(p => (
                            <div key={p} className="percent-dot" title={`${p}%`}></div>
                        ))}
                    </div>

                    <div className="order-actions">
                        <button className="buy-btn">Buy / Long</button>
                        <button className="sell-btn">Sell / Short</button>
                    </div>

                    <div style={{ marginTop: '16px', fontSize: '12px', borderTop: '1px solid #2b3139', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{ color: '#848e9c' }}>Max Open</span>
                            <span>2.24 BNB</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#848e9c' }}>Cost</span>
                            <span>0.00 BUSD</span>
                        </div>
                    </div>
                </div>

                {/* Bottom Panel: Positions & Orders */}
                <div className="futures-bottom-panel">
                    <div className="futures-tabs">
                        <button
                            className={`futures-tab ${activeBottomTab === 'positions' ? 'active' : ''}`}
                            onClick={() => setActiveBottomTab('positions')}
                        >
                            Positions(2)
                        </button>
                        <button
                            className={`futures-tab ${activeBottomTab === 'orders' ? 'active' : ''}`}
                            onClick={() => setActiveBottomTab('orders')}
                        >
                            Open Orders(0)
                        </button>
                        <button
                            className={`futures-tab ${activeBottomTab === 'history' ? 'active' : ''}`}
                            onClick={() => setActiveBottomTab('history')}
                        >
                            Order History
                        </button>
                        <button
                            className={`futures-tab ${activeBottomTab === 'assets' ? 'active' : ''}`}
                            onClick={() => setActiveBottomTab('assets')}
                        >
                            Assets
                        </button>
                    </div>

                    <div style={{ flex: 1, overflow: 'auto' }}>
                        {activeBottomTab === 'positions' && (
                            <table className="positions-table">
                                <thead>
                                    <tr>
                                        <th>Symbol</th>
                                        <th>Size</th>
                                        <th>Entry Price</th>
                                        <th>Mark Price</th>
                                        <th>Liq. Price</th>
                                        <th>Margin Ratio</th>
                                        <th>PNL (ROE%)</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {positions.map((pos, i) => (
                                        <tr key={i}>
                                            <td>
                                                <span className={`pos-type ${pos.type.toLowerCase()}`}>{pos.type}</span>
                                                <span style={{ fontWeight: '700' }}>{pos.symbol}</span>
                                                <span style={{ color: '#848e9c', marginLeft: '4px' }}>{pos.leverage}</span>
                                            </td>
                                            <td>{pos.size}</td>
                                            <td>{pos.entryPrice}</td>
                                            <td>{pos.markPrice}</td>
                                            <td style={{ color: '#f0b90b' }}>{pos.liqPrice}</td>
                                            <td>0.01%</td>
                                            <td>
                                                <span className={`pnl-value ${pos.pnl.startsWith('+') ? 'positive' : 'negative'}`}>
                                                    {pos.pnl} BUSD ({pos.roe})
                                                </span>
                                            </td>
                                            <td>
                                                <button style={{ background: '#2b3139', border: 'none', color: '#f0f6fc', padding: '2px 8px', borderRadius: '2px', fontSize: '11px', cursor: 'pointer' }}>Market</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
