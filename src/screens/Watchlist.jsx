import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SearchPanel } from '../components/SearchPanel';
import { CategoryModal } from '../components/CategoryModal';
import { CatalogManager } from '../components/CatalogManager';
import {
    categories,
    activeCategory,
    activeCategorySymbols,
    tickerData,
    exchangeConnectionStatus,
    setActiveCategory,
    subscribeToExchange,
    getTicker,
    getCoinLogoUrl,
    getBaseAsset,
    formatPrice,
    formatPercent,
    formatVolume,
    addSymbolToCategory,
    addCategory,
    removeCategory,
    updateCategory,
} from '../state/watchlist';
import { deviceMode } from '../hooks/useDeviceMode';
import { selectedSymbolName, setSelectedSymbol } from '../state/store';



export function Watchlist() {
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCatalogManager, setShowCatalogManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 1 });

    const cats = categories.value;
    const activeCat = activeCategory.value;
    const symbols = activeCategorySymbols.value;
    const tickers = tickerData.value;
    const connectionStatuses = exchangeConnectionStatus.value;
    const isDesktop = deviceMode.value === 'desktop';

    const searchExchange = activeCat === 'OANDA_FOREX' ? 'OANDA_FOREX' : 'BINANCE_FUTURES';

    const handleCloseSearch = () => {
        subscribeToExchange(activeCat);
        setShowSearch(false);
    };

    const handleSymbolClick = (symbol) => {
        if (isDesktop) {
            selectedSymbolName.value = symbol;
        } else {
            setSelectedSymbol(symbol);
        }
    };

    const handleSearchSelect = (symbol) => {
        addSymbolToCategory(activeCat, symbol);
    };

    const handleSaveCategory = (category) => {
        if (editingCategory) {
            updateCategory(category.id, category);
        } else {
            addCategory(category);
        }
        setEditingCategory(null);
        setShowCategoryModal(false);
    };

    const handleOpenCategoryModal = (category) => {
        setEditingCategory(category);
        setShowCategoryModal(true);
        setShowCatalogManager(false);
    };

    const getSortedSymbols = () => {
        const filtered = symbols.filter(s =>
            s.toLowerCase().includes(searchQuery.toLowerCase())
        );

        const sorted = [...filtered];
        sorted.sort((a, b) => {
            const tickerA = getTicker(a) || { lastPrice: 0, priceChangePercent: 0, quoteVolume: 0, volume: 0 };
            const tickerB = getTicker(b) || { lastPrice: 0, priceChangePercent: 0, quoteVolume: 0, volume: 0 };

            let valA, valB;
            if (sortConfig.key === 'symbol') {
                valA = a;
                valB = b;
            } else if (sortConfig.key === 'price') {
                valA = tickerA.lastPrice ?? tickerA.price ?? 0;
                valB = tickerB.lastPrice ?? tickerB.price ?? 0;
            } else if (sortConfig.key === 'change') {
                valA = tickerA.priceChangePercent;
                valB = tickerB.priceChangePercent;
            } else if (sortConfig.key === 'volume') {
                valA = tickerA.quoteVolume ?? tickerA.volume ?? 0;
                valB = tickerB.quoteVolume ?? tickerB.volume ?? 0;
            }

            if (typeof valA === 'string') return valA.localeCompare(valB) * sortConfig.direction;
            return (valA - valB) * sortConfig.direction;
        });
        return sorted;
    };

    const toggleSort = (key) => {
        setSortConfig((current) => ({
            key,
            direction: current.key === key ? current.direction * -1 : key === 'volume' ? -1 : 1
        }));
    };

    const sortedSymbols = getSortedSymbols();
    if (isDesktop) {
        return (
            <div className="screen screen--no-padding screen--full-height watchlist-screen">
                {/* Desktop Header */}
                <div className="watchlist-header-new">
                    <div className="watchlist-header-new__top">
                        <div className="watchlist-header-new__title" onClick={() => setShowCatalogManager(true)}>
                            <h2>Market</h2>
                            <span className="count-tag">{symbols.length}</span>
                            <Icon name="chevronDown" size={12} />
                        </div>
                        <div className="watchlist-header-new__actions">
                            <button className="minimal-action-btn" onClick={() => setShowSearch(true)}>
                                <Icon name="plus" size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="watchlist-header-new__search">
                        <div className="integrated-search">
                            <Icon name="search" size={14} />
                            <input
                                type="text"
                                placeholder="Filter symbols..."
                                value={searchQuery}
                                onInput={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <button className="clear-btn" onClick={() => setSearchQuery('')}>
                                    <Icon name="close" size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Table Content */}
                <div className="watchlist-table-container">
                    <table className="watchlist-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => toggleSort('symbol')}>
                                    <div className="th-content">
                                        Symbol
                                        {sortConfig.key === 'symbol' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                                    </div>
                                </th>
                                <th className="text-right sortable" style={{ width: '85px' }} onClick={() => toggleSort('price')}>
                                    <div className="th-content justify-end">
                                        Last
                                        {sortConfig.key === 'price' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                                    </div>
                                </th>
                                <th className="text-right sortable" style={{ width: '75px' }} onClick={() => toggleSort('change')}>
                                    <div className="th-content justify-end">
                                        Chg%
                                        {sortConfig.key === 'change' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                                    </div>
                                </th>
                                <th className="text-right sortable" style={{ width: '80px' }} onClick={() => toggleSort('volume')}>
                                    <div className="th-content justify-end">
                                        Volume
                                        {sortConfig.key === 'volume' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedSymbols.map((symbol) => (
                                <DesktopWatchlistRow
                                    key={symbol}
                                    symbol={symbol}
                                    isActive={selectedSymbolName.value === symbol}
                                    ticker={getTicker(symbol)}
                                    onClick={() => handleSymbolClick(symbol)}
                                />
                            ))}
                        </tbody>
                    </table>
                    {sortedSymbols.length === 0 && (
                        <div className="watchlist-empty">
                            <p>No symbols found</p>
                        </div>
                    )}
                </div>

                {/* Desktop Footer (Categories) */}
                <div className="watchlist-footer-new">
                    <div className="category-nav">
                        {cats.map((cat) => (
                            <button
                                key={cat.id}
                                className={`category-tab ${activeCat === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                                title={cat.label}
                            >
                                {connectionStatuses[cat.id] === 'connected' && <span className="exchange-connection-dot" aria-label={`${cat.label} market stream connected`} />}
                                <span className="cat-label">{cat.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Modals */}
                {showSearch && (
                    <SearchPanel
                        onClose={handleCloseSearch}
                        onSelectSymbol={handleSearchSelect}
                        currentSymbols={symbols}
                        initialExchange={searchExchange}
                    />
                )}
                {showCategoryModal && (
                    <CategoryModal
                        onClose={() => {
                            setShowCategoryModal(false);
                            setEditingCategory(null);
                        }}
                        onSave={handleSaveCategory}
                        editCategory={editingCategory}
                    />
                )}
                {showCatalogManager && (
                    <CatalogManager
                        onClose={() => setShowCatalogManager(false)}
                        onAddCategory={handleOpenCategoryModal}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="screen screen--no-padding screen--full-height watchlist-screen">
            {/* Mobile Header Area */}
            <div className="watchlist-mobile-header">
                <div className="watchlist-mobile-header__top">
                    <div className="watchlist-mobile-header__title">
                        <h1>Market</h1>
                        <span className="count">{symbols.length} pairs</span>
                    </div>
                    <div className="watchlist-mobile-header__actions">
                        <button className="icon-btn" onClick={() => setShowSearch(true)}>
                            <Icon name="search" size={20} />
                        </button>
                        <button className="icon-btn" onClick={() => setShowCatalogManager(true)}>
                            <Icon name="list" size={20} />
                        </button>
                    </div>
                </div>

                {/* Categories Tabs */}
                <div className="watchlist-mobile-tabs">
                    <div className="watchlist-mobile-tabs__scroll">
                        {cats.map((cat) => (
                            <button
                                key={cat.id}
                                className={`tab-item ${activeCat === cat.id ? 'tab-item--active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                {connectionStatuses[cat.id] === 'connected' && <span className="exchange-connection-dot" aria-label={`${cat.label} market stream connected`} />}
                                {cat.label}
                                {activeCat === cat.id && <div className="tab-indicator" style={{ background: cat.color || '#2979FF' }} />}
                            </button>
                        ))}
                    </div>
                    <button className="add-tab-btn" onClick={() => handleOpenCategoryModal(null)}>
                        <Icon name="plus" size={16} />
                    </button>
                </div>
            </div>

            {/* Simple List Content */}
            <div className="watchlist-list">
                {/* List Header */}
                <div className="watchlist-list-header">
                    <button className="col-symbol sortable" onClick={() => toggleSort('symbol')}>Pair</button>
                    <button className="col-price text-right sortable" onClick={() => toggleSort('price')}>
                        Last {sortConfig.key === 'price' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                    </button>
                    <button className="col-change text-right sortable" onClick={() => toggleSort('change')}>
                        Chg% {sortConfig.key === 'change' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                    </button>
                    <button className="col-volume text-right sortable" onClick={() => toggleSort('volume')}>
                        Vol {sortConfig.key === 'volume' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                    </button>
                </div>

                {sortedSymbols.length > 0 ? (
                    sortedSymbols.map((symbol) => (
                        <SymbolListItem
                            key={symbol}
                            symbol={symbol}
                            isActive={selectedSymbolName.value === symbol}
                            ticker={getTicker(symbol)}
                            onClick={() => handleSymbolClick(symbol)}
                        />
                    ))
                ) : (
                    <div className="watchlist-empty">
                        {searchQuery ? (
                            <>
                                <p>No matches for "{searchQuery}"</p>
                                <button className="btn btn--ghost btn--sm" onClick={() => setSearchQuery('')}>
                                    Clear search
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="watchlist-empty__icon">
                                    <Icon name="star" size={48} />
                                </div>
                                <h3>Watchlist is Empty</h3>
                                <button className="btn btn--primary" onClick={() => setShowSearch(true)}>
                                    <Icon name="plus" size={16} />
                                    <span>Add Symbols</span>
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Modals & Panels */}
            {showSearch && (
                <SearchPanel
                    onClose={handleCloseSearch}
                    onSelectSymbol={handleSearchSelect}
                    currentSymbols={symbols}
                    initialExchange={searchExchange}
                />
            )}

            {showCategoryModal && (
                <CategoryModal
                    onClose={() => {
                        setShowCategoryModal(false);
                        setEditingCategory(null);
                    }}
                    onSave={handleSaveCategory}
                    editCategory={editingCategory}
                />
            )}

            {showCatalogManager && (
                <CatalogManager
                    onClose={() => setShowCatalogManager(false)}
                    onAddCategory={handleOpenCategoryModal}
                />
            )}
        </div>
    );
}

function DesktopWatchlistRow({ symbol, isActive, ticker, onClick }) {
    const [imgError, setImgError] = useState(false);
    const [priceColor, setPriceColor] = useState('');
    const prevPriceRef = useRef(0);

    // Extract base symbol
    let displaySymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
    displaySymbol = displaySymbol.replace(/USDT$|USDC$|USD$|BUSD$/i, '');

    const logoUrl = getCoinLogoUrl(symbol);
    const rawPrice = ticker?.lastPrice ?? ticker?.price;
    const rawVolume = ticker?.quoteVolume ?? ticker?.volume;
    const changePercent = ticker?.priceChangePercent;
    const hasPrice = Number.isFinite(rawPrice);
    const hasVolume = Number.isFinite(rawVolume);
    const hasChange = Number.isFinite(changePercent);
    const price = hasPrice ? rawPrice : 0;
    const isPositive = hasChange && changePercent >= 0;

    // Lấy chữ cái đầu tiên để làm logo fallback
    const firstLetter = displaySymbol.charAt(0).toUpperCase();

    // Flash effect khi giá thay đổi
    useEffect(() => {
        if (price !== 0) {
            if (prevPriceRef.current !== 0 && price !== prevPriceRef.current) {
                setPriceColor(price > prevPriceRef.current ? 'up' : 'down');
                const timer = setTimeout(() => setPriceColor(''), 500);
                return () => clearTimeout(timer);
            }
            prevPriceRef.current = price;
        }
    }, [price]);

    // Màu flash cho giá
    let priceTextColor = 'var(--text-primary)';
    if (priceColor === 'up') priceTextColor = '#00ff88';
    if (priceColor === 'down') priceTextColor = '#ff4444';

    return (
        <tr
            className={`watchlist-table-row ${isActive ? 'active' : ''}`}
            onClick={onClick}
        >
            <td style={{ minWidth: 0, overflow: 'hidden' }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    flexDirection: 'row',
                    minWidth: 0
                }}>
                    {logoUrl && !imgError ? (
                        <img
                            src={logoUrl}
                            alt={displaySymbol}
                            onError={() => setImgError(true)}
                            style={{
                                width: '18px',
                                height: '18px',
                                borderRadius: '50%',
                                flexShrink: 0,
                                objectFit: 'cover',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                        />
                    ) : (
                        <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: 'rgba(41, 121, 255, 0.2)',
                            color: '#fff',
                            fontSize: '10px',
                            fontWeight: 700,
                            textTransform: 'uppercase'
                        }}>
                            {firstLetter}
                        </div>
                    )}
                    <span style={{
                        fontWeight: 500,
                        fontSize: '12px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {displaySymbol}
                    </span>
                </div>
            </td>
            <td className="text-right price-cell" style={{
                color: priceTextColor,
                transition: 'color 0.3s ease'
            }}>
                {hasPrice ? formatPrice(price) : '—'}
            </td>
            <td className={`text-right change-cell ${hasChange ? (isPositive ? 'positive' : 'negative') : 'neutral'}`}>
                {hasChange ? formatPercent(changePercent) : '—'}
            </td>
            <td className="text-right volume-cell">{hasVolume ? formatVolume(rawVolume) : '—'}</td>
        </tr>
    );
}

function SymbolListItem({ symbol, isActive, ticker, onClick }) {
    const [priceColor, setPriceColor] = useState('');
    const [imgError, setImgError] = useState(false);
    const prevPriceRef = useRef(0);
    const rawSymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;
    const displaySymbol = formatMobilePair(rawSymbol);
    const exchange = symbol.startsWith('OANDA:') ? 'OANDA Forex' : 'Binance Futures';
    const logoUrl = getCoinLogoUrl(symbol);
    const fallbackLetter = getBaseAsset(symbol).charAt(0) || rawSymbol.charAt(0);

    const rawPrice = ticker?.lastPrice ?? ticker?.price;
    const rawVolume = ticker?.quoteVolume ?? ticker?.volume;
    const changePercent = ticker?.priceChangePercent;
    const hasPrice = Number.isFinite(rawPrice);
    const hasVolume = Number.isFinite(rawVolume);
    const hasChange = Number.isFinite(changePercent);
    const price = hasPrice ? rawPrice : 0;
    const isPositive = hasChange && changePercent >= 0;

    useEffect(() => {
        if (price !== 0) {
            if (prevPriceRef.current !== 0 && price !== prevPriceRef.current) {
                setPriceColor(price > prevPriceRef.current ? 'up' : 'down');
                const timer = setTimeout(() => setPriceColor(''), 500);
                return () => clearTimeout(timer);
            }
            prevPriceRef.current = price;
        }
    }, [price]);

    return (
        <div
            className={`watchlist-item ${isActive ? 'active' : ''}`}
            onClick={onClick}
            draggable={false}
        >
            <div className="watchlist-pair">
                <div className="watchlist-pair__icon">
                    {logoUrl && !imgError ? (
                        <img src={logoUrl} alt="" onError={() => setImgError(true)} />
                    ) : (
                        <span>{fallbackLetter.toUpperCase()}</span>
                    )}
                </div>
                <div className="col-symbol">
                    <span className="symbol-name">{displaySymbol}</span>
                    <span className="exchange-name">{exchange}</span>
                </div>
            </div>

            <div className={`col-price text-right ${priceColor}`}>
                {hasPrice ? formatPrice(price) : '—'}
            </div>

            <div className={`col-change text-right ${hasChange ? (isPositive ? 'positive' : 'negative') : 'neutral'}`}>
                {hasChange ? formatPercent(changePercent) : '—'}
            </div>

            <div className="col-volume text-right">{hasVolume ? formatVolume(rawVolume) : '—'}</div>
        </div>
    );
}

function formatMobilePair(symbol) {
    const upperSymbol = symbol.toUpperCase();
    const quoteAssets = ['USDT', 'USDC', 'BUSD', 'USD'];
    const quoteAsset = quoteAssets.find((quote) => upperSymbol.endsWith(quote));

    if (quoteAsset && upperSymbol.length > quoteAsset.length) {
        return `${upperSymbol.slice(0, -quoteAsset.length)}/${quoteAsset}`;
    }

    if (upperSymbol.length === 6) {
        return `${upperSymbol.slice(0, 3)}/${upperSymbol.slice(3)}`;
    }

    return upperSymbol;
}

// Final empty block to complete the refactor
