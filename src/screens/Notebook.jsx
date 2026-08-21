import './Notebook.css';

export function Notebook() {
    return (
        <section className="notebook-screen" aria-label="Trading Strategy Notebook">
            <iframe
                className="notebook-screen__frame"
                src="/nb.html"
                title="Trading Strategy Notebook"
            />
        </section>
    );
}
