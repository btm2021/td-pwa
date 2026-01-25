import { useState, useEffect } from 'preact/hooks';
import { Icon } from '../../components/Icon';
import './Scanner.css';

export function Scanner() {
    const [sources, setSources] = useState([
        { id: 'binance', name: 'Binance', status: 'connected', count: 1542 },
        { id: 'bybit', name: 'Bybit', status: 'connected', count: 823 },
        { id: 'okx', name: 'OKX', status: 'disconnected', count: 0 },
    ]);

    return (
        <div className="scanner-screen">
            <header className="scanner-header">
                <div className="header-content">
                    <h1>Scanner</h1>
                    <div className="status-badge">
                        <span className="pulse-dot"></span>
                        Live Monitoring
                    </div>
                </div>
                <div className="header-actions">
                    <button className="action-btn">
                        <Icon name="search" size={18} />
                    </button>
                    <button className="action-btn">
                        <Icon name="settings" size={18} />
                    </button>
                </div>
            </header>

            <div className="scanner-grid">
                <aside className="scanner-sidebar">
                    <section className="sources-section">
                        <h3>Data Sources</h3>
                        <div className="sources-list">
                            {sources.map(source => (
                                <div key={source.id} className={`source-item ${source.status}`}>
                                    <div className="source-info">
                                        <span className="source-name">{source.name}</span>
                                        <span className="pairs-count">{source.count} pairs</span>
                                    </div>
                                    <div className="status-indicator"></div>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>

                <main className="scanner-main">
                    <div className="scanner-stats">
                        <div className="stat-card">
                            <span className="label">Total Pairs</span>
                            <span className="value">2,365</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">Updates / Sec</span>
                            <span className="value">142</span>
                        </div>
                        <div className="stat-card">
                            <span className="label">Latency</span>
                            <span className="value">45ms</span>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="scanner-table">
                            <thead>
                                <tr>
                                    <th>Symbol</th>
                                    <th>Price</th>
                                    <th>24h %</th>
                                    <th>Volume</th>
                                    <th>Source</th>
                                    <th>Last Update</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Mock data for now */}
                                {[...Array(10)].map((_, i) => (
                                    <tr key={i}>
                                        <td className="symbol-cell">
                                            <span className="symbol">BTCUSDT</span>
                                            <span className="type">PERP</span>
                                        </td>
                                        <td className="price-cell">45,231.50</td>
                                        <td className="change-cell positive">+2.45%</td>
                                        <td className="volume-cell">1.2B</td>
                                        <td className="source-cell">Binance</td>
                                        <td className="time-cell">Just now</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </main>
            </div>
        </div>
    );
}
