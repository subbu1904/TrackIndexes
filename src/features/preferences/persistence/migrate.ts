import type { PersistedWorkspace, DisplayPreferences } from '../types';
import { CURRENT_WORKSPACE_VERSION } from '../types';
import { DEFAULT_INDEX_IDS } from '../../indexes/catalog/indexCatalog';

/**
 * Migrate a persisted workspace from any older version to the current version.
 * Per LoginFreePersist.md: maintain explicit migration functions.
 * Add new `if (ws.version === N)` blocks when CURRENT_WORKSPACE_VERSION increments.
 */
export function migrateWorkspace(raw: unknown): PersistedWorkspace {
  // Coerce to a mutable object for migration steps
  let ws = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;

  // ── v1 baseline ──────────────────────────────────────────────────────────
  // If version is missing, treat as v1 and apply defaults for any missing fields
  if (typeof ws.version !== 'number') {
    ws.version = 1;
  }

  // Future migration example:
  // if (ws.version === 1) {
  //   (ws.preferences as DisplayPreferences).newField = 'default';
  //   ws.version = 2;
  // }

  // Ensure preferences shape is valid
  const prefs = (typeof ws.preferences === 'object' && ws.preferences !== null
    ? ws.preferences
    : {}) as Partial<DisplayPreferences>;

  const validThemes = ['light', 'dark', 'system'] as const;

  const preferences: DisplayPreferences = {
    selectedIndexIds: Array.isArray(prefs.selectedIndexIds)
      ? (prefs.selectedIndexIds as string[])
      : DEFAULT_INDEX_IDS,
    theme: validThemes.includes(prefs.theme as never)
      ? (prefs.theme as DisplayPreferences['theme'])
      : 'dark',
  };

  return {
    version: CURRENT_WORKSPACE_VERSION,
    preferences,
    savedAt: typeof ws.savedAt === 'number' ? ws.savedAt : Date.now(),
  };
}

/**
 * Returns true if the given version number is supported (can be migrated to current).
 * Versions above CURRENT_WORKSPACE_VERSION were exported from a newer app build.
 */
export function isVersionSupported(version: number): boolean {
  return version >= 1 && version <= CURRENT_WORKSPACE_VERSION;
}
