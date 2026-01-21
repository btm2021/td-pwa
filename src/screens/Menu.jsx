import { Icon } from '../components/Icon';

const menuSections = [
    {
        title: null,
        items: [
            { icon: 'subscription', label: 'Subscription', chevron: true },
            { icon: 'gift', label: 'Refer a friend', chevron: true },
        ],
    },
    {
        title: 'Settings',
        items: [
            { icon: 'restore', label: 'Restore purchases', chevron: true },
            { icon: 'star', label: 'Rate us', chevron: true },
            { icon: 'help', label: 'Help Center', chevron: true },
            { icon: 'info', label: 'About', chevron: true },
        ],
    },
    {
        title: null,
        items: [
            { icon: 'logout', label: 'Sign out', danger: true },
        ],
    },
];

export function Menu() {
    return (
        <div className="screen screen--no-padding">
            {/* Profile Card */}
            <div className="profile-card">
                <div className="profile-card__avatar">T</div>
                <div className="profile-card__info">
                    <div className="profile-card__name">Trader</div>
                    <div className="profile-card__plan">BASIC</div>
                    <div className="profile-card__stats">
                        <span className="profile-card__stat">
                            <strong>128</strong> Followers
                        </span>
                        <span className="profile-card__stat">
                            <strong>45</strong> Following
                        </span>
                    </div>
                </div>
            </div>

            {/* Upgrade Banner */}
            <div style={{
                margin: '16px',
                padding: '16px',
                background: 'linear-gradient(135deg, rgba(41, 121, 255, 0.2), rgba(130, 177, 255, 0.1))',
                borderRadius: '12px',
                border: '1px solid rgba(41, 121, 255, 0.3)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <div>
                        <div style={{
                            fontSize: '16px',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                        }}>Upgrade to Pro</div>
                        <div style={{
                            fontSize: '13px',
                            color: 'var(--text-secondary)',
                        }}>Unlock advanced charts & features</div>
                    </div>
                    <button style={{
                        padding: '10px 20px',
                        background: 'var(--accent-blue)',
                        border: 'none',
                        borderRadius: '8px',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '14px',
                        cursor: 'pointer',
                    }}>
                        Upgrade
                    </button>
                </div>
            </div>

            {/* Menu Sections */}
            {menuSections.map((section, sectionIndex) => (
                <div key={sectionIndex}>
                    {section.title && (
                        <div className="section-header">{section.title}</div>
                    )}
                    <ul className="menu-list">
                        {section.items.map((item, itemIndex) => (
                            <li
                                key={itemIndex}
                                className={`menu-list__item ${item.danger ? 'menu-list__item--danger' : ''}`}
                            >
                                <span className="menu-list__icon">
                                    <Icon name={item.icon} size={22} />
                                </span>
                                <span className="menu-list__text">{item.label}</span>
                                {item.chevron && (
                                    <span className="menu-list__chevron">
                                        <Icon name="chevronRight" size={20} />
                                    </span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            {/* App Version */}
            <div style={{
                textAlign: 'center',
                padding: '24px',
                color: 'var(--text-tertiary)',
                fontSize: '12px',
            }}>
                Version 1.0.0
            </div>
        </div>
    );
}
