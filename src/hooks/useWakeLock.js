import { useEffect, useRef } from 'preact/hooks';

/**
 * Hook to prevent the screen from turning off using the standard Screen Wake Lock API.
 * Note: This only works in Secure Contexts (HTTPS).
 */
export function useWakeLock() {
    const wakeLock = useRef(null);

    const requestWakeLock = async () => {
        // Only run if the API is supported and we're in a secure context
        if ('wakeLock' in navigator) {
            try {
                // If we already have a lock that isn't released, don't request another
                if (wakeLock.current && !wakeLock.current.released) {
                    return;
                }

                wakeLock.current = await navigator.wakeLock.request('screen');
                console.log('🛡️ System Wake Lock: ACTIVE');

                wakeLock.current.addEventListener('release', () => {
                    console.log('🛡️ System Wake Lock: RELEASED');
                    wakeLock.current = null;
                });
            } catch (err) {
                console.warn(`🛡️ System Wake Lock Error: ${err.name}, ${err.message}`);
            }
        } else {
            // Probably not on HTTPS or an older browser
            console.warn('🛡️ System Wake Lock: Not supported or not in a Secure Context (HTTPS)');
        }
    };

    const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible') {
            await requestWakeLock();
        }
    };

    useEffect(() => {
        // Initial request on mount
        requestWakeLock();

        // Standard behavior: Wake lock is released when the tab is hidden.
        // We re-acquire it when the tab becomes visible again.
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (wakeLock.current) {
                wakeLock.current.release();
                wakeLock.current = null;
            }
        };
    }, []);
}
