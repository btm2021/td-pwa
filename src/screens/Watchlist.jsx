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
        // Just update the selected symbol in global store
        // If we are in watchlist tab on desktop, the right panel (SymbolInfoPanel) will update automatically
        // We don't want to navigateToChart because that switches activeTab to 'chart'
        const isForex = !symbol.includes('USDT') && !symbol.includes('BUSD') && !symbol.includes('USDC') && !symbol.includes('PERP');
        const chartSymbol = isForex && !symbol.startsWith('OANDA:') ? `OANDA:${symbol}` : symbol;

        selectedSymbolName.value = chartSymbol;

        // For mobile/modal if needed
        if (window.innerWidth < 1024) {
            setSelectedSymbolState(chartSymbol);
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

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedSymbols = () => {
        // Filter by searchQuery first
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
            } else if (sortConfig.key === 'volume') {
                valA = tickerA.quoteVolume || 0;
                valB = tickerB.quoteVolume || 0;
            }

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sorted;
    };

    const sortedSymbols = getSortedSymbols();
    const selectedTicker = selectedSymbol ? getTicker(selectedSymbol) : null;
    const currentCategory = cats.find(c => c.id === activeCat);

    return (
        <div className="screen screen--no-padding watchlist-screen">
            {/* Header */}
            <div className="watchlist-header">
                <div className="watchlist-header__title-row">
                    <div className="watchlist-header__title-info">
                        <h1>Watchlist</h1>
                        <span className="watchlist-count">{symbols.length} symbols</span>
                    </div>
                    <div className="watchlist-header__actions">
                        <button
                            className="btn btn--icon btn--ghost"
                            onClick={() => setShowCatalogManager(true)}
                            title="Manage lists"
                        >
                            <Icon name="list" size={18} />
                        </button>
                    </div>
                </div>

                {/* Local Search Input */}
                <div className="watchlist-search">
                    <div className="watchlist-search__input-wrapper">
                        <Icon name="search" size={16} />
                        <input
                            type="text"
                            placeholder="Find in watchlist..."
                            value={searchQuery}
                            onInput={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="watchlist-search__clear" onClick={() => setSearchQuery('')}>
                                <Icon name="close" size={12} />
                            </button>
                        )}
                    </div>
                    <button
                        className="btn btn--primary btn--sm"
                        onClick={() => setShowSearch(true)}
                    >
                        <Icon name="plus" size={14} />
                        <span>Add</span>
                    </button>
                </div>
            </div>

            {/* Symbols Table */}
            <div className="watchlist-table-container">
                <table className="watchlist-table">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => handleSort('symbol')}>
                                <div className="th-content">
                                    Symbol
                                    {sortConfig.key === 'symbol' && <Icon name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />}
                                </div>
                            </th>
                            <th className="sortable text-right" onClick={() => handleSort('price')}>
                                <div className="th-content justify-end">
                                    Last
                                    {sortConfig.key === 'price' && <Icon name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />}
                                </div>
                            </th>
                            <th className="sortable text-right" onClick={() => handleSort('change')}>
                                <div className="th-content justify-end">
                                    Chg%
                                    {sortConfig.key === 'change' && <Icon name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />}
                                </div>
                            </th>
                            <th className="sortable text-right desktop-only" onClick={() => handleSort('volume')}>
                                <div className="th-content justify-end">
                                    Vol (USDT)
                                    {sortConfig.key === 'volume' && <Icon name={sortConfig.direction === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />}
                                </div>
                            </th>
                            <th className="action-cell"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSymbols.map((symbol) => (
                            <SymbolTableRow
                                key={symbol}
                                symbol={symbol}
                                isActive={selectedSymbolName.value === symbol || (symbol.startsWith('OANDA:') && selectedSymbolName.value === symbol) || ('OANDA:' + symbol === selectedSymbolName.value)}
                                ticker={getTicker(symbol)}
                                onClick={() => handleSymbolClick(symbol)}
                                onRemove={(sym) => removeSymbolFromCategory(activeCat, sym)}
                            />
                        ))}
                    </tbody>
                </table>

                {symbols.length === 0 && (
                    <div className="watchlist-empty">
                        <div className="watchlist-empty__icon">
                            <Icon name="star" size={48} />
                        </div>
                        <h3>Your list is empty</h3>
                        <p>Add symbols to start tracking</p>
                        <button className="btn btn--primary" onClick={() => setShowSearch(true)}>
                            Add Symbols
                        </button>
                    </div>
                )}

                {symbols.length > 0 && sortedSymbols.length === 0 && searchQuery && (
                    <div className="watchlist-empty">
                        <p>No matches for "{searchQuery}"</p>
                        <button className="btn btn--ghost btn--sm" onClick={() => setSearchQuery('')}>
                            Clear search
                        </button>
                    </div>
                )}
            </div>

            {/* Footer Categories */}
            <div className="watchlist-footer">
                <button className="footer-nav-btn" onClick={() => {
                    const el = document.querySelector('.watchlist-categories');
                    if (el) el.scrollBy({ left: -100, behavior: 'smooth' });
                }}>
                    <Icon name="chevron-left" size={14} />
                </button>

                <div className="watchlist-categories">
                    {cats.map((cat) => (
                        <button
                            key={cat.id}
                            className={`watchlist-category ${activeCat === cat.id ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat.id)}
                        >
                            <span className="cat-dot" style={{ background: cat.color || '#2979FF' }}></span>
                            <span className="cat-label">{cat.label}</span>
                        </button>
                    ))}
                </div>

                <button className="footer-nav-btn" onClick={() => {
                    const el = document.querySelector('.watchlist-categories');
                    if (el) el.scrollBy({ left: 100, behavior: 'smooth' });
                }}>
                    <Icon name="chevron-right" size={14} />
                </button>

                <button
                    className="watchlist-category--add-btn"
                    onClick={() => handleOpenCategoryModal(null)}
                >
                    <Icon name="plus" size={14} />
                </button>
            </div>

            {/* Mobile Symbol Detail Modal */}
            {!isDesktop && selectedSymbol && (
                <SymbolPanel
                    symbol={selectedSymbol}
                    ticker={selectedTicker}
                    onClose={handleClosePanel}
                />
            )}

            {/* Search Panel */}
            {showSearch && (
                <SearchPanel
                    onClose={() => setShowSearch(false)}
                    onSelectSymbol={handleSearchSelect}
                    currentSymbols={symbols}
                />
            )}

            {/* Category Modal */}
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

            {/* Catalog Manager */}
            {showCatalogManager && (
                <CatalogManager
                    onClose={() => setShowCatalogManager(false)}
                    onAddCategory={handleOpenCategoryModal}
                />
            )}
        </div>
    );
}

function SymbolTableRow({ symbol, isActive, ticker, onClick, onRemove }) {
    const [priceColor, setPriceColor] = useState('');
    const prevPriceRef = useRef(0);
    const baseAsset = getBaseAsset(symbol).toUpperCase();
    const price = ticker?.price || 0;
    const changePercent = ticker?.priceChangePercent || 0;
    const quoteVolume = ticker?.quoteVolume || 0;
    const isPositive = changePercent >= 0;
    const isForex = !symbol.includes('USDT') && !symbol.includes('BUSD') && !symbol.includes('USDC') && !symbol.includes('PERP');

    useEffect(() => {
        if (price !== 0) {
            if (prevPriceRef.current !== 0) {
                if (price > prevPriceRef.current) setPriceColor('positive-flash');
                else if (price < prevPriceRef.current) setPriceColor('negative-flash');

                const timer = setTimeout(() => setPriceColor(''), 500);
                return () => clearTimeout(timer);
            }
            prevPriceRef.current = price;
        }
    }, [price]);

    return (
        <tr className={`watchlist-table-row ${isActive ? 'active' : ''}`} onClick={onClick}>
            <td className="symbol-cell">
                <div className="symbol-cell__content">
                    <span className="symbol-cell__symbol">{symbol.includes(':') ? symbol.split(':')[1] : symbol}</span>
                    <span className="symbol-cell__exchange">{ticker?.exchange || (symbol.includes(':') ? symbol.split(':')[0] : 'BN')}</span>
                </div>
            </td>
            <td className={`text-right price-cell ${priceColor}`}>
                {formatPrice(price)}
            </td>
            <td className={`text-right change-cell ${isPositive ? 'positive' : 'negative'}`}>
                {formatPercent(changePercent)}
            </td>
            <td className="text-right volume-cell desktop-only">
                {isForex ? '-' : formatVolume(quoteVolume)}
            </td>
            <td className="action-cell">
                <button
                    className="btn-remove"
                    onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
                >
                    <Icon name="close" size={14} />
                </button>
            </td>
        </tr>
    );
}
