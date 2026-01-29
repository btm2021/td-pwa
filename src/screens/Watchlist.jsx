import { useState, useEffect, useRef } from 'preact/hooks';
import { Icon } from '../components/Icon';
import { SymbolPanel } from '../components/SymbolPanel';
import { SearchPanel } from '../components/SearchPanel';
import { CategoryModal } from '../components/CategoryModal';
import { CatalogManager } from '../components/CatalogManager';
import {
    categories,
    activeCategory,
    activeCategorySymbols,
    tickerData,
    subscribeToTickers,
    setActiveCategory,
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
    removeSymbolFromCategory,
} from '../state/watchlist';
import { deviceMode } from '../hooks/useDeviceMode';
import { selectedSymbolName } from '../state/store';



export function Watchlist() {
    const [selectedSymbol, setSelectedSymbolState] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCatalogManager, setShowCatalogManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Sort State
    const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });

    const cats = categories.value;
    const activeCat = activeCategory.value;
    const symbols = activeCategorySymbols.value;
    const tickers = tickerData.value;
    const isDesktop = deviceMode.value === 'desktop';

    // Subscribe to tickers on mount
    useEffect(() => {
        subscribeToTickers();
    }, []);

    const handleSymbolClick = (symbol) => {
        // Symbol đã có prefix (VD: BINANCE:BTCUSDT, BYBIT:ETHUSDT, OKX:SOLUSDT)
        // Truyền trực tiếp - store.js sẽ xử lý normalize
        console.log('[Watchlist] Symbol clicked:', symbol);

        selectedSymbolName.value = symbol;

        if (window.innerWidth < 1024) {
            setSelectedSymbolState(symbol);
        }
    };

    const handleClosePanel = () => {
        setSelectedSymbolState(null);
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
            const tickerA = getTicker(a) || { price: 0, priceChangePercent: 0, quoteVolume: 0 };
            const tickerB = getTicker(b) || { price: 0, priceChangePercent: 0, quoteVolume: 0 };

            let valA, valB;
            if (sortConfig.key === 'symbol') {
                valA = a;
                valB = b;
            } else if (sortConfig.key === 'price') {
                valA = tickerA.price;
                valB = tickerB.price;
            } else if (sortConfig.key === 'change') {
                valA = tickerA.priceChangePercent;
                valB = tickerB.priceChangePercent;
            }

            if (valA < valB) return sortConfig.direction === -1;
            if (valA > valB) return sortConfig.direction === 1;
            return 0;
        });
        return sorted;
    };

    const sortedSymbols = getSortedSymbols();
    const selectedTicker = selectedSymbol ? getTicker(selectedSymbol) : null;

    if (isDesktop) {
        return (
            <div className="screen screen--no-padding screen--full-height watchlist-screen">
                {/* Desktop Header */}
                <div className="watchlist-header watchlist-header--inline">
                    <div className="watchlist-header__title-info watchlist-header__title-info--clickable" onClick={() => setShowCatalogManager(true)}>
                        <h1>Market</h1>
                        <span className="watchlist-count">{symbols.length}</span>
                        <Icon name="list" size={12} />
                    </div>

                    <div className="watchlist-search__input-wrapper">
                        <Icon name="search" size={14} />
                        <input
                            type="text"
                            placeholder="Filter..."
                            value={searchQuery}
                            onInput={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="watchlist-search__clear" onClick={() => setSearchQuery('')}>
                                <Icon name="close" size={12} />
                            </button>
                        )}
                    </div>

                    <div className="watchlist-header__actions">
                        <button className="icon-btn" onClick={() => setShowSearch(true)} title="Add Symbol">
                            <Icon name="plus" size={16} />
                        </button>
                    </div>
                </div>

                {/* Table Content */}
                <div className="watchlist-table-container">
                    <table className="watchlist-table">
                        <thead>
                            <tr>
                                <th className="sortable" onClick={() => setSortConfig({ key: 'symbol', direction: sortConfig.direction * -1 })}>
                                    <div className="th-content">
                                        Symbol
                                        {sortConfig.key === 'symbol' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                                    </div>
                                </th>
                                <th className="text-right sortable" style={{ width: '100px' }} onClick={() => setSortConfig({ key: 'price', direction: sortConfig.direction * -1 })}>
                                    <div className="th-content justify-end">
                                        Last
                                        {sortConfig.key === 'price' && <Icon name={sortConfig.direction === 1 ? 'arrow-up' : 'arrow-down'} size={10} />}
                                    </div>
                                </th>
                                <th className="text-right sortable" style={{ width: '90px' }} onClick={() => setSortConfig({ key: 'change', direction: sortConfig.direction * -1 })}>
                                    <div className="th-content justify-end">
                                        Chg%
                                        {sortConfig.key === 'change' && <Icon name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'} size={10} />}
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
                <div className="watchlist-footer">
                    <div className="watchlist-categories">
                        {cats.map((cat) => (
                            <button
                                key={cat.id}
                                className={`watchlist-category ${activeCat === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                                style={{ background: activeCat === cat.id ? cat.color : 'transparent' }}
                                title={cat.label}
                            >
                                {cat.label.charAt(0).toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button className="watchlist-category--add-btn" onClick={() => handleOpenCategoryModal(null)}>
                        <Icon name="plus" size={14} />
                    </button>
                </div>

                {/* Modals */}
                {showSearch && (
                    <SearchPanel
                        onClose={() => setShowSearch(false)}
                        onSelectSymbol={handleSearchSelect}
                        currentSymbols={symbols}
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
                    <span className="col-symbol">Pair</span>
                    <span className="col-price text-right">Last</span>
                    <span className="col-change text-right">Chg%</span>
                </div>

                {sortedSymbols.length > 0 ? (
                    sortedSymbols.map((symbol) => (
                        <SymbolListItem
                            key={symbol}
                            symbol={symbol}
                            isActive={selectedSymbolName.value === symbol}
                            ticker={getTicker(symbol)}
                            onClick={() => handleSymbolClick(symbol)}
                            onRemove={(sym) => removeSymbolFromCategory(activeCat, sym)}
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
            {!isDesktop && selectedSymbol && (
                <SymbolPanel
                    symbol={selectedSymbol}
                    ticker={selectedTicker}
                    onClose={handleClosePanel}
                />
            )}

            {showSearch && (
                <SearchPanel
                    onClose={() => setShowSearch(false)}
                    onSelectSymbol={handleSearchSelect}
                    currentSymbols={symbols}
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
    const price = ticker?.price || 0;
    const changePercent = ticker?.priceChangePercent || 0;
    const isPositive = changePercent >= 0;

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
            <td>
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    flexDirection: 'row'
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
                        whiteSpace: 'nowrap'
                    }}>
                        {displaySymbol}
                    </span>
                </div>
            </td>
            <td className="text-right price-cell" style={{ 
                color: priceTextColor,
                transition: 'color 0.3s ease'
            }}>
                {formatPrice(price)}
            </td>
            <td className={`text-right change-cell ${isPositive ? 'positive' : 'negative'}`}>
                {formatPercent(changePercent)}
            </td>
        </tr>
    );
}

function SymbolListItem({ symbol, isActive, ticker, onClick, onRemove }) {
    const [priceColor, setPriceColor] = useState('');
    const prevPriceRef = useRef(0);
    const displaySymbol = symbol.includes(':') ? symbol.split(':')[1] : symbol;

    const price = ticker?.price || 0;
    const changePercent = ticker?.priceChangePercent || 0;
    const isPositive = changePercent >= 0;

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
            <div className="col-symbol">
                <span className="symbol-name">{displaySymbol}</span>
                <span className="exchange-name">{ticker?.exchange || (symbol.includes(':') ? symbol.split(':')[0] : '')}</span>
            </div>

            <div className={`col-price text-right ${priceColor}`}>
                {formatPrice(price)}
            </div>

            <div className={`col-change text-right ${isPositive ? 'positive' : 'negative'}`}>
                {isPositive ? '+' : ''}{formatPercent(changePercent)}
            </div>

            <button
                className="item-remove-btn"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(symbol);
                }}
            >
                <Icon name="close" size={10} />
            </button>
        </div>
    );
}

// Final empty block to complete the refactor

