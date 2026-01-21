export function Card({ title, children, footer, className = '' }) {
    return (
        <div className={`card ${className}`}>
            {title && (
                <div className="card__header">
                    <h3 className="card__title">{title}</h3>
                </div>
            )}
            <div className="card__body">{children}</div>
            {footer && <div className="card__footer">{footer}</div>}
        </div>
    );
}
