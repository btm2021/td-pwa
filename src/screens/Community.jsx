import { Card } from '../components/Card';
import { Icon } from '../components/Icon';

const posts = [
    {
        id: 1,
        user: { name: 'CryptoWhale', initials: 'CW', verified: true },
        time: '2h ago',
        content: 'BTC looking strong here! The weekly close above 90k is very bullish. Next target: 100k 🚀',
        symbol: 'BTCUSDT',
        likes: 342,
        comments: 45,
        reposts: 23,
    },
    {
        id: 2,
        user: { name: 'TradingMaster', initials: 'TM', verified: false },
        time: '4h ago',
        content: 'SOL forming a beautiful cup and handle pattern on the daily. Entry around $195, target $250.',
        symbol: 'SOLUSDT',
        likes: 128,
        comments: 18,
        reposts: 8,
    },
    {
        id: 3,
        user: { name: 'ETHMaxi', initials: 'EM', verified: true },
        time: '6h ago',
        content: 'ETH 2.0 staking rewards are looking great! Building a nice passive income stream 💰',
        symbol: 'ETHUSDT',
        likes: 567,
        comments: 89,
        reposts: 45,
    },
];

export function Community() {
    return (
        <div className="screen screen--no-padding">
            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--border-primary)',
                background: 'var(--bg-secondary)',
            }}>
                {['Feed', 'Following', 'Trending'].map((tab, i) => (
                    <button
                        key={tab}
                        style={{
                            flex: 1,
                            padding: '14px 16px',
                            background: 'transparent',
                            border: 'none',
                            color: i === 0 ? 'var(--accent-blue)' : 'var(--text-tertiary)',
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            position: 'relative',
                        }}
                    >
                        {tab}
                        {i === 0 && (
                            <div style={{
                                position: 'absolute',
                                bottom: 0,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                width: '40px',
                                height: '2px',
                                background: 'var(--accent-blue)',
                                borderRadius: '2px 2px 0 0',
                            }} />
                        )}
                    </button>
                ))}
            </div>

            {/* Posts */}
            <div>
                {posts.map((post) => (
                    <div
                        key={post.id}
                        style={{
                            padding: '16px',
                            borderBottom: '1px solid var(--border-primary)',
                            background: 'var(--bg-secondary)',
                        }}
                    >
                        {/* Post Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '12px',
                        }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-blue-light))',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 600,
                                fontSize: '14px',
                            }}>
                                {post.user.initials}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{post.user.name}</span>
                                    {post.user.verified && (
                                        <span style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>✓</span>
                                    )}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{post.time}</div>
                            </div>
                            <button style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-tertiary)',
                                cursor: 'pointer',
                            }}>
                                <Icon name="more" size={20} />
                            </button>
                        </div>

                        {/* Post Content */}
                        <p style={{
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: 'var(--text-primary)',
                            marginBottom: '12px',
                        }}>
                            {post.content}
                        </p>

                        {/* Symbol Tag */}
                        <div style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            background: 'var(--bg-tertiary)',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: 'var(--accent-blue)',
                            fontWeight: 500,
                            marginBottom: '12px',
                        }}>
                            ${post.symbol}
                        </div>

                        {/* Post Actions */}
                        <div style={{
                            display: 'flex',
                            gap: '24px',
                        }}>
                            {[
                                { icon: '❤️', count: post.likes },
                                { icon: '💬', count: post.comments },
                                { icon: '🔄', count: post.reposts },
                            ].map((action, i) => (
                                <button
                                    key={i}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--text-tertiary)',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <span>{action.icon}</span>
                                    <span>{action.count}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
