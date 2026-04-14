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

Build with a GitHub Pages base path override:

```bash
VITE_BASE_PATH=/TrackIndexes/ npm run build
```

Preview the built app:

```bash
npm run preview
```

## Current Features

- Live quote polling for `^NSEI` and `^BSESN` through Yahoo Finance via `corsproxy.io`
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
