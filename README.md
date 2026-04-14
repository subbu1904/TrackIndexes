# TrackIndexes

TrackIndexes is a local-first PWA for watching near-realtime `NIFTY 50` and `SENSEX` quotes with no login. It stores workspace state on-device, autosaves changes, and supports JSON backup export/import. The same web build is prepared for Capacitor-based Android packaging.

## Stack

- Vite
- Vanilla JavaScript modules
- CSS custom properties and component styles
- `vite-plugin-pwa`
- Native browser storage: IndexedDB + `localStorage`
- Node built-in test runner

## Development

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npm run dev
```

Run tests:

```bash
npm test
```

Build the production PWA bundle:

```bash
npm run build
```

The committed production build points at the deployed Worker API:

```bash
https://trackindexes-market-data.rampalli1.workers.dev/api/quotes
```

Use a custom market data API endpoint during build or dev:

```bash
VITE_MARKET_DATA_API_URL=https://your-worker.your-subdomain.workers.dev/api/quotes npm run dev
```

Build with a GitHub Pages base path override:

```bash
VITE_BASE_PATH=/TrackIndexes/ npm run build
```

Preview the built app:

```bash
npm run preview
```

## Market Data API

The app now prefers a normalized market data API instead of fetching provider-specific market feeds directly.

Default behavior:
- The client reads from `/api/quotes`
- If that API is unavailable, the app temporarily falls back to the legacy client-side quote fetch path

For Android builds and GitHub Pages deployments, set `VITE_MARKET_DATA_API_URL` to the deployed Worker URL so the app can reach the API from outside the Worker origin.

This repository now commits that production URL in `.env.production`, and the GitHub Pages workflow exports the same value during the build.

## Cloudflare Worker

Worker scaffold and D1 files live under [worker](worker).

Useful commands:

```bash
npm run worker:dev
npm run worker:d1:migrate:local
npm run worker:deploy
```

Before remote deploys, replace the placeholder `database_id` in [worker/wrangler.toml](worker/wrangler.toml) with your real D1 database ID.

Protected manual refresh route:

```bash
curl -X POST \
	-H "x-refresh-token: YOUR_ADMIN_REFRESH_TOKEN" \
	https://YOUR-WORKER-URL/api/admin/refresh
```

Set the token as a Wrangler secret before using the route:

```bash
printf '%s' 'YOUR_ADMIN_REFRESH_TOKEN' | npx wrangler secret put ADMIN_REFRESH_TOKEN --config worker/wrangler.toml
```

## Current Features

- Live quote polling for `^NSEI` and `^BSESN` through the deployed Cloudflare Worker API with client-side fallback
- 60-second refresh throttling
- Device-local resume/start-afresh entry flow
- Autosaved workspace with cached quotes and theme preference
- Backup export and import with validation, confirmation, and basic sanitization
- Installable PWA manifest and service worker
- Responsive dashboard and settings sheet

## Architecture

- [src/app.js](./src/app.js): app bootstrap, session flow, dashboard wiring
- [src/services/yahooFinance.js](./src/services/yahooFinance.js): quote fetch + parse
- [src/services/pollController.js](./src/services/pollController.js): polling and reconnect behavior
- [src/services/localStore.js](./src/services/localStore.js): IndexedDB and metadata persistence
- [src/services/importService.js](./src/services/importService.js): backup validation/import
- [src/screens](./src/screens): entry and dashboard views
- [src/components](./src/components): index card and settings sheet UI

## Capacitor

The web app is structured to be wrapped with Capacitor. If Capacitor dependencies are installed, the expected flow is:

```bash
npm run build
npm run cap:sync
npx cap open android
```

Android packaging also requires host tooling:

- Android SDK / Gradle support
- Java 21 for the current Capacitor Android toolchain

Debug APK build:

```bash
npm run android:debug
```

Unsigned release APK build:

```bash
cd android && ./gradlew assembleRelease
```

On this machine, web build and Capacitor sync work, but APK compilation is currently blocked by the installed JDK being Java 17 instead of Java 21.

For GitHub Pages project-site hosting, the repo now supports a configurable base path. The included workflow builds with `VITE_BASE_PATH` set to the repository name and deploys the `dist` directory to Pages.

## Verification

Current project verification commands:

- `npm test`
- `npm run build`

Linting and typechecking are not configured yet.
