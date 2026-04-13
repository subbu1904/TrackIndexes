// ─── Index Catalog ────────────────────────────────────────────────────────────

/** A static definition of a trackable market index. */
export interface IndexDefinition {
  /** Unique stable identifier, e.g. 'NIFTY_50' */
  id: string;
  /** Ticker symbol used by the data provider, e.g. '^NSEI' */
  symbol: string;
  /** Human-readable display name, e.g. 'NIFTY 50' */
  name: string;
  /** Grouping category for display, e.g. 'Broad Market' */
  category: string;
}

// ─── Market Data ──────────────────────────────────────────────────────────────

/** A live or cached snapshot of an index value. */
export interface IndexSnapshot {
  /** Corresponds to IndexDefinition.id */
  id: string;
  /** Current index value */
  value: number;
  /** Absolute change from previous close */
  absoluteChange: number;
  /** Percentage change from previous close */
  percentageChange: number;
  /** Unix timestamp (ms) of when this data was fetched/valid */
  lastUpdated: number;
}

/** Per-index fetch lifecycle state. */
export type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ─── Persistence & Workspace ──────────────────────────────────────────────────

/**
 * The user's workspace state — what is persisted to IndexedDB.
 * Per LoginFreePersist.md: this is user workspace state, NOT a security authority.
 */
export interface WorkspaceState {
  /** IDs of indexes the user has chosen to display */
  selectedIndexes: string[];
  /** UI theme preference */
  theme: 'light' | 'dark' | 'system';
}

/**
 * Lightweight metadata stored in localStorage for fast resume detection.
 * Per LoginFreePersist.md: store a small metadata record in localStorage.
 */
export interface SessionMetadata {
  workspaceExists: boolean;
  lastUpdated: number; // Unix timestamp (ms)
  version: number;     // Schema version for migration
}

/**
 * Versioned JSON export format for backup and cross-device transfer.
 * Per LoginFreePersist.md: use a versioned JSON file for export.
 */
export interface ExportedState {
  version: number;
  exportedAt: string; // ISO 8601 string
  app: 'trackindexes';
  workspace: WorkspaceState;
}

// ─── App Constants ────────────────────────────────────────────────────────────

/** Current schema version. Increment when WorkspaceState shape changes. */
export const CURRENT_STATE_VERSION = 1;

/** Key used for localStorage metadata. */
export const METADATA_KEY = 'trackindexes_meta';

/** Key used for IndexedDB workspace storage. */
export const WORKSPACE_DB_KEY = 'workspace';
