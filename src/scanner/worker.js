// Scanner Worker
// Handles WebSocket connections for a specific data source

let socket = null;
let currentSource = null;

self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'INIT':
            initSource(payload.sourceConfig);
            break;
        case 'SUBSCRIBE':
            subscribe(payload.symbols);
            break;
        case 'CLOSE':
            if (socket) socket.close();
            break;
    }
};

function initSource(config) {
    currentSource = config;
    // We can't import modules easily in all worker environments without bundling
    // So we'll assume the normalization logic is passed or defined.
    // In a real Vite app, we'd use import assertions or similar if supported.

    if (socket) socket.close();

    socket = new WebSocket(config.wsUrl);

    socket.onopen = () => {
        self.postMessage({ type: 'STATUS', payload: { status: 'connected' } });
    };

    socket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // This is a bit tricky: we need the normalize function.
        // For now, I'll implement a basic version inside the worker or
        // expect the config to have a stringified version of the function (less ideal).

        // Better: the worker is specific to a source or handles many.
        // Let's make this worker generic and pass the logic.

        // Custom normalization based on source name
        const normalized = normalizeData(data, currentSource.name);
        if (normalized) {
            self.postMessage({ type: 'DATA', payload: normalized });
        }
    };

    socket.onerror = (err) => {
        self.postMessage({ type: 'ERROR', payload: err.message });
    };

    socket.onclose = () => {
        self.postMessage({ type: 'STATUS', payload: { status: 'disconnected' } });
    };
}

function subscribe(symbols) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    // Standard Binance-style subscribe for demo
    const msg = {
        method: 'SUBSCRIBE',
        params: symbols.map(s => `${s.toLowerCase()}@ticker`),
        id: Date.now()
    };
    socket.send(JSON.stringify(msg));
}

function normalizeData(msg, sourceName) {
    if (sourceName === 'binance') {
        // Binance 24h ticker pattern
        if (msg.e === '24hrTicker') {
            return {
                source: 'binance',
                symbol: msg.s,
                type: 'perp',
                timestamp: msg.E,
                price: parseFloat(msg.c),
                change: parseFloat(msg.P),
                volume: parseFloat(msg.v),
                high: parseFloat(msg.h),
                low: parseFloat(msg.l)
            };
        }
    }
    return null;
}
