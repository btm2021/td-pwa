import { render } from 'preact';
import { App } from './app.jsx';
import { registerSW } from 'virtual:pwa-register'

// Register service worker for PWA
registerSW({ immediate: true })

render(<App />, document.getElementById('app'));
