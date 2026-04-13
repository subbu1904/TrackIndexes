import type { PersistenceAdapter } from '../persistenceAdapter';
import type { PersistedWorkspace } from '../../types';
import { METADATA_STORAGE_KEY, WORKSPACE_IDB_KEY } from '../../types';

/**
 * LocalStorageDriver — stores the full workspace in localStorage.
 * Simple and synchronous. Suitable when workspace data is small.
 * Not recommended for large state; use hybridDriver for that.
 */
export class LocalStorageDriver implements PersistenceAdapter {
  async load(): Promise<PersistedWorkspace | null> {
    try {
      const raw = localStorage.getItem(WORKSPACE_IDB_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as PersistedWorkspace;
    } catch {
      return null;
    }
  }

  async save(workspace: PersistedWorkspace): Promise<void> {
    localStorage.setItem(WORKSPACE_IDB_KEY, JSON.stringify(workspace));
    localStorage.setItem(
      METADATA_STORAGE_KEY,
      JSON.stringify({
        version: workspace.version,
        workspaceExists: true,
        lastSavedAt: workspace.savedAt,
      })
    );
  }

  async clear(): Promise<void> {
    localStorage.removeItem(WORKSPACE_IDB_KEY);
    localStorage.removeItem(METADATA_STORAGE_KEY);
  }
}
