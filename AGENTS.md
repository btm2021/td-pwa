# Repository Guidelines

## Project Overview
This is **TD Trading** (`tradingview-pwa` in `package.json`), a Vite-powered Preact progressive web app that wraps the TradingView Advanced Charting Library with a custom multi-exchange trading UI. It targets both mobile and desktop, selected at runtime by a device-mode signal (breakpoint 1024px, user-overridable and persisted in `localStorage`).

Key capabilities:
- TradingView advanced charts fed by custom datafeeds for Binance (spot/futures), Bybit, OKX, KuCoin, MEXC, and OANDA, routed through a `DatafeedManager` (`chart/datafeeds/datafeed-manager.js`).
- A watchlist with categories, a market scanner running in a Web Worker (`src/scanner/worker.js`), chart replay controls, and an account screen.
- Chart layout save/load backed by Firebase Firestore via `chart/save-load-adapter.js` (Firebase compat SDK loaded from CDN in `index.html`).
- PWA installability with `vite-plugin-pwa` (manifest name "TD Trading", standalone display, black theme).

## Technology Stack
- **UI**: Preact 10 (functional components + hooks) with `@preact/signals` for state. No JSX pragma setup needed — `@preact/preset-vite` handles it.
- **Routing/navigation**: signal-based tabs (`activeTab` in `src/state/store.js`), not URL routing. `preact-router` is installed but not currently used in `src/`.
- **Charts**: vendored TradingView Charting Library under `chart/`, loaded as plain `<script>` tags from `index.html` (globals like `window.TradingView`), plus `lightweight-charts` as an npm dependency.
- **Workers**: scanner uses `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`.
- **Backend**: Firebase (Firestore) for chart save/load, initialized in `chart/save-load-adapter.js`.
- There is **no TypeScript, no linter/formatter config, and no test runner** in this repo.

## Project Structure & Module Organization
- `src/` — the Preact app:
  - `main.jsx` — entry; registers the service worker (`virtual:pwa-register`) and renders `App`.
  - `app.jsx` — root component; imports global styles from `src/styles/`, shows `SplashScreen`, then renders `DesktopShell` or `AppShell` by device mode.
  - `components/` — reusable UI (`SymbolPanel.jsx`, `PriceRow.jsx`, `TimeframeTabs.jsx`, `ReplayControls.jsx`, etc.).
  - `layout/` — `AppShell.jsx`, `TopBar.jsx`, `BottomNav.jsx` (mobile) and `layout/desktop/` (`DesktopShell.jsx`, `SideNav.jsx`, `TopNav.jsx`).
  - `screens/` — tab screens: `Watchlist.jsx`, `Chart.jsx`, `Scanner/`, `Futures.jsx`, `Calendar.jsx`, `Explore.jsx`, `Community.jsx`, `Account.jsx`, `Menu.jsx`, plus `screens/desktop/DesktopChart.jsx`.
  - `state/` — `@preact/signals` stores: `store.js` (active tab, selected symbol/timeframe, exchange config, `parseSymbol`), `watchlist.js`, `symbols.js`, `account.js`.
  - `hooks/` — `useDeviceMode.js` (mobile/desktop detection and override).
  - `utils/` — `data.js`, `indicators.js` helpers.
  - `chart/TradingViewChart.jsx` — Preact wrapper around the TradingView widget.
  - `scanner/` — `manager.js` (worker orchestration), `worker.js`, `sources/binance.js`, `types.js`.
- `chart/` — **vendored TradingView integration code**: `charting_library/`, `datafeeds/` (one datasource per exchange, plus `datafeed-manager.js` and `unified-datafeed.js`), `custom_studies/` (custom indicators like VSR, SMC, FVG, ATR variants), `replay/`, `embed-app.js`, `save-load-adapter.js`, `custom_dialog/`. Treat as vendored code; change only when charting-library or datafeed behavior requires it.
- `public/` — static assets copied verbatim to `dist/`, including a copy of `chart/` (so `/chart/*` works in production builds).
- `index.html` — loads the TradingView library, custom studies, datafeeds, and Firebase compat SDKs via plain script tags.
- `apps/1/`, `stat/` — standalone HTML/JS prototypes and reports; **not** part of the Vite build.
- `dist/` — production build output.
- `generate_vp.cjs`, `test_graphics.js` — ad-hoc Node scripts, not wired into npm scripts.

## Build, Test, and Development Commands
- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the Vite dev server on port `3000` (`host: true`, so LAN devices can reach it).
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally for verification.

Dev-server detail: `vite.config.js` defines a custom `serveChartPlugin()` middleware that streams files from the repo-root `chart/` directory for any `/chart/*` request (with `Cache-Control: no-store`). In production the same URLs resolve from `public/chart/`.

Use `npm run build` as the minimum pre-PR validation step because there is no automated test or lint script checked in.

## Coding Style & Naming Conventions
Write ES module code with functional Preact components and hooks. State is shared via exported signals from `src/state/*` (import the signal and read `.value` directly in components; do not introduce another state library). Match the surrounding file's formatting; this codebase mixes 2-space and 4-space indentation, so avoid broad reformatting. Prefer:
- `PascalCase` for components and screen files, for example `SymbolPanel.jsx`
- `camelCase` for hooks, helpers, and state actions, for example `useDeviceMode.js`
- `UPPER_SNAKE_CASE` for exported constants such as `EXCHANGES` in `src/state/store.js`

Keep imports grouped logically and comments brief. Comments in the codebase are written in both English and Vietnamese; either is acceptable — match the file you are editing.

Symbol naming convention: symbols are normalized to `EXCHANGE:RAWSYMBOL` (e.g. `BINANCE:BTCUSDT`) via `parseSymbol`/`normalizeSymbol` in `src/state/store.js`; crypto symbols without a prefix default to Binance, 6-letter and XAU/XAG symbols default to OANDA.

## Testing Guidelines
There is no test runner configured. For non-trivial logic, add future-friendly tests beside the feature or under `src/**/__tests__/`, using `*.test.js` or `*.test.jsx`. Until a runner is added, validate with `npm run build` and focused manual checks for chart loading, PWA update flow, and mobile/desktop mode switching.

## PWA & Caching Notes
- Service worker is generated by `vite-plugin-pwa` with `registerType: 'autoUpdate'`; `src/main.jsx` prompts the user to reload on new content.
- Workbox precaching is disabled (`globPatterns: []`); scripts, styles, and documents are `NetworkOnly`, images are `CacheFirst` (30 days). The dev server also sends `Cache-Control: no-store`.
- If the app serves stale code, suspect the service worker / browser cache before suspecting the build.

## Security Considerations
- Do not commit secrets or environment-specific endpoints. Note that `chart/save-load-adapter.js` currently contains a hardcoded Firebase web config (API key etc.) for the `papertrading-6332a` project — web API keys are semi-public by design, but keep real credentials out of the repo and prefer environment injection for anything sensitive.
- Exchange market data comes from public REST/WebSocket APIs (Binance, Bybit, OKX, KuCoin, MEXC, OANDA); there is no authenticated trading in this app.
- `npm run dev` binds to all interfaces (`host: true`) with `allowedHosts: true` — be aware this exposes the dev server on the local network.

## Commit & Pull Request Guidelines
Recent history uses very short subjects (e.g. `Asd`), but new commits should use clear imperative messages such as `Add scanner source status badges`. Keep commits focused and avoid mixing refactors with behavior changes. PRs should include:
- a short summary of user-visible changes
- linked issue or task reference when applicable
- screenshots or screen recordings for UI changes
- notes about manual verification performed (`npm run build`, device-mode checks, PWA refresh flow)
