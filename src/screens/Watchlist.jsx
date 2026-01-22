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
    addSymbolToCategory,
    addCategory,
    removeCategory,
    updateCategory,
    removeSymbolFromCategory,
} from '../state/watchlist';



export function Watchlist() {
    const [selectedSymbol, setSelectedSymbolState] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCatalogManager, setShowCatalogManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    // Sort State
    const [sortConfig, setSortConfig] = useState({ key: 'symbol', direction: 'asc' });

    const cats = categories.value;
    const activeCat = activeCategory.value;
    const symbols = activeCategorySymbols.value;
    const tickers = tickerData.value;

    // Subscribe to tickers on mount
    useEffect(() => {
        subscribeToTickers();
    }, []);

    const handleSymbolClick = (symbol) => {
        // Global state update for Chart
        navigateToChart(symbol);

        // For mobile/modal if needed (though on desktop we now have split view)
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

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getSortedSymbols = () => {
        const sorted = [...symbols];
        sorted.sort((a, b) => {
            const tickerA = getTicker(a) || { price: 0, priceChangePercent: 0 };
            const tickerB = getTicker(b) || { price: 0, priceChangePercent: 0 };

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
                    <h1>Watchlist</h1>
                    <div className="watchlist-header__actions">
                        <button
                            className="btn btn--icon btn--ghost"
                            onClick={() => setShowSearch(true)}
                            title="Search symbols"
                        >
                            <Icon name="search" size={18} />
                        </button>
                        <button
                            className="btn btn--icon btn--ghost"
                            onClick={() => setShowCatalogManager(true)}
                            title="Manage lists"
                        >
                            <Icon name="list" size={18} />
                        </button>
                    </div>
                </div>

                {/* Category Tabs - Segmented Control style */}
                <div className="watchlist-categories-container">
                    <div className="watchlist-categories">
                        {cats.map((cat) => (
                            <button
                                key={cat.id}
                                className={`watchlist-category ${activeCat === cat.id ? 'active' : ''}`}
                                onClick={() => setActiveCategory(cat.id)}
                            >
                                {cat.label}
                            </button>
                        ))}
                        <button
                            className="watchlist-category watchlist-category--add"
                            onClick={() => handleOpenCategoryModal(null)}
                        >
                            <Icon name="plus" size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Symbols Table */}
            <div className="watchlist-table-container">
                <table className="watchlist-table">
                    <thead>
                        <tr>
                            <th className="sortable" onClick={() => handleSort('symbol')}>
                                Symbol
                            </th>
                            <th className="sortable text-right" onClick={() => handleSort('price')}>
                                Last
                            </th>
                            <th className="sortable text-right" onClick={() => handleSort('change')}>
                                Chg%
                            </th>
                            <th className="action-cell"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedSymbols.map((symbol) => (
                            <SymbolTableRow
                                key={symbol}
                                symbol={symbol}
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
            </div>

            {/* Mobile Symbol Detail Modal */}
            {selectedSymbol && (
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

function SymbolTableRow({ symbol, ticker, onClick, onRemove }) {
    const [priceColor, setPriceColor] = useState('');
    const prevPriceRef = useRef(0);
    const baseAsset = getBaseAsset(symbol).toUpperCase();
    const price = ticker?.price || 0;
    const changePercent = ticker?.priceChangePercent || 0;
    const isPositive = changePercent >= 0;

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
        <tr className="watchlist-table-row" onClick={onClick}>
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
