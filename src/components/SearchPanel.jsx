import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';
import { tickerData, getCoinLogoUrl, getBaseAsset, formatPrice, formatPercent } from '../state/watchlist';

// Exchange tabs
const EXCHANGES = [
    { id: 'all', name: 'All', icon: null },
    { id: 'BINANCE', name: 'Binance', icon: 'crypto' },
    { id: 'OANDA', name: 'OANDA', icon: 'forex' },
];

export function SearchPanel({ onClose, onSelectSymbol }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeExchange, setActiveExchange] = useState('all');
    const inputRef = useRef(null);
    const tickers = tickerData.value;

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    // Search using UnifiedDatafeed or fallback to Binance API
    // Search using client-side global symbols normalized list

    useEffect(() => {
        const searchClientSide = async () => {
            setLoading(true);

            // Wait/Check for global symbols
            let allSymbols = window.allSearchableSymbols;

            // Fallback try to get from manager if not in window global yet
            if ((!allSymbols || allSymbols.length === 0) && window.unifiedDatafeed?.manager?.allSymbols) {
                allSymbols = window.unifiedDatafeed.manager.allSymbols;
                window.allSearchableSymbols = allSymbols;
            }

            // If still no symbols, fallback to Binance API
            if (!allSymbols || allSymbols.length === 0) {
                await searchBinanceSymbols(query);
                return;
            }

            const term = query.toUpperCase().trim();
            const cleanTerm = term.replace('_', '');

            let filtered = allSymbols.filter(s => {
                // Exchange Filter
                if (activeExchange !== 'all') {
                    const isOanda = s.exchange === 'OANDA';
                    const isBinance = s.exchange.includes('Binance') || s.exchange.includes('BINANCE');

                    if (activeExchange === 'OANDA' && !isOanda) return false;
                    if (activeExchange === 'BINANCE' && !isBinance) return false;
                }

                // Search Term Filter
                if (!term) return true;

                return s.symbol.includes(cleanTerm) ||
                    (s.full_name && s.full_name.includes(cleanTerm)) ||
                    (s.base && s.base.includes(cleanTerm)) ||
                    (s.quote && s.quote.includes(cleanTerm)) ||
                    (s.description && s.description.toUpperCase().includes(term));
            });

            // Sorting
            filtered.sort((a, b) => {
                // Exact match priority
                const aExact = a.symbol === cleanTerm;
                const bExact = b.symbol === cleanTerm;
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                // Starts with priority
                const aStart = a.symbol.startsWith(cleanTerm);
                const bStart = b.symbol.startsWith(cleanTerm);
                if (aStart && !bStart) return -1;
                if (!aStart && bStart) return 1;

                // OANDA priority if searching "XAU" or "EUR"
                if (term === 'XAU' || term === 'EUR' || term === 'GBP') {
                    if (a.exchange === 'OANDA' && b.exchange !== 'OANDA') return -1;
                    if (a.exchange !== 'OANDA' && b.exchange === 'OANDA') return 1;
                }

                return 0;
            });

            // Map results
            const mapped = filtered.slice(0, 50).map(s => ({
                symbol: s.symbol,
                fullName: s.full_name || s.symbol,
                baseAsset: s.base || s.symbol,
                quoteAsset: s.quote || '',
                exchange: s.exchange.includes('Binance') ? 'BINANCE' : 'OANDA',
                type: s.type,
                description: s.description,
                logoUrls: s.original?.logo_urls
            }));

            setResults(mapped);
            setLoading(false);
        };

        const timeoutId = setTimeout(searchClientSide, 100); // Faster debounce
        return () => clearTimeout(timeoutId);
    }, [query, activeExchange]);

    // Fallback Binance search
    const searchBinanceSymbols = async (searchQuery) => {
        try {
            const response = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo');
            const data = await response.json();
            let symbols = data.symbols
                .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
                .map(s => ({
                    symbol: s.symbol,
                    fullName: `BINANCE:${s.symbol}`,
                    baseAsset: s.baseAsset,
                    quoteAsset: s.quoteAsset,
                    exchange: 'BINANCE',
                    type: 'crypto'
                }));

            if (searchQuery.trim()) {
                const term = searchQuery.toUpperCase();
                symbols = symbols.filter(s =>
                    s.symbol.includes(term) || s.baseAsset.includes(term)
                );
            }

            setResults(symbols.slice(0, 50));
        } catch (error) {
            console.error('Binance search error:', error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (symbol) => {
        // Use full_name if available for exchange prefix
        const symbolName = symbol.fullName || symbol.symbol;
        onSelectSymbol(symbolName);
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
                            placeholder="Search symbols... (e.g. BTC, EURUSD, XAUUSD)"
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

                {/* Exchange Tabs */}
                <div className="search-panel__tabs">
                    {EXCHANGES.map(ex => (
                        <button
                            key={ex.id}
                            className={`search-panel__tab ${activeExchange === ex.id ? 'active' : ''}`}
                            onClick={() => setActiveExchange(ex.id)}
                        >
                            {ex.name}
                        </button>
                    ))}
                </div>

                {/* Results */}
                <div className="search-panel__results">
                    {loading ? (
                        <div className="search-panel__loading">
                            <div className="spinner" />
                            <span>Searching...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="search-panel__empty">
                            <Icon name="search" size={48} />
                            <p>No symbols found</p>
                            <p className="search-panel__hint">
                                Try searching for BTC, ETH, EURUSD, XAUUSD...
                            </p>
                        </div>
                    ) : (
                        results.map((sym) => {
                            const ticker = tickers[sym.symbol];
                            return (
                                <SearchResultItem
                                    key={sym.fullName || sym.symbol}
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
    const baseAsset = symbol.baseAsset?.toUpperCase() || getBaseAsset(symbol.symbol).toUpperCase();
    const isOanda = symbol.exchange === 'OANDA';
    const isForex = symbol.type === 'forex';

    // Get logo URL based on exchange
    const getLogoUrl = () => {
        if (symbol.logoUrls && symbol.logoUrls.length > 0) {
            return symbol.logoUrls[0];
        }
        return getCoinLogoUrl(symbol.symbol);
    };

    // Get exchange badge color
    const getExchangeColor = () => {
        switch (symbol.exchange) {
            case 'OANDA': return '#00A0DC';
            case 'BINANCE': return '#F3BA2F';
            default: return '#888';
        }
    };

    return (
        <div className="search-result" onClick={onClick}>
            <div className="search-result__icon">
                {!imgError ? (
                    <img
                        src={getLogoUrl()}
                        alt={baseAsset}
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    <span style={{
                        background: isForex ? 'linear-gradient(135deg, #00A0DC, #0066AA)' : undefined
                    }}>
                        {baseAsset.charAt(0)}
                    </span>
                )}
            </div>
            <div className="search-result__info">
                <div className="search-result__symbol">
                    {symbol.symbol}
                    <span
                        className="search-result__exchange-badge"
                        style={{ background: getExchangeColor() }}
                    >
                        {symbol.exchange}
                    </span>
                </div>
                <div className="search-result__name">
                    {symbol.description || `${symbol.baseAsset} / ${symbol.quoteAsset}`}
                    {isForex && ' Forex'}
                    {!isForex && symbol.quoteAsset === 'USDT' && ' Perpetual'}
                </div>
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
