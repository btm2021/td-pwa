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
import { Scanner } from '../screens/Scanner';
import { Calendar } from '../screens/Calendar';
import { Futures } from '../screens/Futures';


// Screens that have their own header (no TopBar needed)
const screensWithOwnHeader = ['watchlist', 'chart', 'futures', 'account', 'calendar'];

const topBarConfig = {
    chart: { type: 'chart' },
    explore: { type: 'default', title: 'Explore' },
    community: { type: 'default', title: 'Community' },
    menu: { type: 'menu' },
};

const screens = {
    watchlist: Watchlist,
    chart: Chart,
    futures: Futures,
    explore: Explore,
    community: Community,
    account: Account,
    scanner: Scanner,
    calendar: Calendar,
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
