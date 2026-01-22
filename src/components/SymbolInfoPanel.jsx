import { useState, useEffect } from 'preact/hooks';
import { Icon } from './Icon';
import { formatPrice, formatPercent, formatVolume, getCoinLogoUrl, getBaseAsset, getTicker, tickerData } from '../state/watchlist';
import { selectedSymbolName, navigateToChart } from '../state/store';
import { deviceMode } from '../hooks/useDeviceMode';

export function SymbolInfoPanel() {
    const symbol = selectedSymbolName.value;
    const ticker = getTicker(symbol);
    const [imgError, setImgError] = useState(false);

    // Force update when ticker changes
    const [_, setTick] = useState(0);
    useEffect(() => {
        const unsubscribe = tickerData.subscribe(() => {
            setTick(t => t + 1);
        });
        return unsubscribe;
    }, []);

    if (!symbol) {
        return (
            <div className="symbol-info-panel symbol-info-panel--empty">
                <div className="symbol-info-panel__empty-content">
                    <Icon name="search" size={48} />
                    <h3>Select a symbol</h3>
                    <p>Choose a symbol from your watchlist to see details</p>
                </div>
            </div>
        );
    }

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
    const isForex = !symbol.includes('USDT') && !symbol.includes('BUSD') && !symbol.includes('USDC') && !symbol.includes('PERP');
    const quoteAsset = isForex ? (symbol.startsWith('OANDA:') ? symbol.replace('OANDA:', '').substring(3) : symbol.substring(3)) : 'USDT';
    const subtitle = isForex ? `${baseAsset} / ${quoteAsset}` : `${baseAsset} / USDT Perpetual`;

    const handleOpenChart = () => {
        navigateToChart(symbol);
    };

    return (
        <div className="symbol-info-panel">
            <div className="symbol-info-panel__container">
                {/* Header Section */}
                <header className="symbol-info-header">
                    <div className="symbol-info-header__left">
                        <div className="symbol-info-icon">
                            {!imgError && getCoinLogoUrl(symbol) ? (
                                <img
                                    src={getCoinLogoUrl(symbol)}
                                    alt={baseAsset}
                                    onError={() => setImgError(true)}
                                />
                            ) : (
                                <div className="symbol-info-icon__fallback">{baseAsset.charAt(0)}</div>
                            )}
                        </div>
                        <div className="symbol-info-title">
                            <h1 className="symbol-info-name">{symbol.replace('OANDA:', '')}</h1>
                            <span className="symbol-info-subtitle">{subtitle}</span>
                        </div>
                    </div>

                    <div className="symbol-info-header__right">
                        <button className="btn btn--primary btn--lg" onClick={handleOpenChart}>
                            <Icon name="chart" size={20} />
                            <span>Trade Now</span>
                        </button>
                    </div>
                </header>

                {/* Main Price Section */}
                <div className="symbol-info-price-card">
                    <div className="price-main">
                        <div className="price-main__value">${formatPrice(displayTicker.price)}</div>
                        <div className={`price-main__change ${isPositive ? 'positive' : 'negative'}`}>
                            <Icon name={isPositive ? 'arrow-up' : 'arrow-down'} size={16} />
                            {formatPercent(displayTicker.priceChangePercent)}
                        </div>
                    </div>

                    <div className="price-stats-row">
                        <div className="stat-item">
                            <span className="stat-item__label">24h High</span>
                            <span className="stat-item__value positive">${formatPrice(displayTicker.high)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-item__label">24h Low</span>
                            <span className="stat-item__value negative">${formatPrice(displayTicker.low)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-item__label">24h Volume ({baseAsset})</span>
                            <span className="stat-item__value">{isForex ? '-' : formatVolume(displayTicker.volume)}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-item__label">24h Turnover (USDT)</span>
                            <span className="stat-item__value">{isForex ? '-' : `$${formatVolume(displayTicker.quoteVolume)}`}</span>
                        </div>
                    </div>
                </div>

                {/* Visualization / Details Area */}
                <div className="symbol-info-details">
                    <div className="details-grid">
                        <div className="details-card">
                            <h3>Market Sentiment</h3>
                            <div className="sentiment-bar">
                                <div className="sentiment-bar__fill" style={{ width: '65%', background: 'var(--accent-green)' }}></div>
                            </div>
                            <div className="sentiment-labels">
                                <span>65% Long</span>
                                <span>35% Short</span>
                            </div>
                        </div>

                        <div className="details-card">
                            <h3>Price Range (24h)</h3>
                            <div className="range-track">
                                <div
                                    className="range-indicator"
                                    style={{
                                        left: `${((displayTicker.price - displayTicker.low) / (displayTicker.high - displayTicker.low)) * 100}%`
                                    }}
                                ></div>
                            </div>
                            <div className="range-labels">
                                <span>L: {formatPrice(displayTicker.low)}</span>
                                <span>H: {formatPrice(displayTicker.high)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="symbol-info-chart-preview">
                        <div className="preview-header">
                            <h3>Price Action (Mockup)</h3>
                            <div className="preview-timeframes">
                                <button className="active">1H</button>
                                <button>1D</button>
                                <button>1W</button>
                            </div>
                        </div>
                        <div className="preview-placeholder">
                            {/* Mini Sparkline */}
                            <svg width="100%" height="200" viewBox="0 0 800 200" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="panelGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={isPositive ? '#00C853' : '#FF3B30'} stopOpacity="0.2" />
                                        <stop offset="100%" stopColor={isPositive ? '#00C853' : '#FF3B30'} stopOpacity="0" />
                                    </linearGradient>
                                </defs>
                                {(() => {
                                    const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
                                    const points = [];
                                    const segments = 40;
                                    for (let i = 0; i <= segments; i++) {
                                        const x = (i / segments) * 800;
                                        const y = 80 + Math.sin(seed + i * 0.4) * 40 + Math.cos(seed * 0.2 + i * 0.7) * 30 + (isPositive ? (segments - i) * 2 : i * 2);
                                        points.push(`${x},${Math.max(20, Math.min(180, y))}`);
                                    }
                                    const linePath = `M${points.join(' L')}`;
                                    const areaPath = `${linePath} L800,200 L0,200 Z`;

                                    return (
                                        <>
                                            <path d={areaPath} fill="url(#panelGradient)" />
                                            <path d={linePath} fill="none" stroke={isPositive ? '#00C853' : '#FF3B30'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </>
                                    );
                                })()}
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
