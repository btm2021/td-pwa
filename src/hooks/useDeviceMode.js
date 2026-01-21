import { signal, effect } from '@preact/signals';

// Device mode signal - 'mobile' or 'desktop'
export const deviceMode = signal('mobile');

// Breakpoint for desktop (TradingView uses 768px)
const DESKTOP_BREAKPOINT = 1024;

// Check if device is desktop
function checkDeviceMode() {
    const width = window.innerWidth;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Consider desktop if screen is wide enough and not primarily touch
    if (width >= DESKTOP_BREAKPOINT) {
        return 'desktop';
    }
    return 'mobile';
}

// Initialize and setup listener
export function initDeviceMode() {
    // Set initial mode
    deviceMode.value = checkDeviceMode();
    
    // Listen for resize
    let resizeTimer;
    const handleResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            deviceMode.value = checkDeviceMode();
        }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
        window.removeEventListener('resize', handleResize);
        clearTimeout(resizeTimer);
    };
}

// Force mode (for testing or user preference)
export function setDeviceMode(mode) {
    if (mode === 'mobile' || mode === 'desktop') {
        deviceMode.value = mode;
        localStorage.setItem('preferredMode', mode);
    }
}

// Check for user preference on load
export function loadUserPreference() {
    const preferred = localStorage.getItem('preferredMode');
    if (preferred === 'mobile' || preferred === 'desktop') {
        // Only apply if not dramatically different from actual screen
        const actualMode = checkDeviceMode();
        // Allow forcing mobile on desktop, but not desktop on tiny mobile
        if (preferred === 'mobile' || (preferred === 'desktop' && window.innerWidth >= 768)) {
            deviceMode.value = preferred;
        }
    }
}

// Computed helpers
export function isMobile() {
    return deviceMode.value === 'mobile';
}

export function isDesktop() {
    return deviceMode.value === 'desktop';
}
