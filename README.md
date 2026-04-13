# TrackIndexes

A mobile-first, installable PWA for quick-glance tracking of major Indian market indexes. No login, no accounts — just your selected indexes, always available.

## Features

- **Quick-glance landing page** with live index cards (value, change, % change, timestamp)
- **Customizable index selection** — choose from a catalog of major Indian indexes
- **Login-free persistence** — preferences saved locally, with export/import for backup
- **PWA** — installable, offline-friendly, responsive
- **Graceful degradation** — stale-data indicators, offline banner, error states

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server (uses MockProvider — no proxy needed)
pnpm dev

# Build for production
pnpm build
```

## Configuration

Copy `.env.example` to `.env.local` and set `VITE_PROXY_URL` to your deployed Cloudflare Worker URL to enable live market data. Without it, the app runs on mock data.

```bash
cp .env.example .env.local
# Edit .env.local and set VITE_PROXY_URL
```

## Deploying the Proxy

The `proxy/worker.ts` is a Cloudflare Worker that proxies Yahoo Finance requests to bypass CORS restrictions.

```bash
npm install -g wrangler
wrangler login
wrangler deploy proxy/worker.ts
```

## Persistence Model

This app follows the `LoginFreePersist.md` design note:

- **Same-device resume**: Preferences are auto-saved to IndexedDB. On return, you are offered to Resume or Start Afresh.
- **Backup/restore**: Export your preferences as a JSON file and import them on any device.
- **No login required** for any feature.

## Supported Indexes

| Index | Symbol | Category |
|---|---|---|
| NIFTY 50 | ^NSEI | Broad Market |
| S&P BSE SENSEX | ^BSESN | Broad Market |
| NIFTY Next 50 | ^NSMIDCP | Broad Market |
| NIFTY Bank | ^NSEBANK | Sectoral |
| NIFTY IT | ^CNXIT | Sectoral |
| NIFTY FMCG | ^CNXFMCG | Sectoral |
| NIFTY Pharma | ^CNXPHARMA | Sectoral |
| NIFTY Auto | ^CNXAUTO | Sectoral |
| NIFTY Metal | ^CNXMETAL | Sectoral |
| NIFTY Realty | ^CNXREALTY | Sectoral |
| NIFTY Midcap 100 | ^NSEMDCP50 | Market Cap |
| NIFTY Smallcap 100 | ^CNXSC | Market Cap |

## Tech Stack

- **Vite + React + TypeScript** — fast, lightweight frontend
- **Zustand** — minimal state management
- **TanStack Query** — data fetching, caching, and retry logic
- **idb-keyval** — IndexedDB persistence
- **Tailwind CSS** — mobile-first styling
- **vite-plugin-pwa / Workbox** — PWA and service worker

## Data Freshness

Yahoo Finance provides **15-minute delayed data** for Indian indexes on its free endpoints. This is clearly indicated in the UI via the stale-data badge on each index card.
