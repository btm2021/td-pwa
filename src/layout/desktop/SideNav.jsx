import { Icon } from '../../components/Icon';
import { activeTab, setActiveTab } from '../../state/store';
import { deviceMode, setDeviceMode } from '../../hooks/useDeviceMode';

const navItems = [
    { id: 'watchlist', icon: 'watchlist', label: 'Watchlist', shortcut: 'W' },
    { id: 'chart', icon: 'chart', label: 'Chart', shortcut: 'C' },
    { id: 'account', icon: 'wallet', label: 'Account', shortcut: 'A' },
    { id: 'explore', icon: 'explore', label: 'Explore', shortcut: 'E' },
];

const bottomItems = [
    { id: 'menu', icon: 'settings', label: 'Settings' },
];

export function SideNav() {
    const currentTab = activeTab.value;

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
    };

    const handleSwitchToMobile = () => {
        setDeviceMode('mobile');
    };

    return (
        <nav className="side-nav">
            {/* Logo */}


            {/* Main Nav Items */}
            <div className="side-nav__main">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        className={`side-nav__item ${currentTab === item.id ? 'side-nav__item--active' : ''}`}
                        onClick={() => handleTabClick(item.id)}
                        title={`${item.label} (${item.shortcut})`}
                    >
                        <span className="side-nav__icon">
                            <Icon name={item.icon} size={22} />
                        </span>
                        <span className="side-nav__label">{item.label}</span>
                        {currentTab === item.id && <span className="side-nav__indicator" />}
                    </button>
                ))}
            </div>

            {/* Bottom Items */}
            <div className="side-nav__bottom">
                {/* Switch to Mobile */}
                <button
                    className="side-nav__item side-nav__item--subtle"
                    onClick={handleSwitchToMobile}
                    title="Switch to Mobile View"
                >
                    <span className="side-nav__icon">
                        <Icon name="mobile" size={20} />
                    </span>
                    <span className="side-nav__label">Mobile</span>
                </button>

                {bottomItems.map((item) => (
                    <button
                        key={item.id}
                        className={`side-nav__item ${currentTab === item.id ? 'side-nav__item--active' : ''}`}
                        onClick={() => handleTabClick(item.id)}
                        title={item.label}
                    >
                        <span className="side-nav__icon">
                            <Icon name={item.icon} size={22} />
                        </span>
                        <span className="side-nav__label">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}
