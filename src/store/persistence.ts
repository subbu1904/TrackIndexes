/**
 * Persistence Layer — implements the LoginFreePersist.md hybrid model.
 *
 * Storage split (per LoginFreePersist.md):
 *   - localStorage: lightweight SessionMetadata for fast resume detection.
 *   - IndexedDB (via idb-keyval): full WorkspaceState for structured storage.
 *
 * Export format: versioned JSON (ExportedState) for backup and cross-device transfer.
 */

import { get, set, del } from 'idb-keyval';
import type {
  WorkspaceState,
  SessionMetadata,
  ExportedState,
} from '../types';
import {
  CURRENT_STATE_VERSION,
  METADATA_KEY,
  WORKSPACE_DB_KEY,
} from '../types';
import { DEFAULT_SELECTED_INDEXES } from '../utils/catalog';

// ─── Default State ────────────────────────────────────────────────────────────

export const DEFAULT_WORKSPACE: WorkspaceState = {
  selectedIndexes: DEFAULT_SELECTED_INDEXES,
  theme: 'dark',
};

// ─── Metadata (localStorage) ──────────────────────────────────────────────────

export function readMetadata(): SessionMetadata | null {
  try {
    const raw = localStorage.getItem(METADATA_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionMetadata;
  } catch {
    return null;
  }
}

export function writeMetadata(meta: SessionMetadata): void {
  localStorage.setItem(METADATA_KEY, JSON.stringify(meta));
}

export function clearMetadata(): void {
  localStorage.removeItem(METADATA_KEY);
}

// ─── Workspace (IndexedDB) ────────────────────────────────────────────────────

export async function loadWorkspace(): Promise<WorkspaceState | null> {
  try {
    const stored = await get<WorkspaceState>(WORKSPACE_DB_KEY);
    return stored ?? null;
  } catch {
    return null;
  }
}

export async function saveWorkspace(state: WorkspaceState): Promise<void> {
  await set(WORKSPACE_DB_KEY, state);
  writeMetadata({
    workspaceExists: true,
    lastUpdated: Date.now(),
    version: CURRENT_STATE_VERSION,
  });
}

export async function clearWorkspace(): Promise<void> {
  await del(WORKSPACE_DB_KEY);
  clearMetadata();
}

// ─── Migration ────────────────────────────────────────────────────────────────

/**
 * Migrate an older workspace state to the current version.
 * Add new migration steps here when CURRENT_STATE_VERSION increments.
 * Per LoginFreePersist.md: maintain explicit migration functions.
 */
export function migrateWorkspace(data: Partial<WorkspaceState> & { _version?: number }): WorkspaceState {
  let version = data._version ?? 1;

  // Example migration: v1 → v2 would go here
  // if (version === 1) { ... version = 2; }

  void version; // suppress unused variable warning until migrations are needed

  return {
    selectedIndexes: Array.isArray(data.selectedIndexes)
      ? data.selectedIndexes
      : DEFAULT_WORKSPACE.selectedIndexes,
    theme: (['light', 'dark', 'system'] as const).includes(data.theme as never)
      ? (data.theme as WorkspaceState['theme'])
      : DEFAULT_WORKSPACE.theme,
  };
}

// ─── Export / Import ──────────────────────────────────────────────────────────

/**
 * Serialize the current workspace to a downloadable JSON file.
 * Per LoginFreePersist.md: manually triggered, clearly named.
 */
export function exportWorkspace(state: WorkspaceState): void {
  const payload: ExportedState = {
    version: CURRENT_STATE_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'trackindexes',
    workspace: state,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().split('T')[0];
  const link = document.createElement('a');
  link.href = url;
  link.download = `trackindexes-backup-${date}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Parse and validate an imported JSON file.
 * Per LoginFreePersist.md: validate schema, check app identifier, run migrations.
 * Throws a descriptive error if the file is invalid.
 */
export function parseImportedFile(raw: string): WorkspaceState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('The file is not valid JSON.');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('The file does not contain a valid JSON object.');
  }

  const data = parsed as Record<string, unknown>;

  if (data.app !== 'trackindexes') {
    throw new Error('This file was not exported from TrackIndexes.');
  }

  if (typeof data.version !== 'number') {
    throw new Error('The file is missing a version field.');
  }

  if (data.version > CURRENT_STATE_VERSION) {
    throw new Error(
      `This file was exported from a newer version of TrackIndexes (v${data.version}). Please update the app.`
    );
  }

  if (typeof data.workspace !== 'object' || data.workspace === null) {
    throw new Error('The file is missing the workspace data.');
  }

  // Run migration to bring older schemas up to current version
  return migrateWorkspace({
    ...(data.workspace as Partial<WorkspaceState>),
    _version: data.version as number,
  });
}
