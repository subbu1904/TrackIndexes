import type { ProviderResult } from '../types';

/**
 * Abstract contract for all market data providers.
 * Swap implementations without touching any UI or state code.
 *
 * The method signature accepts index IDs (not raw symbols) so that
 * the provider implementation is responsible for symbol resolution,
 * keeping that concern out of the UI layer.
 */
export interface IndexDataProvider {
  /**
   * Fetch the latest snapshots for the given index IDs.
   * Must never throw — partial failures are returned inside ProviderResult.
   */
  getSnapshots(indexIds: string[]): Promise<ProviderResult>;
}
