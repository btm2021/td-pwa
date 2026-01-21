import { useState } from 'preact/hooks';
import { Icon } from './Icon';

// Chart types available in TradingView
const chartTypes = [
    { id: 0, name: 'Bars', icon: 'chartBars' },
    { id: 1, name: 'Candles', icon: 'chartCandles' },
    { id: 2, name: 'Line', icon: 'chartLine' },
    { id: 3, name: 'Area', icon: 'chartArea' },
    { id: 8, name: 'Hollow Candles', icon: 'chartHollow' },
    { id: 9, name: 'Heikin Ashi', icon: 'chartHeikin' },
    { id: 10, name: 'Baseline', icon: 'chartBaseline' },
];

export function ChartTypePicker({ currentType, onChange, onClose }) {
    return (
        <>
            <div className="wheel-picker__backdrop" onClick={onClose} />
            <div className="chart-type-picker">
                <div className="chart-type-picker__header">
                    <span>Chart Type</span>
                    <button onClick={onClose}>
                        <Icon name="close" size={24} />
                    </button>
                </div>
                <div className="chart-type-picker__grid">
                    {chartTypes.map((type) => (
                        <button
                            key={type.id}
                            className={`chart-type-picker__item ${type.id === currentType ? 'active' : ''}`}
                            onClick={() => {
                                onChange(type.id);
                                onClose();
                            }}
                        >
                            <ChartTypeIcon type={type.id} />
                            <span>{type.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}

function ChartTypeIcon({ type }) {
    // Simple SVG icons for each chart type
    const icons = {
        0: ( // Bars
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="7" x2="5" y2="17" />
                <line x1="3" y1="9" x2="5" y2="9" />
                <line x1="5" y1="15" x2="7" y2="15" />
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="10" y1="7" x2="12" y2="7" />
                <line x1="12" y1="17" x2="14" y2="17" />
                <line x1="19" y1="9" x2="19" y2="15" />
                <line x1="17" y1="11" x2="19" y2="11" />
                <line x1="19" y1="13" x2="21" y2="13" />
            </svg>
        ),
        1: ( // Candles
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <rect x="4" y="8" width="4" height="8" rx="0.5" fill="#00C853" />
                <line x1="6" y1="5" x2="6" y2="8" stroke="#00C853" strokeWidth="1.5" />
                <line x1="6" y1="16" x2="6" y2="19" stroke="#00C853" strokeWidth="1.5" />
                <rect x="10" y="6" width="4" height="12" rx="0.5" fill="#FF3B30" />
                <line x1="12" y1="3" x2="12" y2="6" stroke="#FF3B30" strokeWidth="1.5" />
                <line x1="12" y1="18" x2="12" y2="21" stroke="#FF3B30" strokeWidth="1.5" />
                <rect x="16" y="9" width="4" height="6" rx="0.5" fill="#00C853" />
                <line x1="18" y1="6" x2="18" y2="9" stroke="#00C853" strokeWidth="1.5" />
                <line x1="18" y1="15" x2="18" y2="18" stroke="#00C853" strokeWidth="1.5" />
            </svg>
        ),
        2: ( // Line
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 16 L8 12 L13 14 L18 8 L21 10" />
            </svg>
        ),
        3: ( // Area
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <defs>
                    <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="currentColor" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
                    </linearGradient>
                </defs>
                <path d="M3 16 L8 12 L13 14 L18 8 L21 10 L21 20 L3 20 Z" fill="url(#areaGrad)" />
                <path d="M3 16 L8 12 L13 14 L18 8 L21 10" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
        ),
        8: ( // Hollow Candles
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4" y="8" width="4" height="8" rx="0.5" stroke="#00C853" />
                <line x1="6" y1="5" x2="6" y2="8" stroke="#00C853" />
                <line x1="6" y1="16" x2="6" y2="19" stroke="#00C853" />
                <rect x="10" y="6" width="4" height="12" rx="0.5" fill="#FF3B30" stroke="#FF3B30" />
                <line x1="12" y1="3" x2="12" y2="6" stroke="#FF3B30" />
                <line x1="12" y1="18" x2="12" y2="21" stroke="#FF3B30" />
                <rect x="16" y="9" width="4" height="6" rx="0.5" stroke="#00C853" />
                <line x1="18" y1="6" x2="18" y2="9" stroke="#00C853" />
                <line x1="18" y1="15" x2="18" y2="18" stroke="#00C853" />
            </svg>
        ),
        9: ( // Heikin Ashi
            <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                <rect x="4" y="10" width="4" height="6" rx="0.5" fill="#00C853" />
                <line x1="6" y1="7" x2="6" y2="10" stroke="#00C853" strokeWidth="1.5" />
                <line x1="6" y1="16" x2="6" y2="17" stroke="#00C853" strokeWidth="1.5" />
                <rect x="10" y="8" width="4" height="8" rx="0.5" fill="#00C853" />
                <line x1="12" y1="5" x2="12" y2="8" stroke="#00C853" strokeWidth="1.5" />
                <line x1="12" y1="16" x2="12" y2="17" stroke="#00C853" strokeWidth="1.5" />
                <rect x="16" y="6" width="4" height="10" rx="0.5" fill="#00C853" />
                <line x1="18" y1="4" x2="18" y2="6" stroke="#00C853" strokeWidth="1.5" />
                <line x1="18" y1="16" x2="18" y2="18" stroke="#00C853" strokeWidth="1.5" />
            </svg>
        ),
        10: ( // Baseline
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
                <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M3 14 L7 10 L11 16 L15 8 L19 12 L21 10" stroke="#00C853" strokeWidth="2" fill="none" />
            </svg>
        ),
    };

    return icons[type] || icons[1];
}

// Custom Studies list (will be populated from window)
export function IndicatorsPicker({ tvWidget, onClose }) {
    const [searchQuery, setSearchQuery] = useState('');

    // List of custom studies
    const customStudies = [
        { id: 'ATR Bot', name: 'ATR Bot', description: 'ATR Dynamic Trail with EMA' },
        { id: 'VSR', name: 'VSR', description: 'Volume Strength Ratio' },
        { id: 'VSR_1', name: 'VSR v1', description: 'Volume Strength Ratio v1' },
        { id: 'VIDYA', name: 'VIDYA', description: 'Variable Index Dynamic Average' },
        { id: 'Session VP', name: 'Session VP', description: 'Session Volume Profile' },
        { id: 'Swing Points', name: 'Swing Points', description: 'Swing High/Low Points' },
        { id: 'KAMA', name: 'KAMA', description: "Kaufman's Adaptive MA" },
        { id: 'SMC', name: 'SMC', description: 'Smart Money Concepts' },
        { id: 'FVG', name: 'FVG', description: 'Fair Value Gaps' },
    ];

    // Popular built-in indicators
    const builtInIndicators = [
        { id: 'MASimple@tv-basicstudies', name: 'MA (Moving Average)', description: 'Simple Moving Average' },
        { id: 'MAExp@tv-basicstudies', name: 'EMA', description: 'Exponential Moving Average' },
        { id: 'BB@tv-basicstudies', name: 'Bollinger Bands', description: 'Volatility bands' },
        { id: 'RSI@tv-basicstudies', name: 'RSI', description: 'Relative Strength Index' },
        { id: 'MACD@tv-basicstudies', name: 'MACD', description: 'Moving Average Convergence/Divergence' },
        { id: 'Stochastic@tv-basicstudies', name: 'Stochastic', description: 'Stochastic oscillator' },
        { id: 'Volume@tv-basicstudies', name: 'Volume', description: 'Trading volume' },
        { id: 'VWAP@tv-basicstudies', name: 'VWAP', description: 'Volume Weighted Avg Price' },
        { id: 'ATR@tv-basicstudies', name: 'ATR', description: 'Average True Range' },
        { id: 'IchimokuCloud@tv-basicstudies', name: 'Ichimoku Cloud', description: 'Ichimoku Kinko Hyo' },
    ];

    const allIndicators = [...customStudies, ...builtInIndicators];

    const filteredIndicators = searchQuery
        ? allIndicators.filter(i =>
            i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            i.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : allIndicators;

    const handleAddIndicator = (indicator) => {
        if (tvWidget) {
            try {
                tvWidget.chart().createStudy(indicator.id, false, false);
                console.log('Added indicator:', indicator.name);
            } catch (e) {
                console.error('Error adding indicator:', e);
            }
        }
        onClose();
    };

    const handleOpenTVDialog = () => {
        if (tvWidget) {
            try {
                tvWidget.chart().executeActionById('insertIndicator');
            } catch (e) {
                console.error('Error opening indicators dialog:', e);
            }
        }
        onClose();
    };

    return (
        <>
            <div className="indicators-picker__backdrop" onClick={onClose} />
            <div className="indicators-picker">
                <div className="indicators-picker__header">
                    <button className="indicators-picker__back" onClick={onClose}>
                        <Icon name="chevronLeft" size={24} />
                    </button>
                    <h2>Indicators</h2>
                    <button className="indicators-picker__more" onClick={handleOpenTVDialog}>
                        <Icon name="more" size={24} />
                    </button>
                </div>

                {/* Search */}
                <div className="indicators-picker__search">
                    <Icon name="search" size={18} />
                    <input
                        type="text"
                        placeholder="Search indicators..."
                        value={searchQuery}
                        onInput={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Indicator List */}
                <div className="indicators-picker__list">
                    {/* Custom Studies Section */}
                    {!searchQuery && (
                        <div className="indicators-picker__section">
                            <h3>Custom Indicators</h3>
                        </div>
                    )}

                    {filteredIndicators.filter(i => customStudies.some(c => c.id === i.id)).map((indicator) => (
                        <button
                            key={indicator.id}
                            className="indicators-picker__item"
                            onClick={() => handleAddIndicator(indicator)}
                        >
                            <div className="indicators-picker__item-info">
                                <span className="indicators-picker__item-name">{indicator.name}</span>
                                <span className="indicators-picker__item-desc">{indicator.description}</span>
                            </div>
                            <Icon name="plus" size={20} />
                        </button>
                    ))}

                    {/* Built-in Section */}
                    {!searchQuery && (
                        <div className="indicators-picker__section">
                            <h3>Popular Indicators</h3>
                        </div>
                    )}

                    {filteredIndicators.filter(i => builtInIndicators.some(b => b.id === i.id)).map((indicator) => (
                        <button
                            key={indicator.id}
                            className="indicators-picker__item"
                            onClick={() => handleAddIndicator(indicator)}
                        >
                            <div className="indicators-picker__item-info">
                                <span className="indicators-picker__item-name">{indicator.name}</span>
                                <span className="indicators-picker__item-desc">{indicator.description}</span>
                            </div>
                            <Icon name="plus" size={20} />
                        </button>
                    ))}
                </div>

                {/* Open Full Dialog */}
                <div className="indicators-picker__footer">
                    <button className="btn btn--ghost" onClick={handleOpenTVDialog}>
                        <Icon name="indicators" size={18} />
                        Open All Indicators
                    </button>
                </div>
            </div>
        </>
    );
}
