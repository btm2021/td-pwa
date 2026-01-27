import { Icon } from '../components/Icon';
import { activeTab, setActiveTab } from '../state/store';

const navItems = [
    { id: 'watchlist', icon: 'watchlist', label: 'Watchlist' },
    { id: 'chart', icon: 'chart', label: 'Chart' },
    { id: 'scanner', icon: 'search', label: 'Scanner' },
    { id: 'calendar', icon: 'calendar', label: 'Calendar' },
    { id: 'account', icon: 'wallet', label: 'Account' },
    { id: 'menu', icon: 'menu', label: 'Menu' },
];

export function BottomNav() {
    const currentTab = activeTab.value;

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
    };

    return (
        <nav className="bottom-nav">
            {navItems.map((item) => (
                <button
                    key={item.id}
                    className={`bottom-nav__item ${currentTab === item.id ? 'bottom-nav__item--active' : ''}`}
                    onClick={() => handleTabClick(item.id)}
                >
                    <span className="bottom-nav__icon">
                        <Icon name={item.icon} size={22} />
                    </span>
                    <span className="bottom-nav__label">{item.label}</span>
                </button>
            ))}
        </nav>
    );
}
