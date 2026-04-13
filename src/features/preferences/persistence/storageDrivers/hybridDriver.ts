/**
 * HybridDriver — the recommended driver per LoginFreePersist.md.
 *
 * Per LoginFreePersist.md §Storage strategy:
 *   - store the full workspace in IndexedDB
 *   - store a small metadata record in localStorage for fast detection of resumable state
 *
 * This driver delegates to IndexedDbDriver for workspace I/O while
 * keeping localStorage metadata in sync.
 */
export { IndexedDbDriver as HybridDriver } from './indexedDbDriver';
