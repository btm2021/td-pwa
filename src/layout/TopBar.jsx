import { Icon } from '../components/Icon';
import { selectedSymbol } from '../state/store';

export function TopBar({ type = 'default', title = '' }) {
    const symbol = selectedSymbol.value;

    // Different TopBar layouts based on screen type
    if (type === 'chart') {
        return (
            <header className="top-bar">
                <div className="top-bar__left">
                    <div className="top-bar__symbol-info">
                        <span className="top-bar__title">{symbol.symbol}</span>
                        <span className="status-dot"></span>
                    </div>
                </div>
                <div className="top-bar__center">
                    <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                        {symbol.exchange}
                    </span>
                </div>
                <div className="top-bar__right">
                    <button className="dropdown__trigger">
                        <span>USDT</span>
                        <Icon name="chevronDown" size={16} />
                    </button>
                </div>
            </header>
        );
    }

    if (type === 'watchlist') {
        return (
            <header className="top-bar">
                <div className="top-bar__left">
                    <span className="top-bar__title">Watchlist</span>
                </div>
                <div className="top-bar__right">
                    <button className="btn btn--icon btn--ghost">
                        <Icon name="search" size={20} />
                    </button>
                    <button className="btn btn--icon btn--ghost">
                        <Icon name="plus" size={20} />
                    </button>
                </div>
            </header>
        );
    }

    if (type === 'menu') {
        return (
            <header className="top-bar">
                <div className="top-bar__left">
                    <span className="top-bar__title">Menu</span>
                </div>
                <div className="top-bar__right">
                    <button className="btn btn--icon btn--ghost">
                        <Icon name="settings" size={20} />
                    </button>
                </div>
            </header>
        );
    }

    // Default TopBar
    return (
        <header className="top-bar">
            <div className="top-bar__left">
                <span className="top-bar__title">{title}</span>
            </div>
            <div className="top-bar__right">
                <button className="btn btn--icon btn--ghost">
                    <Icon name="notification" size={20} />
                </button>
            </div>
        </header>
    );
}
