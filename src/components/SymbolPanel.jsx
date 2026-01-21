import { useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { formatPrice, formatPercent, formatVolume, getCoinLogoUrl, getBaseAsset } from '../state/watchlist';
import { navigateToChart } from '../state/store';
import { deviceMode } from '../hooks/useDeviceMode';

export function SymbolPanel({ symbol, ticker, onClose }) {
    const [imgError, setImgError] = useState(false);
    const isDesktop = deviceMode.value === 'desktop';

    // Fallback ticker if data not yet available
    const displayTicker = ticker || {
        price: 0,
        priceChangePercent: 0,
        high: 0,
        low: 0,
        volume: 0,
        quoteVolume: 0
    };

    const isPositive = displayTicker.priceChangePercent >= 0;
    const baseAsset = getBaseAsset(symbol).toUpperCase();
    const isForex = !symbol.includes('USDT') && !symbol.includes('BUSD');
    const quoteAsset = isForex ? symbol.substring(3) : 'USDT';
    const subtitle = isForex ? `${baseAsset} / ${quoteAsset}` : `${baseAsset} / USDT Perpetual`;

    const handleGoToChart = () => {
        // Ensure OANDA prefix for forex
        const chartSymbol = isForex && !symbol.startsWith('OANDA:') ? `OANDA:${symbol}` : symbol;
        navigateToChart(chartSymbol);
        onClose();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Desktop Modal Layout
    if (isDesktop) {
        return (
            <>
                {/* Backdrop */}
                <div
                    className="symbol-modal__backdrop"
                    onClick={handleBackdropClick}
                >
                    {/* Modal */}
                    <div className="symbol-modal">
                        {/* Header */}
                        <div className="symbol-modal__header">
                            <div className="symbol-modal__icon">
                                {!imgError ? (
                                    <img
                                        src={getCoinLogoUrl(symbol)}
                                        alt={baseAsset}
                                        onError={() => setImgError(true)}
                                    />
                                ) : (
                                    <span>{baseAsset.charAt(0)}</span>
                                )}
                            </div>
                            <div className="symbol-modal__title">
                                <h2>{symbol}</h2>
                                <span>{subtitle}</span>
                            </div>
                            <button className="symbol-modal__close" onClick={onClose}>
                                <Icon name="close" size={20} />
                            </button>
                        </div>

                        {/* Price Section */}
                        <div className="symbol-modal__price">
                            <span className="symbol-modal__price-value">
                                ${formatPrice(displayTicker.price)}
                            </span>
                            <span className={`symbol-modal__price-change ${isPositive ? 'positive' : 'negative'}`}>
                                {formatPercent(displayTicker.priceChangePercent)}
                            </span>
                        </div>

                        {/* Mini Chart */}
                        <div className="symbol-modal__chart">
                            <svg width="100%" height="120" viewBox="0 0 400 120" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id={`chartGradient-desktop-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={isPositive ? '#00C853' : '#FF3B30'} stopOpacity="0.3" />
                                        <stop offset="100%" stopColor={isPositive ? '#00C853' : '#FF3B30'} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {(() => {
                                    const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                                    const points = [];
                                    for (let i = 0; i <= 15; i++) {
                                        const x = (i / 15) * 400;
                                        const y = 30 + Math.sin(seed + i * 0.5) * 25 + Math.cos(seed * 0.3 + i) * 20 + (isPositive ? (15 - i) * 4 : i * 4);
                                        points.push(`${x},${Math.max(15, Math.min(105, y))}`);
                                    }
                                    const linePath = `M${points.join(' L')}`;
                                    const areaPath = `${linePath} L400,120 L0,120 Z`;

                                    return (
                                        <>
                                            <path d={areaPath} fill={`url(#chartGradient-desktop-${symbol})`} />
                                            <path d={linePath} fill="none" stroke={isPositive ? '#00C853' : '#FF3B30'} strokeWidth="2" />
                                        </>
                                    );
                                })()}
                            </svg>
                        </div>

                        {/* Stats Grid - 2x2 */}
                        <div className="symbol-modal__stats">
                            <div className="symbol-modal__stat">
                                <span className="label">24h High</span>
                                <span className="value positive">${formatPrice(displayTicker.high)}</span>
                            </div>
                            <div className="symbol-modal__stat">
                                <span className="label">24h Low</span>
                                <span className="value negative">${formatPrice(displayTicker.low)}</span>
                            </div>
                            <div className="symbol-modal__stat">
                                <span className="label">24h Volume</span>
                                <span className="value">{formatVolume(displayTicker.volume)} {baseAsset}</span>
                            </div>
                            <div className="symbol-modal__stat">
                                <span className="label">24h Turnover</span>
                                <span className="value">${formatVolume(displayTicker.quoteVolume)}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="symbol-modal__actions">
                            <button className="symbol-modal__btn symbol-modal__btn--primary" onClick={handleGoToChart}>
                                <Icon name="chart" size={18} />
                                Open Chart
                            </button>
                            <button className="symbol-modal__btn symbol-modal__btn--secondary">
                                <Icon name="star" size={18} />
                                Add to Favorites
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Mobile Bottom Sheet Layout (original)
    return (
        <>
            {/* Backdrop */}
            <div
                className="symbol-panel__backdrop"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="symbol-panel">
                {/* Handle */}
                <div className="symbol-panel__handle" />

                {/* Header */}
                <div className="symbol-panel__header">
                    <div className="symbol-panel__icon">
                        {!imgError ? (
                            <img
                                src={getCoinLogoUrl(symbol)}
                                alt={baseAsset}
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <span>{baseAsset.charAt(0)}</span>
                        )}
                    </div>
                    <div className="symbol-panel__title">
                        <h2>{symbol}</h2>
                        <span>{subtitle}</span>
                    </div>
                    <div className="symbol-panel__actions-header">
                        <button className="btn--icon-circle" onClick={handleGoToChart} title="Open Chart">
                            <Icon name="chart" size={20} />
                        </button>
                        <button className="symbol-panel__close" onClick={onClose}>
                            <Icon name="close" size={24} />
                        </button>
                    </div>
                </div>

                {/* Price */}
                <div className="symbol-panel__price">
                    <span className="symbol-panel__price-value">
                        ${formatPrice(displayTicker.price)}
                    </span>
                    <span className={`symbol-panel__price-change ${isPositive ? 'positive' : 'negative'}`}>
                        {formatPercent(displayTicker.priceChangePercent)}
                    </span>
                </div>

                {/* Mini Chart Placeholder */}
                <div className="symbol-panel__chart">
                    <svg width="100%" height="100" viewBox="0 0 300 100" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={`chartGradient-${symbol}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={isPositive ? '#00C853' : '#FF3B30'} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={isPositive ? '#00C853' : '#FF3B30'} stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        {/* Generate random chart path based on symbol for uniqueness */}
                        {(() => {
                            const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                            const points = [];
                            for (let i = 0; i <= 10; i++) {
                                const x = (i / 10) * 300;
                                const y = 20 + Math.sin(seed + i * 0.5) * 20 + Math.cos(seed * 0.3 + i) * 15 + (isPositive ? (10 - i) * 5 : i * 5);
                                points.push(`${x},${Math.max(10, Math.min(90, y))}`);
                            }
                            const linePath = `M${points.join(' L')}`;
                            const areaPath = `${linePath} L300,100 L0,100 Z`;

                            return (
                                <>
                                    <path d={areaPath} fill={`url(#chartGradient-${symbol})`} />
                                    <path d={linePath} fill="none" stroke={isPositive ? '#00C853' : '#FF3B30'} strokeWidth="2" />
                                </>
                            );
                        })()}
                    </svg>
                </div>

                {/* Stats Grid */}
                <div className="symbol-panel__stats">
                    <div className="symbol-panel__stat">
                        <span className="label">24h High</span>
                        <span className="value">${formatPrice(displayTicker.high)}</span>
                    </div>
                    <div className="symbol-panel__stat">
                        <span className="label">24h Low</span>
                        <span className="value">${formatPrice(displayTicker.low)}</span>
                    </div>
                    <div className="symbol-panel__stat">
                        <span className="label">24h Volume</span>
                        <span className="value">{formatVolume(displayTicker.volume)} {baseAsset}</span>
                    </div>
                    <div className="symbol-panel__stat">
                        <span className="label">24h Turnover</span>
                        <span className="value">${formatVolume(displayTicker.quoteVolume)}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="symbol-panel__actions">
                    <button className="symbol-panel__btn symbol-panel__btn--primary" onClick={handleGoToChart}>
                        <Icon name="chart" size={20} />
                        Open Chart
                    </button>
                    <button className="symbol-panel__btn symbol-panel__btn--secondary">
                        <Icon name="star" size={20} />
                        Add to Favorites
                    </button>
                </div>
            </div>
        </>
    );
}
