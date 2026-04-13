import type { IndexSnapshot } from '../types';

/**
 * Abstract interface for all market data providers.
 * Swap implementations without touching any UI or state code.
 */
export interface IndexDataProvider {
  /**
   * Fetch the latest snapshot for a single index.
   * @param symbol - The provider-specific ticker symbol (e.g. '^NSEI')
   * @returns A resolved IndexSnapshot or throws on failure.
   */
  fetchSnapshot(symbol: string): Promise<IndexSnapshot>;

  /**
   * Fetch snapshots for multiple indexes in one call (if provider supports batching).
   * Falls back to sequential fetchSnapshot calls if not overridden.
   */
  fetchSnapshots(symbols: string[]): Promise<IndexSnapshot[]>;
}

/**
 * Base class providing a default sequential implementation of fetchSnapshots.
 * Concrete providers extend this and override fetchSnapshot (and optionally fetchSnapshots).
 */
export abstract class BaseIndexDataProvider implements IndexDataProvider {
  abstract fetchSnapshot(symbol: string): Promise<IndexSnapshot>;

  async fetchSnapshots(symbols: string[]): Promise<IndexSnapshot[]> {
    return Promise.all(symbols.map((s) => this.fetchSnapshot(s)));
  }
}
