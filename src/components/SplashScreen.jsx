import { useEffect, useState } from 'preact/hooks';

const STARTUP_STEPS = [
    { label: 'Interface ready', detail: 'Loading workspace' },
    { label: 'Market sources ready', detail: 'Preparing market sources' },
    { label: 'Watchlist prepared', detail: 'Restoring your watchlist' },
];

export function SplashScreen({ onComplete, ready }) {
    const [completedSteps, setCompletedSteps] = useState(0);
    const [progress, setProgress] = useState(8);

    useEffect(() => {
        const interval = setInterval(() => {
            setCompletedSteps((current) => {
                if (current >= STARTUP_STEPS.length - 1) return current;
                return current + 1;
            });
        }, 280);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const baseProgress = [24, 54, 82][completedSteps];
        setProgress(ready ? 100 : baseProgress);
    }, [completedSteps, ready]);

    useEffect(() => {
        if (!ready || completedSteps < STARTUP_STEPS.length - 1) return undefined;

        const timeout = setTimeout(onComplete, 260);
        return () => clearTimeout(timeout);
    }, [completedSteps, onComplete, ready]);

    const status = ready
        ? 'Your market view is ready'
        : STARTUP_STEPS[completedSteps].detail;

    return (
        <main className="splash-screen" aria-label="Preparing Mint Hunter">
            <div className="splash-screen__grid" aria-hidden="true" />
            <div className="splash-screen__content">
                <div className="splash-screen__mark" aria-hidden="true">
                    <svg viewBox="0 0 96 96" fill="none">
                        <circle cx="48" cy="48" r="39" />
                        <path d="M14 52h17l7-10 8 18 14-34 9 26h13" />
                    </svg>
                </div>

                <div className="splash-screen__brand">
                    <h1>Mint Hunter</h1>
                    <p>Market workspace</p>
                </div>

                <ol className="splash-screen__steps">
                    {STARTUP_STEPS.map((step, index) => {
                        const state = index < completedSteps ? 'done' : index === completedSteps ? 'current' : 'pending';
                        return (
                            <li key={step.label} className={`splash-screen__step splash-screen__step--${state}`}>
                                <span className="splash-screen__step-icon">
                                    {state === 'done' ? '✓' : <span />}
                                </span>
                                <span>{step.label}</span>
                            </li>
                        );
                    })}
                </ol>

                <div className="splash-screen__progress-wrap">
                    <div className="splash-screen__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
                        <div className="splash-screen__progress-bar" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="splash-screen__status" aria-live="polite">{status}</p>
                </div>
            </div>
            <p className="splash-screen__version">v1.0.0</p>
        </main>
    );
}
