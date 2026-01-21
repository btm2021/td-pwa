import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { isFullscreen, activeTab } from '../state/store';

// Screens
import { Watchlist } from '../screens/Watchlist';
import { Chart } from '../screens/Chart';
import { Explore } from '../screens/Explore';
import { Community } from '../screens/Community';
import { Menu } from '../screens/Menu';
import { Account } from '../screens/Account';

// Screens that have their own header (no TopBar needed)
const screensWithOwnHeader = ['watchlist', 'chart', 'account'];

const topBarConfig = {
    chart: { type: 'chart' },
    explore: { type: 'default', title: 'Explore' },
    community: { type: 'default', title: 'Community' },
    menu: { type: 'menu' },
};

const screens = {
    watchlist: Watchlist,
    chart: Chart,
    explore: Explore,
    community: Community,
    menu: Menu,
    account: Account,
};

export function AppShell() {
    const fullscreen = isFullscreen.value;
    const currentTab = activeTab.value;

    const Screen = screens[currentTab] || Watchlist;
    const topBarProps = topBarConfig[currentTab];
    const showTopBar = !screensWithOwnHeader.includes(currentTab) && topBarProps;

    return (
        <div className={`app-shell ${fullscreen ? 'app-shell--fullscreen' : ''}`}>
            {showTopBar && <TopBar {...topBarProps} />}
            <main className={`main-content ${currentTab === 'chart' ? 'main-content--no-scroll' : ''}`}>
                <Screen />
            </main>
            <BottomNav />
        </div>
    );
}
