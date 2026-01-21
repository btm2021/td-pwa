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

function SymbolRow({ symbol, ticker, onClick }) {
    const [imgError, setImgError] = useState(false);
    const [priceColor, setPriceColor] = useState(''); // 'positive' or 'negative'
    const prevPriceRef = useRef(0);

    const baseAsset = getBaseAsset(symbol).toUpperCase();

    const price = ticker?.price || 0;
    const changePercent = ticker?.priceChangePercent || 0;
    const isPositive = changePercent >= 0;

    useEffect(() => {
        if (price !== 0) {
            if (prevPriceRef.current !== 0) {
                if (price > prevPriceRef.current) {
                    setPriceColor('positive');
                } else if (price < prevPriceRef.current) {
                    setPriceColor('negative');
                }
            }
            prevPriceRef.current = price;
        }
    }, [price]);

    return (
        <div className="watchlist-row" onClick={onClick}>
            <div className="watchlist-row__icon">
                {!imgError ? (
                    <img
                        src={getCoinLogoUrl(symbol)}
                        alt={baseAsset}
                        onError={() => setImgError(true)}
                        loading="lazy"
                    />
                ) : (
                    <span className="watchlist-row__icon-fallback">{baseAsset.charAt(0)}</span>
                )}
            </div>

            <div className="watchlist-row__info">
                <div className="watchlist-row__symbol">{symbol}</div>
                <div className="watchlist-row__name">{baseAsset} / USDT Perp</div>
            </div>

            <div className="watchlist-row__data">
                <div className={`watchlist-row__price ${priceColor}`}>{formatPrice(price)}</div>
                <div className={`watchlist-row__change ${isPositive ? 'positive' : 'negative'}`}>
                    {formatPercent(changePercent)}
                </div>
            </div>
        </div>
    );
}

export function Watchlist() {
    const [selectedSymbol, setSelectedSymbol] = useState(null);
    const [showSearch, setShowSearch] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showCatalogManager, setShowCatalogManager] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

    const cats = categories.value;
    const activeCat = activeCategory.value;
    const symbols = activeCategorySymbols.value;
    const tickers = tickerData.value;

    // Subscribe to tickers on mount
    useEffect(() => {
        subscribeToTickers();
    }, []);

    const handleSymbolClick = (symbol) => {
        setSelectedSymbol(symbol);
    };

    const handleClosePanel = () => {
        setSelectedSymbol(null);
    };

    const handleSearchSelect = (symbol) => {
        addSymbolToCategory(activeCat, symbol);
        setShowSearch(false);
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

    const selectedTicker = selectedSymbol ? getTicker(selectedSymbol) : null;
    const currentCategory = cats.find(c => c.id === activeCat);

    return (
        <div className="screen screen--no-padding">
            {/* Header */}
            <div className="watchlist-header">
                <h1>Watchlist</h1>
                <div className="watchlist-header__actions">
                    <button
                        className="btn btn--icon btn--ghost"
                        onClick={() => setShowSearch(true)}
                        title="Search symbols"
                    >
                        <Icon name="search" size={22} />
                    </button>
                    <button
                        className="btn btn--icon btn--ghost"
                        onClick={() => setShowCatalogManager(true)}
                        title="Manage lists"
                    >
                        <Icon name="list" size={22} />
                    </button>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="watchlist-categories">
                {cats.map((cat) => (
                    <button
                        key={cat.id}
                        className={`watchlist-category ${activeCat === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                        style={{ '--category-color': cat.color }}
                    >
                        <span className="watchlist-category__dot" />
                        <span className="watchlist-category__label">{cat.label}</span>
                        {cat.symbols.length > 0 && (
                            <span className="watchlist-category__count">{cat.symbols.length}</span>
                        )}
                    </button>
                ))}

                {/* Add Category Button */}
                <button
                    className="watchlist-category watchlist-category--add"
                    onClick={() => handleOpenCategoryModal(null)}
                    title="Create new list"
                >
                    <Icon name="plus" size={16} />
                </button>
            </div>

            {/* Symbol List */}
            <div className="watchlist-list">
                {symbols.map((symbol) => (
                    <SymbolRow
                        key={symbol}
                        symbol={symbol}
                        ticker={tickers[symbol]}
                        onClick={() => handleSymbolClick(symbol)}
                    />
                ))}

                {symbols.length === 0 && (
                    <div className="watchlist-empty">
                        <div className="watchlist-empty__icon">
                            <Icon name="star" size={48} />
                        </div>
                        <h3>No symbols yet</h3>
                        <p className="watchlist-empty__hint">
                            Search and add symbols to your watchlist
                        </p>
                        <button
                            className="btn btn--primary"
                            onClick={() => setShowSearch(true)}
                        >
                            <Icon name="search" size={18} />
                            Search Symbols
                        </button>
                    </div>
                )}
            </div>

            {/* Symbol Detail Panel */}
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
