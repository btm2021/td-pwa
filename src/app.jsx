import { useState, useEffect } from 'preact/hooks';

// Styles
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';

// Components
import { SplashScreen } from './components/SplashScreen';
import { AppShell } from './layout/AppShell';

// State
import { subscribeToTickers } from './state/watchlist';

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

// Theme color meta
const themeColorMeta = document.createElement('meta');
themeColorMeta.name = 'theme-color';
themeColorMeta.content = '#0B0B0E';
document.head.appendChild(themeColorMeta);

// Apple mobile web app capable
const appleMeta = document.createElement('meta');
appleMeta.name = 'apple-mobile-web-app-capable';
appleMeta.content = 'yes';
document.head.appendChild(appleMeta);

const appleStatusBar = document.createElement('meta');
appleStatusBar.name = 'apple-mobile-web-app-status-bar-style';
appleStatusBar.content = 'black-translucent';
document.head.appendChild(appleStatusBar);

export function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Subscribe to ticker data during splash
    subscribeToTickers();

    // Mark ready after a small delay for data to arrive
    const timeout = setTimeout(() => {
      setIsReady(true);
    }, 1500);

    return () => clearTimeout(timeout);
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

  return <AppShell />;
}
