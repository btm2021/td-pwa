import { useEffect, useState } from 'preact/hooks';

export function SplashScreen({ onComplete }) {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Initializing...');

    useEffect(() => {
        const steps = [
            { progress: 20, status: 'Loading assets...' },
            { progress: 40, status: 'Connecting to market...' },
            { progress: 60, status: 'Fetching prices...' },
            { progress: 80, status: 'Setting up charts...' },
            { progress: 100, status: 'Ready!' },
        ];

        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                setProgress(steps[currentStep].progress);
                setStatus(steps[currentStep].status);
                currentStep++;
            } else {
                clearInterval(interval);
                setTimeout(() => onComplete(), 300);
            }
        }, 400);

        return () => clearInterval(interval);
    }, [onComplete]);

    return (
        <div className="splash-screen">
            {/* Logo */}
            <div className="splash-screen__logo">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <defs>
                        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#2979FF" />
                            <stop offset="100%" stopColor="#00C853" />
                        </linearGradient>
                    </defs>
                    <rect x="8" y="8" width="64" height="64" rx="16" fill="url(#logoGradient)" />
                    <path
                        d="M24 50 L32 38 L40 44 L52 28 L56 32 L40 52 L32 46 L24 54 Z"
                        fill="white"
                        opacity="0.9"
                    />
                    <circle cx="56" cy="28" r="4" fill="white" />
                </svg>
            </div>

            {/* App Name */}
            <h1 className="splash-screen__title">TradingView</h1>
            <p className="splash-screen__subtitle">Mobile Trading</p>

            {/* Progress Bar */}
            <div className="splash-screen__progress">
                <div
                    className="splash-screen__progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Status */}
            <p className="splash-screen__status">{status}</p>

            {/* Version */}
            <p className="splash-screen__version">v1.0.0</p>
        </div>
    );
}
