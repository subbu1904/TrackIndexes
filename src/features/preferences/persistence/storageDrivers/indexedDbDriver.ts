import { get, set, del } from 'idb-keyval';
import type { PersistenceAdapter } from '../persistenceAdapter';
import type { PersistedWorkspace } from '../../types';
import { METADATA_STORAGE_KEY, WORKSPACE_IDB_KEY } from '../../types';

/**
 * IndexedDbDriver — stores the full workspace in IndexedDB.
 * Better for larger or structured state. Async by nature.
 */
export class IndexedDbDriver implements PersistenceAdapter {
  async load(): Promise<PersistedWorkspace | null> {
    try {
      const stored = await get<PersistedWorkspace>(WORKSPACE_IDB_KEY);
      return stored ?? null;
    } catch {
      return null;
    }
  }

  async save(workspace: PersistedWorkspace): Promise<void> {
    await set(WORKSPACE_IDB_KEY, workspace);
    // Keep lightweight metadata in localStorage for fast resume detection
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
    await del(WORKSPACE_IDB_KEY);
    localStorage.removeItem(METADATA_STORAGE_KEY);
  }
}
