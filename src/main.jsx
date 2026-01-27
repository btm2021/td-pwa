import { render } from 'preact';
import { App } from './app.jsx';
import { registerSW } from 'virtual:pwa-register';

// Standard SW registration
const updateSW = registerSW({
    onNeedRefresh() {
        if (confirm('New content available. Reload?')) {
            updateSW(true);
        }
    },
});

render(<App />, document.getElementById('app'));
