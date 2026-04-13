// ─── Display Preferences ──────────────────────────────────────────────────────

export interface DisplayPreferences {
  selectedIndexIds: string[];
  theme?: 'light' | 'dark' | 'system';
}

// ─── Persisted Workspace ──────────────────────────────────────────────────────

/**
 * The full workspace state written to durable storage.
 * Per LoginFreePersist.md: this is user workspace state, NOT a security authority.
 */
export interface PersistedWorkspace {
  version: number;
  preferences: DisplayPreferences;
  savedAt: number; // Unix timestamp (ms)
}

// ─── Session Metadata ─────────────────────────────────────────────────────────

/**
 * Lightweight metadata stored in localStorage for fast resume detection.
 * Per LoginFreePersist.md: store a small metadata record in localStorage.
 */
export interface SessionMetadata {
  version: number;
  workspaceExists: boolean;
  lastSavedAt: number; // Unix timestamp (ms)
}

// ─── Export Format ────────────────────────────────────────────────────────────

/**
 * Versioned JSON export format for backup and cross-device transfer.
 * Per LoginFreePersist.md: use a versioned JSON file for export.
 */
export interface ExportedState {
  version: number;
  exportedAt: string; // ISO 8601
  app: 'trackindexes';
  workspace: PersistedWorkspace;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CURRENT_WORKSPACE_VERSION = 1;
export const METADATA_STORAGE_KEY = 'trackindexes_meta';
export const WORKSPACE_IDB_KEY = 'workspace';
