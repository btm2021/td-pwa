import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';
import { tickerData, getCoinLogoUrl, getBaseAsset, formatPrice, formatPercent } from '../state/watchlist';

export function SearchPanel({ onClose, onSelectSymbol }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [allSymbols, setAllSymbols] = useState([]);
    const inputRef = useRef(null);
    const tickers = tickerData.value;

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Fetch all symbols from Binance on mount
    useEffect(() => {
        const fetchSymbols = async () => {
            try {
                setLoading(true);
                const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
                const data = await response.json();
                const symbols = data.symbols
                    .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
                    .map(s => ({
                        symbol: s.symbol,
                        baseAsset: s.baseAsset,
                        quoteAsset: s.quoteAsset,
                    }));
                setAllSymbols(symbols);
                setResults(symbols.slice(0, 20)); // Show first 20 by default
            } catch (error) {
                console.error('Error fetching symbols:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchSymbols();
    }, []);

    // Filter symbols based on query
    useEffect(() => {
        if (!query.trim()) {
            setResults(allSymbols.slice(0, 20));
            return;
        }

        const searchTerm = query.toUpperCase();
        const filtered = allSymbols.filter(s =>
            s.symbol.includes(searchTerm) ||
            s.baseAsset.includes(searchTerm)
        );
        setResults(filtered.slice(0, 50));
    }, [query, allSymbols]);

    const handleSelect = (symbol) => {
        onSelectSymbol(symbol.symbol);
    };

    return (
        <>
            <div className="search-panel__backdrop" onClick={onClose} />
            <div className="search-panel">
                {/* Header */}
                <div className="search-panel__header">
                    <div className="search-panel__input-wrapper">
                        <Icon name="search" size={20} />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Search symbols..."
                            value={query}
                            onInput={(e) => setQuery(e.target.value)}
                            className="search-panel__input"
                        />
                        {query && (
                            <button
                                className="search-panel__clear"
                                onClick={() => setQuery('')}
                            >
                                <Icon name="close" size={18} />
                            </button>
                        )}
                    </div>
                    <button className="search-panel__cancel" onClick={onClose}>
                        Cancel
                    </button>
                </div>

                {/* Results */}
                <div className="search-panel__results">
                    {loading ? (
                        <div className="search-panel__loading">
                            <div className="spinner" />
                            <span>Loading symbols...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="search-panel__empty">
                            <Icon name="search" size={48} />
                            <p>No symbols found</p>
                        </div>
                    ) : (
                        results.map((sym) => {
                            const ticker = tickers[sym.symbol];
                            return (
                                <SearchResultItem
                                    key={sym.symbol}
                                    symbol={sym}
                                    ticker={ticker}
                                    onClick={() => handleSelect(sym)}
                                />
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}

function SearchResultItem({ symbol, ticker, onClick }) {
    const [imgError, setImgError] = useState(false);
    const baseAsset = getBaseAsset(symbol.symbol).toUpperCase();

    return (
        <div className="search-result" onClick={onClick}>
            <div className="search-result__icon">
                {!imgError ? (
                    <img
                        src={getCoinLogoUrl(symbol.symbol)}
                        alt={baseAsset}
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    <span>{baseAsset.charAt(0)}</span>
                )}
            </div>
            <div className="search-result__info">
                <div className="search-result__symbol">{symbol.symbol}</div>
                <div className="search-result__name">{symbol.baseAsset} / {symbol.quoteAsset} Perpetual</div>
            </div>
            {ticker && (
                <div className="search-result__data">
                    <div className="search-result__price">{formatPrice(ticker.price)}</div>
                    <div className={`search-result__change ${ticker.priceChangePercent >= 0 ? 'positive' : 'negative'}`}>
                        {formatPercent(ticker.priceChangePercent)}
                    </div>
                </div>
            )}
            <div className="search-result__action">
                <Icon name="plus" size={20} />
            </div>
        </div>
    );
}
