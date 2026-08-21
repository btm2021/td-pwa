import { Icon } from '../components/Icon';
import { activeTab, setActiveTab } from '../state/store';

const navItems = [
    { id: 'watchlist', icon: 'watchlist', label: 'Watchlist' },
    { id: 'chart', icon: 'chart', label: 'Chart' },
    { id: 'futures', icon: 'futures', label: 'Trade' },
    { id: 'scanner', icon: 'scanner', label: 'Scanner' },
    { id: 'account', icon: 'menu', label: 'Menu' },
    { id: 'notebook', icon: 'portfolio', label: 'Notebook' },
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
                    aria-label={item.label}
                    aria-current={currentTab === item.id ? 'page' : undefined}
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
