import { Icon } from '../../components/Icon';

export function TopNav() {
    return (
        <header className="top-nav">
            <div className="top-nav__left">
                {/* Brand Logo */}
                <div className="top-nav__brand">
                    <div className="top-nav__logo">
                        <svg viewBox="0 0 32 32" fill="none">
                            <rect width="32" height="32" rx="8" fill="url(#mint-gradient)" />
                            <path d="M9 18L12 14L16 18L23 11" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="mint-gradient" x1="0" y1="0" x2="32" y2="32">
                                    <stop stopColor="#2979FF" />
                                    <stop offset="1" stopColor="#00C853" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <h1 className="top-nav__brand-name">Mint</h1>
                </div>
            </div>

            <div className="top-nav__center">
                {/* Global Search */}
                <div className="top-nav__search">
                    <Icon name="search" size={18} />
                    <input
                        type="text"
                        placeholder="Search symbols, markets..."
                        className="top-nav__search-input"
                    />
                    <span className="top-nav__search-shortcut">/</span>
                </div>
            </div>

            <div className="top-nav__right">
                {/* Notifications */}
                <button className="top-nav__btn" title="Notifications">
                    <Icon name="notification" size={20} />
                </button>

                {/* User Menu */}
                <button className="top-nav__btn top-nav__btn--user" title="Account">
                    <div className="top-nav__avatar">
                        <Icon name="user" size={18} />
                    </div>
                </button>
            </div>
        </header>
    );
}
