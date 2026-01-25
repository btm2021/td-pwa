// Scanner Manager
// Manages multiple workers for different data sources

export class ScannerManager {
    constructor() {
        this.workers = new Map();
        this.callbacks = new Set();
        this.data = new Map(); // Store latest data per symbol
    }

    addSource(sourceConfig) {
        if (this.workers.has(sourceConfig.name)) return;

        // In Vite, we use this syntax for workers
        const worker = new Worker(new URL('./worker.js', import.meta.url), {
            type: 'module'
        });

        worker.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === 'DATA') {
                this.handleData(payload);
            } else if (type === 'STATUS') {
                console.log(`Source ${sourceConfig.name} status: ${payload.status}`);
            }
        };

        worker.postMessage({
            type: 'INIT',
            payload: { sourceConfig }
        });

        this.workers.set(sourceConfig.name, worker);
    }

    subscribe(sourceName, symbols) {
        const worker = this.workers.get(sourceName);
        if (worker) {
            worker.postMessage({
                type: 'SUBSCRIBE',
                payload: { symbols }
            });
        }
    }

    handleData(item) {
        const key = `${item.source}:${item.symbol}`;
        this.data.set(key, {
            ...item,
            lastUpdate: Date.now()
        });

        // Notify subscribers
        this.callbacks.forEach(cb => cb(this.getLatestData()));
    }

    getLatestData() {
        return Array.from(this.data.values());
    }

    onUpdate(callback) {
        this.callbacks.add(callback);
        return () => this.callbacks.delete(callback);
    }

    destroy() {
        this.workers.forEach(w => w.terminate());
        this.workers.clear();
        this.callbacks.clear();
    }
}

// Singleton instance
export const scannerManager = new ScannerManager();
