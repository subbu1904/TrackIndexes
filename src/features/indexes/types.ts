// ─── Index Catalog ────────────────────────────────────────────────────────────

export interface IndexDefinition {
  id: string;
  /** Provider-specific ticker symbol, e.g. '^NSEI' */
  symbol: string;
  name: string;
  category?: string;
  /** Whether this index is shown by default on first launch */
  enabledByDefault?: boolean;
}

// ─── Data Freshness ───────────────────────────────────────────────────────────

/**
 * Explicit freshness states — do not collapse into a single generic "stale".
 * Per RevisedBuildPlan.md §H: distinguish offline, fetch failure, market closed, delayed.
 */
export type DataFreshness =
  | 'live'           // real-time or near-real-time
  | 'delayed'        // provider-acknowledged delay (e.g. 15 min Yahoo Finance)
  | 'market_closed'  // market is not trading; showing last close
  | 'offline_cached' // device is offline; showing last cached value
  | 'stale'          // fetch failed or cache is older than expected threshold
  | 'unknown';       // freshness cannot be determined

// ─── Market Data ──────────────────────────────────────────────────────────────

export interface IndexSnapshot {
  /** Corresponds to IndexDefinition.id */
  id: string;
  value: number;
  absoluteChange: number;
  percentageChange: number;
  /** Unix timestamp (ms) of the data point itself (from provider) */
  lastUpdated: number;
  /** Unix timestamp (ms) of when this snapshot was fetched by the app */
  fetchedAt: number;
  /** Identifier of the data source, e.g. 'yahoo_finance' or 'mock' */
  source: string;
  freshness: DataFreshness;
  currency?: string;
}

// ─── Provider Result ──────────────────────────────────────────────────────────

/**
 * A provider call may partially succeed: some indexes return data,
 * others fail. Both are surfaced so the UI can render per-card error states.
 */
export interface ProviderResult {
  snapshots: IndexSnapshot[];
  partialFailures?: Array<{
    id: string;
    reason: string;
  }>;
}
