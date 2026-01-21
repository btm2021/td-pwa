import { formatPrice, formatChange } from '../state/symbols';

export function PriceRow({ symbol, onClick }) {
    const isPositive = symbol.change >= 0;

    return (
        <div className="price-row" onClick={onClick}>
            <div className={`price-row__icon ${symbol.iconClass || ''}`}>
                {symbol.iconLetter}
            </div>
            <div className="price-row__info">
                <div className="price-row__symbol">{symbol.symbol}</div>
                <div className="price-row__desc">{symbol.description}</div>
            </div>
            <div className="price-row__data">
                <div className="price-row__price">{formatPrice(symbol.price)}</div>
                <div className={`price-row__change ${isPositive ? 'price-row__change--positive' : 'price-row__change--negative'}`}>
                    {formatChange(symbol.change)}
                </div>
            </div>
        </div>
    );
}
