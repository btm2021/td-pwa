
import { Icon } from '../../components/Icon';
import { setActiveTab } from '../../state/store';

export function TopNav() {
    return (
        <header className="top-nav">
            <div className="top-nav__left">
                {/* Brand Logo */}
                <a href="/" className="top-nav__brand">
                    <h1 className="top-nav__brand-name">Mint</h1>
                </a>
            </div>



            <div className="top-nav__right">
                {/* Notifications */}
                <button className="top-nav__btn" title="Notifications">
                    <Icon name="notification" size={20} />
                </button>

                {/* User Menu */}
                <button
                    className="top-nav__btn top-nav__btn--user"
                    title="Settings"
                    onClick={() => setActiveTab('menu')}
                >
                    <div className="top-nav__avatar">
                        <Icon name="user" size={18} />
                    </div>
                </button>
            </div>
        </header>
    );
}
