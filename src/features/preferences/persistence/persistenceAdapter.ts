import type { PersistedWorkspace } from '../types';

/**
 * PersistenceAdapter — the single boundary between app logic and storage.
 * Per RevisedBuildPlan.md §C: create an explicit `persistenceAdapter` boundary
 * so LoginFreePersist.md can change storage behavior without forcing a UI rewrite.
 *
 * Concrete implementations live in storageDrivers/.
 * The active driver is selected in hydrate.ts based on environment/config.
 */
export interface PersistenceAdapter {
  /** Load the persisted workspace. Returns null if nothing is saved. */
  load(): Promise<PersistedWorkspace | null>;
  /** Persist the workspace. Also updates session metadata. */
  save(workspace: PersistedWorkspace): Promise<void>;
  /** Clear all persisted state including metadata. */
  clear(): Promise<void>;
}
