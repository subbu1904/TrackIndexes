# TrackIndexes MVP Build Plan

## A. Assumptions

1. **Login-Free Persistence is Authoritative**: The `LoginFreePersist.md` document is the single source of truth for state management. All user preferences (selected indexes, theme) and app state will be stored locally using a hybrid `localStorage` (for metadata) and `IndexedDB` (for workspace data) approach. There will be no backend authentication or user accounts.
2. **Data Freshness**: Since this is a quick-glance PWA, real-time tick data is not strictly required. Delayed data (e.g., 15 minutes) or data refreshed on a sensible interval (e.g., every 1-5 minutes) is acceptable and aligns with free public API constraints.
3. **Target Audience**: The app is primarily for personal use by a solo developer, emphasizing maintainability, simplicity, and low operational cost.
4. **Offline Capability**: The app shell and previously fetched data must be available offline, clearly marked with a stale-data indicator.

## B. Recommended Stack

- **Framework**: Vite + React + TypeScript. Vite provides a fast, lightweight, frontend-first build process without the server-side rendering overhead of Next.js, which is unnecessary since we have no backend logic and rely purely on client-side state.
- **State Management**: Zustand. It is lightweight, boilerplate-free, and integrates easily with local storage persistence.
- **Persistence Approach**: `idb-keyval` for IndexedDB (workspace data) combined with standard `localStorage` (metadata), directly implementing the `LoginFreePersist.md` specifications.
- **PWA Tooling**: `vite-plugin-pwa` for seamless manifest generation and service worker management (Workbox) to handle offline caching and stale-while-revalidate strategies.
- **Styling/UI Approach**: Tailwind CSS. It allows for rapid, responsive, mobile-first styling without external component library bloat.
- **Data Fetching Approach**: TanStack Query (React Query). It handles caching, retries, loading/error states, and stale-while-revalidate logic out of the box, perfectly suiting the requirement for graceful handling of intermittent connectivity and rate limits.

**Tradeoffs**: Using Vite instead of Next.js means we lose server-side API routes. If a CORS proxy is strictly necessary for the chosen data source, we will need a minimal external proxy (e.g., Cloudflare Worker) rather than hosting it within the Next.js app. However, this keeps the frontend purely static and deployable anywhere (GitHub Pages, Vercel, Netlify).

## C. App Architecture

**High-Level Module Architecture**:
1. **UI Layer**: React components (Landing Page, Index Cards, Settings Modal, Status Banners).
2. **State & Persistence Layer**: Zustand stores backed by IndexedDB/localStorage, managing user preferences and session resume logic.
3. **Data Provider Layer**: An abstraction interface (`IndexDataProvider`) that defines methods for fetching market data. Implementations of this interface (e.g., `YahooFinanceProvider`, `MockProvider`) handle the actual API calls.
4. **Caching Layer**: React Query wrapping the Data Provider Layer to manage request lifecycles.

**Data Flow**:
1. App loads -> Checks `localStorage` for metadata -> Hydrates Zustand store from `IndexedDB` -> Shows "Resume/Start Afresh" prompt if applicable.
2. User selects indexes -> Zustand state updates -> Persists to IndexedDB.
3. UI requests data for selected indexes -> React Query checks cache -> If stale/missing, calls `IndexDataProvider` -> Updates UI with loading/error/success states.

**Explicit Integration Points for `LoginFreePersist.md`**:
- **App Entry**: A dedicated `SessionResumeManager` component runs on mount to handle the "First visit" vs "Returning visit" logic and display the decision screen.
- **Save Lifecycle**: Zustand middleware will debounce state changes and write to IndexedDB, updating the `localStorage` metadata timestamp.
- **Settings/Export**: The settings UI will include the "Download backup", "Import state file", and "Start afresh" actions.

## D. Screens and Components

1. **Landing Page (`LandingPage`)**: The main view displaying the grid of selected index cards and a header with a settings button.
2. **Index Customization UI (`SettingsModal`)**: A modal or drawer to toggle which indexes are visible, and access export/import/reset features.
3. **Reusable Index Card (`IndexCard`)**: Displays index name, latest value, absolute/percentage change, timestamp, and direction indicator (green/red). Handles its own loading skeleton and error state.
4. **Status/Error Components (`GlobalErrorBoundary`, `DataErrorFallback`)**: Fallbacks for failed data fetches or unexpected app crashes.
5. **Stale-Data Indicator (`StaleBadge`)**: A small UI element on the `IndexCard` or header showing "Last updated: [time] (Offline/Stale)" when data is older than the expected refresh interval.
6. **Session Decision Screen (`ResumePrompt`)**: The overlay shown on return visits asking the user to Resume or Start Afresh.

## E. Data Model

```typescript
// Index Definition/Catalog Item
interface IndexDefinition {
  id: string;          // e.g., 'NIFTY_50'
  symbol: string;      // e.g., '^NSEI' (Yahoo Finance ticker)
  name: string;        // e.g., 'NIFTY 50'
  category: string;    // e.g., 'Broad Market'
}

// Latest Index Snapshot
interface IndexSnapshot {
  id: string;
  value: number;
  absoluteChange: number;
  percentageChange: number;
  lastUpdated: number; // Unix timestamp
  isStale: boolean;
}

// User Display Preferences & Workspace
interface WorkspaceState {
  selectedIndexes: string[]; // Array of Index IDs
  theme: 'light' | 'dark' | 'system';
}

// App Persistence Model (Export Format)
interface ExportedState {
  version: number;
  exportedAt: string; // ISO String
  app: string;        // 'trackindexes'
  workspace: WorkspaceState;
}

// Local Storage Metadata
interface SessionMetadata {
  workspaceExists: boolean;
  lastUpdated: number;
  version: number;
}
```

## F. Public Data Integration Strategy

**Candidate Sources**:
1. **Yahoo Finance API (Unofficial)**: Reliable, covers major Indian indexes (`^NSEI`, `^BSESN`). However, direct frontend calls face strict CORS blocks.
2. **NSE India API (Unofficial via npm packages like `stock-nse-india`)**: Highly accurate, but NSE actively blocks non-browser/automated requests and has strict CORS policies preventing direct frontend access.
3. **Marketstack / Alpha Vantage**: Free tiers exist but often have severe rate limits (e.g., 25 requests/day) or lack real-time/delayed Indian index coverage on free tiers.

**Recommended Source & Fallback**:
- **Primary**: Yahoo Finance API accessed via a **tiny proxy**.
- **Fallback**: Mock data provider for development and offline testing.

**Frontend-Only Feasibility & Proxy Requirement**:
A purely frontend-only approach is **not feasible** for reliable market data due to strict CORS policies enforced by Yahoo Finance and NSE. Attempting to bypass CORS on the frontend usually relies on public CORS proxies (like `cors-anywhere`), which are unreliable and often rate-limited or blocked.
**Conclusion**: A minimal proxy is necessary. We will use a lightweight Cloudflare Worker or Vercel Edge Function that simply accepts a ticker symbol, fetches from Yahoo Finance, adds CORS headers, and returns the JSON. This adds almost zero infrastructure overhead and remains solo-developer friendly.

## G. State and Persistence

- **Ephemeral State**: React Query cache (market data), UI toggle states (e.g., modal open/close).
- **Persisted State**: `WorkspaceState` (selected indexes, theme) stored in IndexedDB.
- **Startup Hydration**: On app load, check `localStorage` for `SessionMetadata`. If `workspaceExists` is true, pause rendering and show the `ResumePrompt`. If user selects "Resume", load `WorkspaceState` from IndexedDB into Zustand. If "Start afresh", clear IndexedDB and initialize defaults.
- **Consistency with `LoginFreePersist.md`**: The implementation will strictly follow the hybrid model: automatic local resume via IndexedDB, clear decision screen on return, and versioned JSON export/import for backup.

## H. PWA/Offline Plan

- **Manifest**: Standard `manifest.json` with name, icons, theme colors, and `display: standalone` for a native app feel.
- **Service Worker Strategy**: Use Workbox (via `vite-plugin-pwa`).
- **Cached Shell**: Precache all HTML, JS, CSS, and static assets (icons) using `CacheFirst` strategy.
- **Market Data Caching**: Cache API responses using `StaleWhileRevalidate` with a sensible expiration (e.g., 5 minutes) and a network timeout.
- **Connectivity Degradation**: If offline, React Query will fail to fetch, falling back to the cached data provided by the Service Worker. The UI will detect the offline state (via `navigator.onLine` or fetch failure) and display the `StaleBadge`.

## I. Edge Cases

- **First launch with no saved prefs**: Initialize with sensible defaults (e.g., NIFTY 50, SENSEX) and immediately save to local persistence.
- **Empty selected-index state**: Show a friendly empty state message on the landing page guiding the user to the settings to add indexes.
- **Source unavailable/CORS failure**: The `IndexCard` displays an error state with a retry button. The proxy should handle upstream errors gracefully.
- **Partial fetch success**: React Query handles requests per-index or in batches. If one index fails, only its card shows an error; others render normally.
- **Stale data**: If the API returns old data or the network is offline, display the `StaleBadge` based on the `lastUpdated` timestamp.
- **Offline launch**: The Service Worker serves the app shell. The app loads persisted preferences and attempts to fetch data. Fetch fails, falling back to cached data (if any), and shows offline banners.
- **Bad persisted data / Unsupported version**: The import validator or startup hydrator catches schema errors. It falls back to default state and alerts the user that the saved data was corrupted or outdated.
- **App version migration**: Implement a `migrateState` function (as defined in the design note) that runs during import or hydration to upgrade older JSON schemas to the current version.

## J. Folder Structure

```text
track-indexes/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── api/
│   │   ├── provider.ts        // Provider abstraction interface
│   │   ├── yahooProvider.ts   // Implementation using proxy
│   │   └── mockProvider.ts    // Fallback implementation
│   ├── components/
│   │   ├── IndexCard.tsx
│   │   ├── LandingPage.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── ResumePrompt.tsx
│   │   └── ui/              // Reusable generic UI elements (buttons, badges)
│   ├── hooks/
│   │   └── useMarketData.ts // React Query hooks
│   ├── store/
│   │   ├── useWorkspaceStore.ts // Zustand store
│   │   └── persistence.ts       // IndexedDB/localStorage logic, migrations
│   ├── types/
│   │   └── index.ts         // Data models and interfaces
│   ├── utils/
│   │   ├── catalog.ts       // Hardcoded index definitions
│   │   └── formatters.ts    // Number/date formatting
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

## K. Step-by-Step Implementation Plan

- **Phase 1: Scaffold & Shell**: Initialize Vite + React + TS + Tailwind. Set up folder structure and basic routing/layout.
- **Phase 2: Persistence Core**: Implement the `persistence.ts` layer and Zustand store based on `LoginFreePersist.md`. Build the `ResumePrompt` and Settings export/import UI.
- **Phase 3: Data Abstraction**: Define `IndexDataProvider` and create the `MockProvider` to build the UI without relying on a live API.
- **Phase 4: UI Construction**: Build the `LandingPage` and `IndexCard` components. Wire them up to the Zustand store and MockProvider.
- **Phase 5: Live Data Integration**: Deploy a simple Cloudflare Worker proxy. Implement `YahooFinanceProvider` and replace the mock provider. Integrate React Query for fetching and caching.
- **Phase 6: PWA & Polish**: Configure `vite-plugin-pwa`, test offline capabilities, add stale-data indicators, and refine error states.

## M. MVP-First Delivery Plan

- **What to build first**: The persistence layer, the app shell, and the UI using mock data. This ensures the core constraint (`LoginFreePersist.md`) is satisfied immediately.
- **What to defer**: The live API proxy and real data fetching. The PWA service worker configuration can also be added last.
- **What to mock initially**: All market data. The `MockProvider` will simulate network delays, errors, and realistic data structures.
