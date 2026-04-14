# Future Direction: Reliable Market Data via Cloudflare

## Goal

Replace fragile client-side quote fetching with a small Cloudflare-backed cache layer.

Current state:
- The app fetches NIFTY 50 and SENSEX from third-party endpoints in the client.
- Yahoo Finance and free proxy access are unstable.
- Failures surface directly in the UI and break the main dashboard experience.

Target state:
- A scheduled Cloudflare Worker fetches quotes server-side.
- Quotes are normalized and cached in D1.
- The app reads only from a stable Worker API.
- If live fetches fail, the API can still return the last known good values with a stale indicator.

This is the right production direction for this repo because the app is a Vite PWA wrapped with Capacitor, and it needs a reliable read API that works in both browsers and Android WebView.

---

## Proposed Architecture

```text
TrackIndexes app
    -> Cloudflare Worker read API
    -> D1 cached quotes

Cloudflare Cron Worker
    -> upstream market sources
    -> normalize quote data
    -> write latest quote snapshot to D1
```

Read path:
- The app calls `GET /api/quotes`.
- The Worker reads the latest cached quote snapshot from D1.
- The Worker returns normalized quote objects plus freshness metadata.

Write path:
- A scheduled Worker runs every minute during market hours.
- It fetches upstream data server-side.
- It validates and normalizes the payload.
- It stores the latest successful quote set in D1.

---

## Why This Strategy

This changes the failure mode from:
- every user session depends on third-party availability

to:
- one controlled server-side fetch path populates a cache
- the app reads from cached data even if upstream is temporarily down

Benefits:
- Better reliability on Android and the web
- No CORS dependence in the app
- Fewer third-party requests
- Consistent payload shape for the UI
- Easier monitoring and debugging
- Ability to serve stale-but-usable market data instead of blank cards

---

## Upstream Source Strategy

Do not rely on a single market source.

### Primary Principle

The Worker should use a fallback chain and persist the first valid normalized result.

### Recommended Fallback Chain

For `NIFTY 50`:
1. NSE direct source
2. Yahoo Finance direct
3. Last known cached quote

For `SENSEX`:
1. BSE direct source
2. Yahoo Finance direct
3. Last known cached quote

### Rules

- Yahoo should be a fallback, not the primary source.
- Free public proxies should not be part of the production design.
- If all live sources fail, keep serving the last good cached snapshot.
- Mark stale responses explicitly in the API so the UI can show a stale badge.

---

## API Contract

The app should stop parsing provider-specific payloads. It should only consume this normalized response.

### `GET /api/quotes`

Success response:

```json
{
    "success": true,
    "data": [
        {
            "symbol": "^NSEI",
            "name": "NIFTY 50",
            "price": 23842.65,
            "change": -207.95,
            "changePercent": -0.86,
            "timestamp": "2026-04-14T09:15:00.000Z",
            "source": "nse",
            "isDelayed": false
        },
        {
            "symbol": "^BSESN",
            "name": "SENSEX",
            "price": 76847.57,
            "change": -702.68,
            "changePercent": -0.91,
            "timestamp": "2026-04-14T09:15:00.000Z",
            "source": "bse",
            "isDelayed": false
        }
    ],
    "meta": {
        "fetchedAt": "2026-04-14T09:15:04.000Z",
        "stale": false,
        "ageSeconds": 4
    },
    "error": null
}
```

Stale-cache response:

```json
{
    "success": true,
    "data": [
        {
            "symbol": "^NSEI",
            "name": "NIFTY 50",
            "price": 23842.65,
            "change": -207.95,
            "changePercent": -0.86,
            "timestamp": "2026-04-14T09:15:00.000Z",
            "source": "cache",
            "isDelayed": true
        }
    ],
    "meta": {
        "fetchedAt": "2026-04-14T09:45:04.000Z",
        "stale": true,
        "ageSeconds": 1804
    },
    "error": null
}
```

Hard failure response:

```json
{
    "success": false,
    "data": null,
    "meta": {
        "stale": true
    },
    "error": "No market data is currently available."
}
```

---

## D1 Schema

Keep the schema simple.

### Table: `quote_snapshots`

Suggested columns:
- `snapshot_key TEXT PRIMARY KEY`
- `payload_json TEXT NOT NULL`
- `fetched_at TEXT NOT NULL`
- `source_summary TEXT NOT NULL`
- `is_stale INTEGER NOT NULL DEFAULT 0`

Recommended usage:
- Store the latest full two-index payload under `snapshot_key = 'latest'`.
- Optionally keep a small history table later if trend inspection becomes useful.

Example stored payload:

```json
[
    {
        "symbol": "^NSEI",
        "name": "NIFTY 50",
        "price": 23842.65,
        "change": -207.95,
        "changePercent": -0.86,
        "timestamp": "2026-04-14T09:15:00.000Z",
        "source": "nse",
        "isDelayed": false
    },
    {
        "symbol": "^BSESN",
        "name": "SENSEX",
        "price": 76847.57,
        "change": -702.68,
        "changePercent": -0.91,
        "timestamp": "2026-04-14T09:15:00.000Z",
        "source": "bse",
        "isDelayed": false
    }
]
```

---

## Worker Responsibilities

### Read Worker

Responsibilities:
- Expose `GET /api/quotes`
- Read latest snapshot from D1
- Compute freshness metadata
- Return normalized JSON with cache headers

Suggested cache headers:
- `Cache-Control: public, max-age=15, stale-while-revalidate=45`

### Scheduled Worker

Responsibilities:
- Run on a 1-minute schedule during market hours
- Fetch both indices using upstream fallback rules
- Normalize quotes into one common shape
- Replace the latest D1 snapshot atomically
- Log which source succeeded for each index

---

## Market-Hours Rules

The scheduler should follow Indian market hours, not UTC defaults.

Rules:
- Timezone: `Asia/Kolkata`
- Market window: weekdays, approximately `09:15` to `15:30 IST`
- Outside market hours, the scheduler may skip live fetches or reduce frequency
- Weekends should not trigger live polling

Nice-to-have later:
- Holiday calendar support
- Reduced cadence after close for final settlement confirmation

---

## Freshness Policy

Define freshness explicitly so the app can present the right state.

Suggested policy:
- `fresh`: snapshot age <= 120 seconds
- `aging`: snapshot age > 120 seconds and <= 900 seconds
- `stale`: snapshot age > 900 seconds
- `expired`: snapshot age > 1 trading day

UI mapping:
- `fresh`: normal status
- `aging`: show "Updated a few minutes ago"
- `stale`: show stale badge and keep data visible
- `expired`: show warning state with retry guidance

---

## App Changes Required

The app side should be simplified once the Worker API exists.

### Replace

- Remove provider-specific parsing from the client.
- Remove direct Yahoo fetches from the app's primary path.
- Remove dependency on free public CORS relays.

### Add

- One `marketDataService.js` that calls `/api/quotes`
- A small mapper that validates the normalized API response
- UI support for `stale` and `source` metadata
- Better status strings such as:
    - `Updated 10:42 AM`
    - `Updated 10:42 AM · Cached`
    - `Live source unavailable, showing last saved market data`

---

## Suggested Cloudflare Layout

Suggested project pieces:
- `worker/src/index.ts` or `worker/src/index.js` for the read API
- `worker/src/scheduled.ts` for cron handling
- `worker/src/providers/nse.ts`
- `worker/src/providers/bse.ts`
- `worker/src/providers/yahoo.ts`
- `worker/src/normalize.ts`
- `worker/src/d1.ts`
- `worker/wrangler.toml`

Environment bindings:
- `DB` for D1

Optional later:
- KV for edge-cached response copies
- Analytics/log drain for fetch failure monitoring

---

## Rollout Plan

### Phase 1

Build the Worker and D1 layer first.

Deliverables:
- `GET /api/quotes`
- D1 schema
- scheduled quote updater
- upstream fallback chain
- basic stale-data behavior

### Phase 2

Switch the app to the Worker API.

Deliverables:
- replace direct client market fetches
- keep the same dashboard UI
- show stale/fresh states clearly

### Phase 3

Remove old market-source code from the app.

Deliverables:
- delete proxy-based Yahoo path from client
- update README and deployment docs
- add monitoring notes

---

## Risks

### Upstream Site Changes

NSE, BSE, and Yahoo can all change response formats.

Mitigation:
- keep provider adapters isolated
- normalize at the Worker boundary
- keep cached fallback available

### Source Blocking

One provider may intermittently block automated requests.

Mitigation:
- use per-index fallback chains
- serve stale cache instead of failing closed

### Schedule Gaps

Cron execution may fail or be delayed.

Mitigation:
- compute freshness in the read API
- expose stale metadata to the app

---

## Recommendation

This should be the next major architecture step if the app is intended to be dependable on real devices.

Summary:
- Keep the client thin.
- Move market-source logic to Cloudflare Workers.
- Cache normalized quotes in D1.
- Serve stale data when live fetches fail.
- Treat Yahoo as fallback only.

This is the right replacement for the current zero-backend quote strategy.

