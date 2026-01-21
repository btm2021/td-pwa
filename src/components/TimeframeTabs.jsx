export function TimeframeTabs({ timeframes, selected, onSelect }) {
    return (
        <div className="timeframe-tabs">
            {timeframes.map((tf) => (
                <button
                    key={tf.id}
                    className={`timeframe-tabs__item ${selected === tf.id ? 'timeframe-tabs__item--active' : ''}`}
                    onClick={() => onSelect(tf.id)}
                >
                    {tf.label}
                </button>
            ))}
        </div>
    );
}
