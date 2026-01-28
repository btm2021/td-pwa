import { useState } from 'preact/hooks';
import { Icon } from './Icon';
import { timeframes } from '../state/watchlist';

export function WheelPicker({
    items,
    value,
    onChange,
    onClose,
    title = 'Select',
    labelKey = 'label',
    valueKey = 'id',
}) {
    const [selectedValue, setSelectedValue] = useState(value);

    const handleSelect = (item) => {
        const val = typeof item === 'string' ? item : item[valueKey];
        setSelectedValue(val);
    };

    const handleConfirm = () => {
        onChange(selectedValue);
        onClose();
    };

    return (
        <>
            <div className="wheel-picker__backdrop" onClick={onClose} />
            <div className="wheel-picker">
                {/* Header */}
                <div className="wheel-picker__header">
                    <button className="wheel-picker__cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <span className="wheel-picker__title">{title}</span>
                    <button className="wheel-picker__done" onClick={handleConfirm}>
                        Done
                    </button>
                </div>

                {/* Wheel Container */}
                <div className="wheel-picker__wheel">
                    <div className="wheel-picker__highlight" />
                    <div className="wheel-picker__items">
                        {items.map((item, index) => {
                            const itemValue = typeof item === 'string' ? item : item[valueKey];
                            const itemLabel = typeof item === 'string' ? item : item[labelKey];
                            const isSelected = itemValue === selectedValue;

                            return (
                                <div
                                    key={itemValue}
                                    className={`wheel-picker__item ${isSelected ? 'wheel-picker__item--selected' : ''}`}
                                    onClick={() => handleSelect(item)}
                                >
                                    {itemLabel}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
}

// Symbol Picker with search
export function SymbolPicker({ value, onChange, onClose }) {
    const [search, setSearch] = useState('');
    const [symbols, setSymbols] = useState([]);
    const [loading, setLoading] = useState(true);

    // Load symbols from window.allSearchableSymbols (populated by DatafeedManager)
    useState(() => {
        const loadSymbols = () => {
            // Sử dụng allSearchableSymbols từ DatafeedManager
            if (window.allSearchableSymbols && window.allSearchableSymbols.length > 0) {
                const syms = window.allSearchableSymbols.map(s => ({
                    symbol: s.full_name || s.symbol,
                    display: s.symbol,
                    exchange: s.exchange,
                    description: s.description
                }));
                setSymbols(syms);
                setLoading(false);
            } else {
                // Fallback: Wait for symbols to load
                const checkInterval = setInterval(() => {
                    if (window.allSearchableSymbols && window.allSearchableSymbols.length > 0) {
                        clearInterval(checkInterval);
                        const syms = window.allSearchableSymbols.map(s => ({
                            symbol: s.full_name || s.symbol,
                            display: s.symbol,
                            exchange: s.exchange,
                            description: s.description
                        }));
                        setSymbols(syms);
                        setLoading(false);
                    }
                }, 200);

                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    setLoading(false);
                }, 5000);
            }
        };
        loadSymbols();
    });

    const filteredSymbols = search
        ? symbols.filter(s =>
            s.display.toLowerCase().includes(search.toLowerCase()) ||
            s.description?.toLowerCase().includes(search.toLowerCase())
        )
        : symbols;

    const handleSelect = (symbolObj) => {
        // Trả về full symbol với prefix (VD: BINANCE:BTCUSDT)
        onChange(symbolObj.symbol);
        onClose();
    };

    return (
        <>
            <div className="wheel-picker__backdrop" onClick={onClose} />
            <div className="symbol-picker">
                {/* Header */}
                <div className="symbol-picker__header">
                    <button className="symbol-picker__close" onClick={onClose}>
                        <Icon name="close" size={24} />
                    </button>
                    <div className="symbol-picker__search">
                        <Icon name="search" size={18} />
                        <input
                            type="text"
                            placeholder="Search symbol..."
                            value={search}
                            onInput={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Symbol List */}
                <div className="symbol-picker__list">
                    {loading ? (
                        <div className="symbol-picker__loading">
                            <div className="spinner" />
                        </div>
                    ) : (
                        filteredSymbols.slice(0, 100).map((symbolObj) => (
                            <button
                                key={symbolObj.symbol}
                                className={`symbol-picker__item ${symbolObj.symbol === value ? 'symbol-picker__item--active' : ''}`}
                                onClick={() => handleSelect(symbolObj)}
                            >
                                <div className="symbol-picker__item-info">
                                    <span className="symbol-picker__symbol">{symbolObj.display}</span>
                                    <span className="symbol-picker__exchange">{symbolObj.exchange}</span>
                                </div>
                                {symbolObj.symbol === value && <Icon name="check" size={18} />}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

// Timeframe Picker
export function TimeframePicker({ value, onChange, onClose }) {
    return (
        <>
            <div className="wheel-picker__backdrop" onClick={onClose} />
            <div className="timeframe-picker">
                {/* Header */}
                <div className="timeframe-picker__header">
                    <span>Select Timeframe</span>
                    <button onClick={onClose}>
                        <Icon name="close" size={24} />
                    </button>
                </div>

                {/* Timeframe Grid */}
                <div className="timeframe-picker__grid">
                    {timeframes.map((tf) => (
                        <button
                            key={tf.id}
                            className={`timeframe-picker__item ${tf.id === value ? 'timeframe-picker__item--active' : ''}`}
                            onClick={() => {
                                onChange(tf.id);
                                onClose();
                            }}
                        >
                            {tf.label}
                        </button>
                    ))}
                </div>
            </div>
        </>
    );
}
