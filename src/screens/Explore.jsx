import { Card } from '../components/Card';
import { Icon } from '../components/Icon';

const categories = [
    { id: 'hot', label: '🔥 Hot', count: 128 },
    { id: 'gainers', label: '📈 Top Gainers', count: 50 },
    { id: 'losers', label: '📉 Top Losers', count: 50 },
    { id: 'volume', label: '💎 High Volume', count: 75 },
    { id: 'new', label: '✨ New Listings', count: 12 },
];

const trendingSymbols = [
    { symbol: 'PEPE', change: '+45.2%', isPositive: true },
    { symbol: 'WIF', change: '+23.8%', isPositive: true },
    { symbol: 'BONK', change: '+18.5%', isPositive: true },
    { symbol: 'SHIB', change: '-5.2%', isPositive: false },
];

export function Explore() {
    return (
        <div className="screen">
            {/* Search Bar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                marginBottom: '20px',
            }}>
                <Icon name="search" size={20} />
                <input
                    type="text"
                    placeholder="Search symbols, users..."
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        outline: 'none',
                    }}
                />
            </div>

            {/* Categories */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                }}>Categories</h3>
                <div style={{
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    paddingBottom: '8px',
                }}>
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            style={{
                                padding: '10px 16px',
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-primary)',
                                borderRadius: '20px',
                                color: 'var(--text-primary)',
                                fontSize: '13px',
                                fontWeight: 500,
                                whiteSpace: 'nowrap',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trending */}
            <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                }}>🔥 Trending Now</h3>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '12px',
                }}>
                    {trendingSymbols.map((item) => (
                        <div
                            key={item.symbol}
                            style={{
                                padding: '16px',
                                background: 'var(--bg-secondary)',
                                borderRadius: '12px',
                                border: '1px solid var(--border-primary)',
                                cursor: 'pointer',
                            }}
                        >
                            <div style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'var(--text-primary)',
                                marginBottom: '4px',
                            }}>{item.symbol}</div>
                            <div style={{
                                fontSize: '14px',
                                fontWeight: 500,
                                color: item.isPositive ? 'var(--accent-green)' : 'var(--accent-red)',
                            }}>{item.change}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Market Overview */}
            <div>
                <h3 style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '12px',
                }}>Market Overview</h3>
                <Card>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '16px',
                    }}>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total Market Cap</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>$3.42T</div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-green)' }}>+2.34%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>24h Volume</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>$142.8B</div>
                            <div style={{ fontSize: '12px', color: 'var(--accent-red)' }}>-5.12%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>BTC Dominance</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>54.2%</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Fear & Greed</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--accent-green)' }}>72 Greed</div>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
