
## TrackIndexes MVP Build Plan v2

This version keeps the strong parts of the Manus plan, removes a few premature commitments, and makes `LoginFreePersist.md` the clear authority for no-login persistence behavior. It also treats the “Resume / Start Afresh” flow as optional rather than assumed. Based on the uploaded build plan, this is mainly a refinement, not a reset. 

---

## A. Assumptions

1. **`LoginFreePersist.md` is authoritative**

   * All decisions related to no-login behavior, persistence, startup hydration, session continuity, reset semantics, backup/import/export, and resume UX must come from `LoginFreePersist.md`.
   * This build plan provides architecture and implementation hooks, not replacement decisions.

2. **Personal-use MVP**

   * The app is for personal use only.
   * No authentication, no multi-user concerns, no server-side identity, no profile management.

3. **Public market data is sufficient**

   * The app only needs publicly available Indian index data.
   * Delayed data is acceptable if clearly labeled.

4. **Fast glance > trading terminal**

   * The goal is quick visibility of major Indian indexes, not tick-level trading precision or chart-heavy analytics.

5. **Resume prompt is optional**

   * Returning-user behavior may be:

     * silent restore
     * optional resume prompt
     * reset-first flow
   * The implementation must support whichever model `LoginFreePersist.md` specifies, without assuming one.

---

## B. Recommended Stack

### Core stack

* **Vite + React + TypeScript**

Why:

* best fit for a frontend-first, no-login, personal PWA
* fast local dev
* simple deployment
* no unnecessary server framework overhead

### State

* **Zustand** for app preferences and local durable UI state

Why:

* simple
* low boilerplate
* fits solo-dev projects well
* easy to connect to a persistence adapter

### Server-state / remote data

* **TanStack Query**

Why:

* handles fetch lifecycle, retries, cache invalidation, refetch timing, loading/error states
* keeps remote data separate from durable user preferences

### Styling

* **Tailwind CSS**

Why:

* fast for mobile-first UI
* lightweight mental model
* good for card/grid/status badge patterns

### PWA

* **vite-plugin-pwa**

Why:

* straightforward manifest + service worker setup
* enough for MVP
* good Workbox integration

### Persistence

* **Persistence adapter layer**
* Backing store determined by `LoginFreePersist.md`

Recommended implementation shape:

* expose one persistence interface
* allow underlying implementation to use:

  * localStorage only
  * IndexedDB only
  * hybrid localStorage + IndexedDB

Do **not** hardcode storage strategy into feature logic.

### Tradeoffs

* Vite keeps the app simple, but if your chosen data source requires a proxy, you will need a tiny external edge function or worker.
* That is still acceptable and much lighter than adopting a full backend stack.

---

## C. App Architecture

### High-level layers

1. **UI layer**

   * pages
   * cards
   * settings/customization
   * status banners
   * empty/error/offline states

2. **App state layer**

   * selected indexes
   * UI preferences
   * startup hydration state
   * optional resume-flow state

3. **Persistence layer**

   * reads/writes durable local state
   * performs schema validation and migrations
   * behavior controlled by `LoginFreePersist.md`

4. **Market data layer**

   * provider abstraction for public index data
   * one or more implementations
   * swappable without affecting UI code

5. **Remote cache layer**

   * TanStack Query wraps provider calls
   * handles retries, stale windows, background refresh

### Core principle

Keep these concerns separate:

* **durable user intent**: selected indexes, preferences
* **runtime remote state**: latest market snapshots
* **offline/cache state**: temporary last-known data

### Integration points for `LoginFreePersist.md`

Create explicit boundaries for:

* `persistenceAdapter`
* `hydrateAppState()`
* `clearPersistedState()`
* `exportPersistedState()`
* `importPersistedState()`
* `resolveStartupMode()`

That way, your design note can change behavior without forcing a rewrite of UI or data-fetch logic.

---

## D. Screens and Components

### 1. Landing page

Purpose:

* immediate view of selected indexes
* quick-glance experience
* primary app surface

Contains:

* app header
* index cards grid/list
* last refresh / market status summary
* settings/customize entry point
* offline or stale banner when needed

### 2. Customize / Settings UI

Purpose:

* choose which indexes are displayed
* optionally expose reset/import/export if required by `LoginFreePersist.md`

MVP controls:

* toggle visible indexes
* reorder later only if needed
* keep settings intentionally small

### 3. IndexCard

Displays:

* index name
* current value
* absolute move
* percentage move
* last updated time
* source/freshness badge
* loading / error / stale variant

### 4. Status components

* `OfflineBanner`
* `StaleDataBadge`
* `DataErrorState`
* `EmptySelectionState`

### 5. Optional startup continuity component

This should be optional:

* `ResumePrompt` or equivalent startup UX
* only rendered if required by `LoginFreePersist.md`

Do not make the whole architecture depend on this screen existing.

---

## E. Data Model

Use slightly richer types than v1.

```ts
export interface IndexDefinition {
  id: string
  symbol: string
  name: string
  category?: string
  enabledByDefault?: boolean
}

export type DataFreshness =
  | 'live'
  | 'delayed'
  | 'market_closed'
  | 'offline_cached'
  | 'stale'
  | 'unknown'

export interface IndexSnapshot {
  id: string
  value: number
  absoluteChange: number
  percentageChange: number
  lastUpdated: number
  fetchedAt: number
  source: string
  freshness: DataFreshness
  currency?: string
}

export interface DisplayPreferences {
  selectedIndexIds: string[]
  theme?: 'light' | 'dark' | 'system'
}

export interface PersistedWorkspace {
  version: number
  preferences: DisplayPreferences
  savedAt: number
}

export interface SessionMetadata {
  version: number
  workspaceExists: boolean
  lastSavedAt: number
}

export interface ProviderResult {
  snapshots: IndexSnapshot[]
  partialFailures?: Array<{
    id: string
    reason: string
  }>
}
```

### Why this is better than v1

* separates `lastUpdated` from `fetchedAt`
* makes freshness explicit instead of just `isStale`
* prepares for partial failures
* supports future provider swaps

---

## F. Public Data Integration Strategy

### Rule

Do **not** commit to a live provider until coverage is validated for your target indexes.

### Candidate sources

1. **Yahoo Finance via proxy**

   * likely easiest initial route
   * still unofficial
   * may be blocked, altered, or rate-limited
   * direct browser access usually has CORS issues

2. **NSE/BSE-facing unofficial sources**

   * may be more accurate for India
   * often fragile or anti-bot protected
   * often worse for frontend-only use

3. **Commercial/free-tier APIs**

   * may have poor India index coverage
   * may be too rate-limited for a good UX
   * may not justify complexity for this project

### Recommended strategy

#### Phase 0: provider validation

Before finalizing provider choice, validate the intended index set:

* NIFTY 50
* SENSEX
* NIFTY Bank
* NIFTY IT
* NIFTY Midcap
* NIFTY Smallcap

Check for each:

* symbol availability
* latest value availability
* abs/% change availability
* timestamp availability
* consistency over repeated requests

#### Initial live choice

* **Primary candidate**: Yahoo Finance via minimal proxy/worker
* **Fallback**: mock provider for development and offline testing

### Proxy requirement

Treat a tiny proxy as **likely required**, not guaranteed optional.

Why:

* CORS
* response normalization
* shielding the client from upstream format changes
* centralizing retry/backoff logic
* making provider swaps easier later

A tiny edge worker is enough. Do not build a real backend unless forced.

---

## G. State and Persistence

### Persisted state

Persist only durable user intent:

* selected indexes
* theme or display preferences if needed
* any continuity markers required by `LoginFreePersist.md`

### Non-persisted runtime state

Do not treat fetched market data as durable workspace state.

Keep these separate:

* durable preferences
* transient remote data
* optional last-known cache

### Startup hydration

Use a startup orchestration flow like:

1. initialize app shell
2. resolve persistence strategy
3. load persisted workspace
4. apply migrations if needed
5. determine startup UX from `LoginFreePersist.md`
6. render app with restored/default preferences
7. fetch market data

### Resume behavior

Support all three patterns, with actual choice deferred to the design note:

* silent resume
* optional prompt
* explicit reset path

Implementation should make this a configurable policy, not a baked-in UX.

---

## H. PWA / Offline Plan

### Manifest

Include:

* app name
* short name
* icons
* standalone display mode
* theme/background colors

### Service worker

Cache:

* app shell
* static assets
* optional last successful data responses

### Strategy

* **CacheFirst** for shell/assets
* **StaleWhileRevalidate** or short-lived network-first hybrid for market data
* keep it conservative to avoid showing old financial data as if current

### Offline behavior

When offline:

* app shell still loads
* persisted preferences still apply
* last known snapshots may render if available
* UI must clearly indicate offline/cached state

### Freshness semantics

Important distinction:

* stale because offline
* stale because fetch failed
* stale because market is closed
* delayed but acceptable

Do not collapse these into one generic badge.

---

## I. Edge Cases

1. **First launch**

   * load sensible defaults
   * no friction
   * initial selected indexes can be a small useful set like NIFTY 50 and SENSEX

2. **No selected indexes**

   * show a clean empty state
   * CTA to choose indexes

3. **Partial fetch success**

   * render successful cards
   * only failing indexes show error state

4. **Source unavailable**

   * show non-destructive retry path
   * do not block whole app

5. **Offline launch**

   * load shell and persisted preferences
   * render cached data if available
   * label clearly as offline/cached

6. **Bad persisted data**

   * validate at hydrate time
   * fall back safely to defaults
   * optionally surface a soft warning

7. **Schema/version migration**

   * migration function runs during hydration/import
   * invalid or unsupported versions fail safely

8. **Market closed**

   * use a “market closed / last close” style status, not a generic stale warning

9. **App updated**

   * preserve workspace if compatible
   * migrate if necessary
   * do not wipe preferences casually

10. **Provider drift**

* provider response shape changes upstream
* normalization layer should catch and isolate failure

---

## J. Folder Structure

```text
track-indexes/
├── public/
│   ├── icons/
│   └── manifest.json
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── providers.tsx
│   ├── features/
│   │   ├── indexes/
│   │   │   ├── components/
│   │   │   │   ├── IndexCard.tsx
│   │   │   │   ├── IndexGrid.tsx
│   │   │   │   └── EmptySelectionState.tsx
│   │   │   ├── catalog/
│   │   │   │   └── indexCatalog.ts
│   │   │   ├── hooks/
│   │   │   │   └── useIndexSnapshots.ts
│   │   │   ├── provider/
│   │   │   │   ├── IndexDataProvider.ts
│   │   │   │   ├── yahooProvider.ts
│   │   │   │   ├── mockProvider.ts
│   │   │   │   └── normalizeSnapshot.ts
│   │   │   └── types.ts
│   │   ├── preferences/
│   │   │   ├── components/
│   │   │   │   └── SettingsPanel.tsx
│   │   │   ├── store/
│   │   │   │   └── usePreferencesStore.ts
│   │   │   ├── persistence/
│   │   │   │   ├── persistenceAdapter.ts
│   │   │   │   ├── hydrate.ts
│   │   │   │   ├── migrate.ts
│   │   │   │   └── storageDrivers/
│   │   │   │       ├── localStorageDriver.ts
│   │   │   │       ├── indexedDbDriver.ts
│   │   │   │       └── hybridDriver.ts
│   │   │   └── types.ts
│   │   └── startup/
│   │       ├── StartupGate.tsx
│   │       ├── startupPolicy.ts
│   │       └── ResumePrompt.tsx
│   ├── shared/
│   │   ├── ui/
│   │   ├── lib/
│   │   │   ├── formatNumber.ts
│   │   │   ├── formatPercent.ts
│   │   │   └── formatTime.ts
│   │   └── types/
│   └── styles/
│       └── index.css
├── vite.config.ts
├── package.json
└── tsconfig.json
```

---

## K. Step-by-Step Implementation Plan

### Phase 1: Scaffold and core UI shell

* set up Vite + React + TypeScript + Tailwind
* create app shell
* create landing page skeleton
* add header and empty state

### Phase 2: Index catalog and mock provider

* define index catalog
* define provider interface
* implement mock provider
* render realistic cards with mock data

### Phase 3: Preferences and local selection flow

* create preferences store
* build settings UI for selecting displayed indexes
* persist user selection through the adapter boundary
* keep actual storage strategy aligned to `LoginFreePersist.md`

### Phase 4: Startup hydration and continuity

* implement hydrate/migrate flow
* add startup policy handling
* if needed, support optional `ResumePrompt`
* otherwise enable silent restore

### Phase 5: Live provider validation

* verify symbol coverage for target indexes
* implement normalization logic
* add minimal proxy if required
* integrate TanStack Query

### Phase 6: PWA and offline behavior

* add manifest and service worker
* cache shell assets
* support cached last-known market data
* add offline and freshness indicators

### Phase 7: Polish and hardening

* partial failure handling
* migration testing
* malformed persistence recovery
* improved empty/error/offline copy
* responsive refinements

---

## L. Starter Scaffold

Below is a minimal but realistic scaffold shape.

### `features/indexes/provider/IndexDataProvider.ts`

```ts
import type { ProviderResult } from '../types'

export interface IndexDataProvider {
  getSnapshots(indexIds: string[]): Promise<ProviderResult>
}
```

### `features/indexes/types.ts`

```ts
export interface IndexDefinition {
  id: string
  symbol: string
  name: string
  category?: string
  enabledByDefault?: boolean
}

export type DataFreshness =
  | 'live'
  | 'delayed'
  | 'market_closed'
  | 'offline_cached'
  | 'stale'
  | 'unknown'

export interface IndexSnapshot {
  id: string
  value: number
  absoluteChange: number
  percentageChange: number
  lastUpdated: number
  fetchedAt: number
  source: string
  freshness: DataFreshness
  currency?: string
}

export interface ProviderResult {
  snapshots: IndexSnapshot[]
  partialFailures?: Array<{
    id: string
    reason: string
  }>
}
```

### `features/indexes/catalog/indexCatalog.ts`

```ts
import type { IndexDefinition } from '../types'

export const INDEX_CATALOG: IndexDefinition[] = [
  { id: 'nifty50', symbol: '^NSEI', name: 'NIFTY 50', enabledByDefault: true },
  { id: 'sensex', symbol: '^BSESN', name: 'SENSEX', enabledByDefault: true },
  { id: 'niftybank', symbol: '^NSEBANK', name: 'NIFTY Bank' },
  { id: 'niftyit', symbol: 'NIFTY_IT_PLACEHOLDER', name: 'NIFTY IT' },
  { id: 'niftymidcap', symbol: 'NIFTY_MIDCAP_PLACEHOLDER', name: 'NIFTY Midcap' },
  { id: 'niftysmallcap', symbol: 'NIFTY_SMALLCAP_PLACEHOLDER', name: 'NIFTY Smallcap' },
]
```

### `features/indexes/provider/mockProvider.ts`

```ts
import type { IndexDataProvider } from './IndexDataProvider'
import type { ProviderResult } from '../types'

export class MockProvider implements IndexDataProvider {
  async getSnapshots(indexIds: string[]): Promise<ProviderResult> {
    const now = Date.now()

    return {
      snapshots: indexIds.map((id, idx) => ({
        id,
        value: 20000 + idx * 750,
        absoluteChange: idx % 2 === 0 ? 125.4 : -88.2,
        percentageChange: idx % 2 === 0 ? 0.63 : -0.41,
        lastUpdated: now - 60_000,
        fetchedAt: now,
        source: 'mock',
        freshness: 'delayed',
        currency: 'INR',
      })),
    }
  }
}
```

### `features/preferences/types.ts`

```ts
export interface DisplayPreferences {
  selectedIndexIds: string[]
  theme?: 'light' | 'dark' | 'system'
}

export interface PersistedWorkspace {
  version: number
  preferences: DisplayPreferences
  savedAt: number
}
```

### `features/preferences/persistence/persistenceAdapter.ts`

```ts
import type { PersistedWorkspace } from '../types'

export interface PersistenceAdapter {
  load(): Promise<PersistedWorkspace | null>
  save(workspace: PersistedWorkspace): Promise<void>
  clear(): Promise<void>
}
```

### `features/preferences/store/usePreferencesStore.ts`

```ts
import { create } from 'zustand'

interface PreferencesState {
  selectedIndexIds: string[]
  setSelectedIndexIds: (ids: string[]) => void
  toggleIndex: (id: string) => void
  hydrate: (ids: string[]) => void
}

export const usePreferencesStore = create<PreferencesState>((set, get) => ({
  selectedIndexIds: [],
  setSelectedIndexIds: (ids) => set({ selectedIndexIds: ids }),
  toggleIndex: (id) => {
    const current = get().selectedIndexIds
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id]

    set({ selectedIndexIds: next })
  },
  hydrate: (ids) => set({ selectedIndexIds: ids }),
}))
```

### `features/indexes/hooks/useIndexSnapshots.ts`

```ts
import { useQuery } from '@tanstack/react-query'
import type { IndexDataProvider } from '../provider/IndexDataProvider'

export function useIndexSnapshots(
  provider: IndexDataProvider,
  indexIds: string[],
) {
  return useQuery({
    queryKey: ['indexSnapshots', indexIds],
    queryFn: () => provider.getSnapshots(indexIds),
    enabled: indexIds.length > 0,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}
```

### `features/indexes/components/IndexCard.tsx`

```tsx
import type { IndexSnapshot } from '../types'

interface Props {
  name: string
  snapshot?: IndexSnapshot
  isLoading?: boolean
  isError?: boolean
}

export function IndexCard({ name, snapshot, isLoading, isError }: Props) {
  if (isLoading) {
    return <div className="rounded-2xl border p-4">Loading {name}...</div>
  }

  if (isError || !snapshot) {
    return <div className="rounded-2xl border p-4">Failed to load {name}</div>
  }

  const sign = snapshot.absoluteChange >= 0 ? '+' : ''

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="text-sm text-gray-500">{name}</div>
      <div className="mt-2 text-2xl font-semibold">{snapshot.value.toLocaleString('en-IN')}</div>
      <div className="mt-1 text-sm">
        {sign}{snapshot.absoluteChange.toFixed(2)} ({sign}{snapshot.percentageChange.toFixed(2)}%)
      </div>
      <div className="mt-2 text-xs text-gray-500">
        {snapshot.freshness} · source: {snapshot.source}
      </div>
    </div>
  )
}
```

### `app/App.tsx`

```tsx
import { INDEX_CATALOG } from '../features/indexes/catalog/indexCatalog'
import { MockProvider } from '../features/indexes/provider/mockProvider'
import { useIndexSnapshots } from '../features/indexes/hooks/useIndexSnapshots'
import { IndexCard } from '../features/indexes/components/IndexCard'
import { usePreferencesStore } from '../features/preferences/store/usePreferencesStore'

const provider = new MockProvider()

export default function App() {
  const selectedIndexIds = usePreferencesStore((s) => s.selectedIndexIds)

  const fallbackDefaultIds =
    selectedIndexIds.length > 0
      ? selectedIndexIds
      : INDEX_CATALOG.filter((x) => x.enabledByDefault).map((x) => x.id)

  const query = useIndexSnapshots(provider, fallbackDefaultIds)

  return (
    <main className="min-h-screen bg-white p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">TrackIndexes</h1>
        <button className="rounded-xl border px-3 py-2">Customize</button>
      </header>

      <section className="grid gap-3">
        {fallbackDefaultIds.map((id) => {
          const def = INDEX_CATALOG.find((x) => x.id === id)
          const snapshot = query.data?.snapshots.find((x) => x.id === id)

          if (!def) return null

          return (
            <IndexCard
              key={id}
              name={def.name}
              snapshot={snapshot}
              isLoading={query.isLoading}
              isError={query.isError}
            />
          )
        })}
      </section>
    </main>
  )
}
```

---

## M. MVP-First Delivery Plan

### Build first

1. landing page shell
2. catalog
3. mock provider
4. selection UI
5. persistence integration
6. startup hydration behavior
7. live provider
8. PWA polish

### Defer

* charts
* watchlists beyond the main selected set
* advanced theming
* reordering and grouping
* push notifications
* market-open smart banners beyond simple freshness states

### Mock first

Mock all market data until:

* symbol coverage is validated
* provider normalization is stable
* proxy need is confirmed

That keeps you from blocking on data-source fragility.

---

## Final recommendations

Here are the key changes from v1 that I strongly endorse:

* `LoginFreePersist.md` is now a real boundary, not just a note.
* “Resume prompt” is optional, not assumed.
* provider choice is validated before commitment.
* durable user state is separated from market runtime state.
* freshness is modeled more explicitly.
* MVP remains focused and buildable.

