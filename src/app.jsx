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

// State
import { subscribeToTickers } from './state/watchlist';
import { deviceMode, initDeviceMode, loadUserPreference, setDeviceMode } from './hooks/useDeviceMode';

// Google Font
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

// Meta viewport for mobile
const existingViewport = document.querySelector('meta[name="viewport"]');
if (existingViewport) {
  existingViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
}

// Mode Toggle Button Component (shown on mobile to switch to desktop)
function ModeToggle() {
  const mode = deviceMode.value;

  const handleClick = () => {
    setDeviceMode(mode === 'mobile' ? 'desktop' : 'mobile');
  };

  // Only show in mobile mode for switching to desktop
  if (mode !== 'mobile') return null;

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

    // Subscribe to ticker data during splash
    subscribeToTickers();

    // Mark ready after a small delay for data to arrive
    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => {
      clearTimeout(timeout);
      cleanupDeviceMode();
    };
  }, []);

  const handleSplashComplete = () => {
    if (isReady) {
      setShowSplash(false);
    } else {
      // Wait for ready state
      const checkReady = setInterval(() => {
        setShowSplash(false);
        clearInterval(checkReady);
      }, 100);
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  // Render based on device mode
  return (
    <>
      {mode === 'desktop' ? <DesktopShell /> : <AppShell />}
      {mode === 'mobile' && <ModeToggle />}
    </>
  );
}
