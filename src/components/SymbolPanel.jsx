import { useState } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { formatPrice, formatPercent, formatVolume, getCoinLogoUrl, getBaseAsset } from '../state/watchlist';
import { navigateToChart } from '../state/store';

export function SymbolPanel({ symbol, ticker, onClose }) {
    const [imgError, setImgError] = useState(false);

    if (!ticker) return null;

    const isPositive = ticker.priceChangePercent >= 0;
    const baseAsset = getBaseAsset(symbol).toUpperCase();

    const handleGoToChart = () => {
        navigateToChart(symbol);
        onClose();
    };

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
                        <span>{baseAsset} / USDT Perpetual</span>
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
                        ${formatPrice(ticker.price)}
                    </span>
                    <span className={`symbol-panel__price-change ${isPositive ? 'positive' : 'negative'}`}>
                        {formatPercent(ticker.priceChangePercent)}
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
                        <span className="value">${formatPrice(ticker.high)}</span>
                    </div>
                    <div className="symbol-panel__stat">
                        <span className="label">24h Low</span>
                        <span className="value">${formatPrice(ticker.low)}</span>
                    </div>
                    <div className="symbol-panel__stat">
                        <span className="label">24h Volume</span>
                        <span className="value">{formatVolume(ticker.volume)} {baseAsset}</span>
                    </div>
                    <div className="symbol-panel__stat">
                        <span className="label">24h Turnover</span>
                        <span className="value">${formatVolume(ticker.quoteVolume)}</span>
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
