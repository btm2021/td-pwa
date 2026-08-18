import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from './Icon';
import { getCoinLogoUrl, getBaseAsset, getTicker, formatPrice, formatPercent, subscribeToExchange } from '../state/watchlist';

// Exchange tabs
const EXCHANGES = [
    { id: 'all', name: 'All' },
    { id: 'BINANCE_FUTURES', name: 'Binance' },
    { id: 'OANDA_FOREX', name: 'Forex' },
];

const SUPPORTED_DATASOURCES = new Set(['BINANCE_FUTURES', 'OANDA']);

export function SearchPanel({ onClose, onSelectSymbol, currentSymbols = [], initialExchange = 'BINANCE_FUTURES' }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeExchange, setActiveExchange] = useState(initialExchange);
    const [symbolsVersion, setSymbolsVersion] = useState(0);
    const inputRef = useRef(null);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        const handleSymbolsReady = () => {
            setSymbolsVersion((version) => version + 1);
        };

        window.addEventListener('datafeed:symbols-ready', handleSymbolsReady);
        return () => window.removeEventListener('datafeed:symbols-ready', handleSymbolsReady);
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
                if (activeExchange === 'all' || activeExchange === 'BINANCE_FUTURES') {
                    await searchBinanceSymbols(query);
                } else {
                    setResults([]);
                    setLoading(false);
                }
                return;
            }

            const term = query.toUpperCase().trim();
            const cleanTerm = term.replace('_', '');

            let filtered = allSymbols.filter(s => {
                // Exchange Filter
                if (activeExchange === 'all') {
                    if (!SUPPORTED_DATASOURCES.has(s.datasource)) return false;
                } else if (activeExchange === 'OANDA_FOREX') {
                    if (s.datasource !== 'OANDA') return false;
                } else if (s.datasource !== activeExchange) {
                    return false;
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
            const mapped = filtered.slice(0, 50).map(s => {
                const exchangeName = s.full_name.split(':')[0];
                return {
                    symbol: s.symbol,
                    fullName: s.full_name || s.symbol,
                    baseAsset: s.base || s.symbol,
                    quoteAsset: s.quote || '',
                    exchange: exchangeName,
                    type: s.type,
                    description: s.description,
                    logoUrls: s.original?.logo_urls
                };
            });

            setResults(mapped);
            setLoading(false);
        };

        const timeoutId = setTimeout(searchClientSide, 100); // Faster debounce
        return () => clearTimeout(timeoutId);
    }, [query, activeExchange, symbolsVersion]);

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
                        Done
                    </button>
                </div>

                {/* Exchange Tabs */}
                <div className="search-panel__tabs">
                    {EXCHANGES.map(ex => (
                        <button
                            key={ex.id}
                            className={`search-panel__tab ${activeExchange === ex.id ? 'active' : ''}`}
                            onClick={() => {
                                setActiveExchange(ex.id);
                                subscribeToExchange(ex.id);
                            }}
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
                            const ticker = getTicker(sym.fullName || sym.symbol);
                            const isAdded = currentSymbols.includes(sym.fullName || sym.symbol);
                            return (
                                <SearchResultItem
                                    key={sym.fullName || sym.symbol}
                                    symbol={sym}
                                    ticker={ticker}
                                    isAdded={isAdded}
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

function SearchResultItem({ symbol, ticker, isAdded, onClick }) {
    const [imgError, setImgError] = useState(false);
    const baseAsset = symbol.baseAsset?.toUpperCase() || getBaseAsset(symbol.symbol).toUpperCase();
    const isForex = symbol.type === 'forex';
    const isSpot = symbol.exchange?.toUpperCase().includes('SPOT') ||
        symbol.fullName?.toUpperCase().startsWith('BINANCE_SPOT:') ||
        symbol.description?.toUpperCase().includes('SPOT');

    // Get logo URL based on exchange
    const getLogoUrl = () => {
        if (symbol.logoUrls && symbol.logoUrls.length > 0) {
            return symbol.logoUrls[0];
        }
        return getCoinLogoUrl(symbol.symbol);
    };

    // Get exchange badge color
    const getExchangeColor = () => {
        const ex = symbol.exchange?.toUpperCase();
        if (ex.includes('BINANCE')) return '#F3BA2F';
        if (ex.includes('BYBIT')) return '#F7A600';
        if (ex.includes('OKX')) return '#00C8FF';
        if (ex.includes('OANDA')) return '#00A0DC';
        return '#888';
    };

    return (
        <div className={`search-result ${isAdded ? 'search-result--added' : ''}`} onClick={() => !isAdded && onClick()}>
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
                    {!isForex && !isSpot && symbol.quoteAsset === 'USDT' && ' Perpetual'}
                </div>
            </div>
            {ticker && (
                <div className="search-result__data">
                    <div className="search-result__price">{formatPrice(ticker.price)}</div>
                    <div className={`search-result__change ${Number.isFinite(ticker.priceChangePercent) ? (ticker.priceChangePercent >= 0 ? 'positive' : 'negative') : ''}`}>
                        {Number.isFinite(ticker.priceChangePercent) ? formatPercent(ticker.priceChangePercent) : '—'}
                    </div>
                </div>
            )}
            <div className="search-result__action">
                {isAdded ? (
                    <Icon name="check" size={20} color="var(--accent-green)" />
                ) : (
                    <Icon name="plus" size={20} />
                )}
            </div>
        </div>
    );
}
