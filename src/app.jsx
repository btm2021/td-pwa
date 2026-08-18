import { useState, useEffect } from 'preact/hooks';

// Styles
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/desktop.css';
import './styles/account.css';
import './styles/calendar.css';

// Components
import { SplashScreen } from './components/SplashScreen';
import { AppShell } from './layout/AppShell';
import { DesktopShell } from './layout/desktop/DesktopShell';
import { Icon } from './components/Icon';

import { deviceMode, initDeviceMode, loadUserPreference, setDeviceMode } from './hooks/useDeviceMode';
import { activeTab } from './state/store';
import {
  activeCategory as activeWatchlistCategory,
  subscribeToExchange,
  unsubscribeFromTickers
} from './state/watchlist';

// Google Font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Mode Toggle Button Component (shown on mobile to switch to desktop)
function ModeToggle() {
    const mode = deviceMode.value;
    const currentTab = activeTab.value;

  const handleClick = () => {
    setDeviceMode(mode === 'mobile' ? 'desktop' : 'mobile');
  };

  // Only show in mobile mode for switching to desktop
  if (mode !== 'mobile' || currentTab === 'chart') return null;

  return (
    <button
      className="mode-toggle"
      onClick={handleClick}
      title="Switch to Desktop Mode"
    >
      <Icon name="desktop" size={20} />
    </button>
  );
}

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const mode = deviceMode.value;

  useEffect(() => {
    // Initialize device mode detection
    const cleanupDeviceMode = initDeviceMode();
    loadUserPreference();

    // The signal subscription fires immediately, so Binance (the default
    // category) is seeded before the splash screen finishes. Restored and
    // clicked categories use this same single lifecycle owner.
    const unsubscribeMarketSelection = activeWatchlistCategory.subscribe((categoryId) => {
      subscribeToExchange(categoryId);
    });

    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => {
      clearTimeout(timeout);
      unsubscribeMarketSelection();
      unsubscribeFromTickers();
      cleanupDeviceMode();
    };
  }, []);

  const handleSplashComplete = () => setShowSplash(false);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} ready={isReady} />;
  }

  // Render based on device mode
  return (
    <>
      {mode === 'desktop' ? <DesktopShell /> : <AppShell />}
      {mode === 'mobile' && <ModeToggle />}
    </>
  );
}
