import { useEffect } from 'preact/hooks';
import { SideNav } from './SideNav';
import { TopNav } from './TopNav';
import { isFullscreen, activeTab } from '../../state/store';

// Screens
import { Watchlist } from '../../screens/Watchlist';
import { Chart } from '../../screens/Chart';
import { Explore } from '../../screens/Explore';
import { Community } from '../../screens/Community';
import { Menu } from '../../screens/Menu';
import { Account } from '../../screens/Account';

// Desktop-specific Chart
import { DesktopChart } from '../../screens/desktop/DesktopChart';

const screens = {
    watchlist: Watchlist,
    chart: DesktopChart,
    explore: Explore,
    community: Community,
    menu: Menu,
    account: Account,
};

export function DesktopShell() {
    const fullscreen = isFullscreen.value;
    const currentTab = activeTab.value;

    // Add desktop-mode class to html element for global styling
    useEffect(() => {
        document.documentElement.classList.add('desktop-mode');
        document.body.style.backgroundColor = '#0B0B0E';
        document.body.style.background = '#0B0B0E';

        return () => {
            document.documentElement.classList.remove('desktop-mode');
        };
    }, []);

    // For desktop, Chart uses DesktopChart, others use same screens
    const Screen = screens[currentTab] || Watchlist;

    return (
        <div className={`desktop-shell ${fullscreen ? 'desktop-shell--fullscreen' : ''}`}>
            {/* Top Navigation */}
            {!fullscreen && <TopNav />}

            <div className="desktop-main">
                {/* Side Navigation */}
                {!fullscreen && <SideNav />}

                {/* Main Content Area */}
                <main className={`desktop-content ${currentTab === 'chart' ? 'desktop-content--chart' : ''}`}>
                    <Screen />
                </main>
            </div>
        </div>
    );
}

