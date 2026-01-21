import { useState } from 'preact/hooks';
import { Icon } from './Icon';

const colorOptions = [
    { id: 'yellow', color: '#FFD600', label: 'Yellow' },
    { id: 'blue', color: '#2979FF', label: 'Blue' },
    { id: 'green', color: '#00C853', label: 'Green' },
    { id: 'orange', color: '#FF9100', label: 'Orange' },
    { id: 'purple', color: '#E040FB', label: 'Purple' },
    { id: 'cyan', color: '#00BCD4', label: 'Cyan' },
    { id: 'red', color: '#FF3B30', label: 'Red' },
    { id: 'pink', color: '#FF4081', label: 'Pink' },
];

export function CategoryModal({ onClose, onSave, editCategory = null }) {
    const [name, setName] = useState(editCategory?.label || '');
    const [selectedColor, setSelectedColor] = useState(editCategory?.color || colorOptions[0].color);
    const [error, setError] = useState('');

    const isEditing = !!editCategory;

    const handleSave = () => {
        if (!name.trim()) {
            setError('Please enter a category name');
            return;
        }

        const categoryId = isEditing
            ? editCategory.id
            : name.toLowerCase().replace(/\s+/g, '-');

        onSave({
            id: categoryId,
            label: name.trim(),
            color: selectedColor,
            symbols: editCategory?.symbols || [],
        });

        onClose();
    };

    return (
        <>
            <div className="modal__backdrop" onClick={onClose} />
            <div className="modal category-modal">
                {/* Header */}
                <div className="modal__header">
                    <h2>{isEditing ? 'Edit Category' : 'New Category'}</h2>
                    <button className="modal__close" onClick={onClose}>
                        <Icon name="close" size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="modal__content">
                    {/* Name Input */}
                    <div className="form-group">
                        <label>Category Name</label>
                        <input
                            type="text"
                            placeholder="e.g., My Favorites"
                            value={name}
                            onInput={(e) => {
                                setName(e.target.value);
                                setError('');
                            }}
                            className={error ? 'error' : ''}
                        />
                        {error && <span className="form-error">{error}</span>}
                    </div>

                    {/* Color Picker */}
                    <div className="form-group">
                        <label>Color</label>
                        <div className="color-picker">
                            {colorOptions.map((opt) => (
                                <button
                                    key={opt.id}
                                    className={`color-picker__item ${selectedColor === opt.color ? 'active' : ''}`}
                                    style={{ '--color': opt.color }}
                                    onClick={() => setSelectedColor(opt.color)}
                                    title={opt.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="form-group">
                        <label>Preview</label>
                        <div className="category-preview">
                            <span className="category-preview__dot" style={{ background: selectedColor }} />
                            <span className="category-preview__label">{name || 'Category Name'}</span>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="modal__footer">
                    <button className="btn btn--ghost" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="btn btn--primary" onClick={handleSave}>
                        {isEditing ? 'Save Changes' : 'Create Category'}
                    </button>
                </div>
            </div>
        </>
    );
}
