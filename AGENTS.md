# Repository Guidelines

## Project Structure & Module Organization
This repository is a Vite-powered Preact PWA. App code lives in `src/`: UI in `components/`, `layout/`, and `screens/`; shared state in `src/state/`; hooks in `src/hooks/`; helpers in `src/utils/`. Chart and scanner integrations live in `src/chart/`, `src/scanner/`, and vendored TradingView assets under `chart/`. Static assets are in `public/`; production output is `dist/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies from `package-lock.json`.
- `npm run dev`: start the local Vite dev server on port `3000`.
- `npm run build`: create a production build in `dist/`.
- `npm run preview`: serve the production build locally for verification.

Use `npm run build` as the minimum pre-PR validation step because there is no automated test or lint script checked in yet.

## Coding Style & Naming Conventions
Write ES module code with functional Preact components and hooks. Match the surrounding file’s formatting; this codebase mixes 2-space and 4-space indentation, so avoid broad reformatting. Prefer:
- `PascalCase` for components and screen files, for example `SymbolPanel.jsx`
- `camelCase` for hooks, helpers, and state actions, for example `useWakeLock.js`
- `UPPER_SNAKE_CASE` for exported constants such as exchange maps in `src/state/store.js`

Keep imports grouped logically and comments brief.

## Testing Guidelines
There is no test runner configured yet. For non-trivial logic, add future-friendly tests beside the feature or under `src/**/__tests__/`, using `*.test.js` or `*.test.jsx`. Until a runner is added, validate with `npm run build` and focused manual checks for chart loading, PWA update flow, and mobile/desktop mode switching.

## Commit & Pull Request Guidelines
Recent history uses very short subjects, but new commits should use clear imperative messages such as `Add scanner source status badges`. Keep commits focused and avoid mixing refactors with behavior changes. PRs should include:
- a short summary of user-visible changes
- linked issue or task reference when applicable
- screenshots or screen recordings for UI changes
- notes about manual verification performed (`npm run build`, device-mode checks, PWA refresh flow)

## Configuration Notes
Do not commit secrets or environment-specific endpoints. Treat `chart/` as vendored integration code and change it only when charting-library or datafeed behavior requires it.
