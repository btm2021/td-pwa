import { Icon } from './Icon';
import {
    categories,
    removeCategory,
} from '../state/watchlist';

export function CatalogManager({ onClose, onAddCategory }) {
    const cats = categories.value;

    const handleDelete = (categoryId) => {
        if (cats.length > 1) {
            removeCategory(categoryId);
        }
    };

    const handleEdit = (category) => {
        onAddCategory(category);
    };

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
