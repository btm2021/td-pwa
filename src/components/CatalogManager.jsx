import { Icon } from './Icon';
import {
    categories,
    removeCategory,
} from '../state/watchlist';
import { deviceMode } from '../hooks/useDeviceMode';

export function CatalogManager({ onClose, onAddCategory }) {
    const cats = categories.value;
    const isDesktop = deviceMode.value === 'desktop';

    const handleDelete = (categoryId) => {
        if (cats.length > 1) {
            removeCategory(categoryId);
        }
    };

    const handleEdit = (category) => {
        onAddCategory(category);
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Desktop Modal Layout
    if (isDesktop) {
        return (
            <div className="catalog-modal__backdrop" onClick={handleBackdropClick}>
                <div className="catalog-modal">
                    {/* Header */}
                    <div className="catalog-modal__header">
                        <h2>Manage Watchlists</h2>
                        <button className="catalog-modal__close" onClick={onClose}>
                            <Icon name="close" size={20} />
                        </button>
                    </div>

                    {/* Description */}
                    <p className="catalog-modal__desc">
                        Organize your watchlists. Click the gear icon to edit a list.
                    </p>

                    {/* Category List */}
                    <div className="catalog-modal__list">
                        {cats.length === 0 ? (
                            <div className="catalog-modal__empty">
                                <Icon name="list" size={48} />
                                <p>No watchlists yet</p>
                                <span>Create your first list to get started</span>
                            </div>
                        ) : (
                            cats.map((cat) => (
                                <div key={cat.id} className="catalog-modal__item">
                                    {/* Drag Handle */}
                                    <div className="catalog-modal__item-handle">
                                        <Icon name="dragHandle" size={18} />
                                    </div>

                                    {/* Color Dot */}
                                    <span
                                        className="catalog-modal__item-dot"
                                        style={{ background: cat.color }}
                                    />

                                    {/* Info */}
                                    <div className="catalog-modal__item-info">
                                        <span className="catalog-modal__item-name">{cat.label}</span>
                                        <span className="catalog-modal__item-count">
                                            {cat.symbols.length} symbol{cat.symbols.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>

                                    {/* Actions */}
                                    <div className="catalog-modal__item-actions">
                                        <button
                                            className="catalog-modal__item-btn"
                                            onClick={() => handleEdit(cat)}
                                            title="Edit list"
                                        >
                                            <Icon name="settings" size={16} />
                                        </button>
                                        {cats.length > 1 && (
                                            <button
                                                className="catalog-modal__item-btn catalog-modal__item-btn--danger"
                                                onClick={() => handleDelete(cat.id)}
                                                title="Delete list"
                                            >
                                                <Icon name="close" size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="catalog-modal__footer">
                        <button
                            className="catalog-modal__create-btn"
                            onClick={() => onAddCategory(null)}
                        >
                            <Icon name="plus" size={18} />
                            Create New List
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Mobile Bottom Sheet Layout (original)
    return (
        <>
            <div className="catalog-manager__backdrop" onClick={onClose} />
            <div className="catalog-manager">
                {/* Header */}
                <div className="catalog-manager__header">
                    <button className="catalog-manager__back" onClick={onClose}>
                        <Icon name="chevronLeft" size={24} />
                    </button>
                    <h2>Manage Lists</h2>
                    <button
                        className="catalog-manager__add"
                        onClick={() => onAddCategory(null)}
                    >
                        <Icon name="plus" size={24} />
                    </button>
                </div>

                {/* Description */}
                <p className="catalog-manager__desc">
                    Organize your watchlists. Tap the gear icon to edit a list.
                </p>

                {/* Category List */}
                <div className="catalog-manager__list">
                    {cats.length === 0 ? (
                        <div className="catalog-manager__empty">
                            <Icon name="list" size={48} />
                            <p>No watchlists yet</p>
                            <p>Create your first list to get started</p>
                        </div>
                    ) : (
                        cats.map((cat) => (
                            <div key={cat.id} className="catalog-item">
                                {/* Drag Handle */}
                                <div className="catalog-item__handle">
                                    <Icon name="dragHandle" size={20} />
                                </div>

                                {/* Color Dot */}
                                <span
                                    className="catalog-item__dot"
                                    style={{ background: cat.color }}
                                />

                                {/* Info */}
                                <div className="catalog-item__info">
                                    <span className="catalog-item__name">{cat.label}</span>
                                    <span className="catalog-item__count">
                                        {cat.symbols.length} symbol{cat.symbols.length !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="catalog-item__actions">
                                    <button
                                        className="catalog-item__btn"
                                        onClick={() => handleEdit(cat)}
                                        title="Edit list"
                                    >
                                        <Icon name="settings" size={18} />
                                    </button>
                                    {cats.length > 1 && (
                                        <button
                                            className="catalog-item__btn catalog-item__btn--danger"
                                            onClick={() => handleDelete(cat.id)}
                                            title="Delete list"
                                        >
                                            <Icon name="close" size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="catalog-manager__footer">
                    <button
                        className="btn btn--primary catalog-manager__create"
                        onClick={() => onAddCategory(null)}
                    >
                        <Icon name="plus" size={18} />
                        Create New List
                    </button>
                </div>
            </div>
        </>
    );
}
