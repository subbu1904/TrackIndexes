import { HybridDriver } from './storageDrivers/hybridDriver';
import { migrateWorkspace, isVersionSupported } from './migrate';
import type { PersistenceAdapter } from './persistenceAdapter';
import type { PersistedWorkspace, SessionMetadata, ExportedState } from '../types';
import {
  METADATA_STORAGE_KEY,
  CURRENT_WORKSPACE_VERSION,
  DEFAULT_ALERT_PREFERENCES,
} from '../types';
import { DEFAULT_INDEX_IDS } from '../../indexes/catalog/indexCatalog';

/**
 * The active persistence adapter for the app.
 * Per RevisedBuildPlan.md §B: expose one persistence interface;
 * allow the underlying implementation to be swapped without touching feature logic.
 */
export const persistenceAdapter: PersistenceAdapter = new HybridDriver();

// ─── Default Workspace ────────────────────────────────────────────────────────

export function createDefaultWorkspace(): PersistedWorkspace {
  return {
    version: CURRENT_WORKSPACE_VERSION,
    preferences: {
      selectedIndexIds: DEFAULT_INDEX_IDS,
      theme: 'dark',
      alerts: DEFAULT_ALERT_PREFERENCES,
    },
    savedAt: Date.now(),
  };
}

// ─── Session Metadata ─────────────────────────────────────────────────────────

export function readSessionMetadata(): SessionMetadata | null {
  try {
    const raw = localStorage.getItem(METADATA_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SessionMetadata;
  } catch {
    return null;
  }
}

// ─── Hydration ────────────────────────────────────────────────────────────────

/**
 * Load and migrate the persisted workspace.
 * Returns the migrated workspace, or null if nothing is saved or data is corrupt.
 * Per RevisedBuildPlan.md §G: validate at hydrate time; fall back safely to defaults.
 */
export async function hydrateAppState(): Promise<PersistedWorkspace | null> {
  try {
    const raw = await persistenceAdapter.load();
    if (!raw) return null;
    if (!isVersionSupported(raw.version)) return null;
    return migrateWorkspace(raw);
  } catch {
    return null;
  }
}

// ─── Save ─────────────────────────────────────────────────────────────────────

export async function saveAppState(workspace: PersistedWorkspace): Promise<void> {
  const updated: PersistedWorkspace = { ...workspace, savedAt: Date.now() };
  await persistenceAdapter.save(updated);
}

// ─── Clear ────────────────────────────────────────────────────────────────────

export async function clearPersistedState(): Promise<void> {
  await persistenceAdapter.clear();
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Serialize the current workspace to a downloadable JSON file.
 * Per LoginFreePersist.md: manually triggered, clearly named.
 */
export function exportPersistedState(workspace: PersistedWorkspace): void {
  const payload: ExportedState = {
    version: CURRENT_WORKSPACE_VERSION,
    exportedAt: new Date().toISOString(),
    app: 'trackindexes',
    workspace,
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

// ─── Import ───────────────────────────────────────────────────────────────────

/**
 * Parse and validate an imported JSON file, returning a migrated workspace.
 * Per LoginFreePersist.md: validate schema, check app identifier, run migrations.
 * Throws a descriptive error if the file is invalid or from an unsupported version.
 */
export function importPersistedState(raw: string): PersistedWorkspace {
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

  if (!isVersionSupported(data.version as number)) {
    throw new Error(
      `This file was exported from a newer version of TrackIndexes (v${data.version}). Please update the app.`
    );
  }

  if (typeof data.workspace !== 'object' || data.workspace === null) {
    throw new Error('The file is missing the workspace data.');
  }

  return migrateWorkspace(data.workspace);
}
