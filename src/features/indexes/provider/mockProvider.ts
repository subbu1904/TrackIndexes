import type { IndexDataProvider } from './IndexDataProvider';
import type { ProviderResult, IndexSnapshot } from '../types';
import { INDEX_CATALOG } from '../catalog/indexCatalog';

/** Seed values keyed by index ID for deterministic mock data. */
const MOCK_SEEDS: Record<string, { value: number; change: number; pct: number }> = {
  nifty50:       { value: 24050.60, change: 275.50,  pct: 1.16 },
  sensex:        { value: 79218.05, change: 897.30,  pct: 1.15 },
  niftynext50:   { value: 12980.45, change: -45.20,  pct: -0.35 },
  niftybank:     { value: 51340.80, change: 620.10,  pct: 1.22 },
  niftyit:       { value: 36890.25, change: -180.40, pct: -0.49 },
  niftyfmcg:     { value: 57120.30, change: 310.60,  pct: 0.55 },
  niftypharma:   { value: 22450.70, change: 120.90,  pct: 0.54 },
  niftyauto:     { value: 23180.55, change: -95.30,  pct: -0.41 },
  niftymetal:    { value: 9870.40,  change: 215.80,  pct: 2.24 },
  niftyrealty:   { value: 1045.20,  change: -12.50,  pct: -1.18 },
  niftymidcap:   { value: 14230.60, change: 88.40,   pct: 0.62 },
  niftysmallcap: { value: 17890.35, change: -55.70,  pct: -0.31 },
};

/**
 * MockProvider — returns deterministic fake data with a simulated network delay.
 * Used during development and as a fallback when the live provider is unavailable.
 * Implements the revised `IndexDataProvider` interface (getSnapshots).
 */
export class MockProvider implements IndexDataProvider {
  private readonly delayMs: number;
  private readonly failRate: number;

  constructor(options: { delayMs?: number; failRate?: number } = {}) {
    this.delayMs = options.delayMs ?? 700;
    this.failRate = options.failRate ?? 0;
  }

  async getSnapshots(indexIds: string[]): Promise<ProviderResult> {
    await new Promise((res) => setTimeout(res, this.delayMs));

    const now = Date.now();
    const snapshots: IndexSnapshot[] = [];
    const partialFailures: ProviderResult['partialFailures'] = [];

    for (const id of indexIds) {
      if (Math.random() < this.failRate) {
        partialFailures.push({ id, reason: '[MockProvider] Simulated failure' });
        continue;
      }

      const seed = MOCK_SEEDS[id];
      if (!seed) {
        // Unknown ID: look up catalog to see if it's a valid but unmapped index
        const def = INDEX_CATALOG.find((x) => x.id === id);
        if (!def) {
          partialFailures.push({ id, reason: `[MockProvider] Unknown index id: ${id}` });
          continue;
        }
        // Provide a generic placeholder for catalog entries without seed data
        snapshots.push({
          id,
          value: 10000,
          absoluteChange: 0,
          percentageChange: 0,
          lastUpdated: now - 60_000,
          fetchedAt: now,
          source: 'mock',
          freshness: 'delayed',
          currency: 'INR',
        });
        continue;
      }

      // Small random jitter to simulate live data movement
      const jitter = (Math.random() - 0.5) * seed.value * 0.002;

      snapshots.push({
        id,
        value: parseFloat((seed.value + jitter).toFixed(2)),
        absoluteChange: parseFloat((seed.change + jitter).toFixed(2)),
        percentageChange: parseFloat((seed.pct + jitter * 0.01).toFixed(2)),
        lastUpdated: now - 60_000,
        fetchedAt: now,
        source: 'mock',
        freshness: 'delayed',
        currency: 'INR',
      });
    }

    return {
      snapshots,
      ...(partialFailures.length > 0 ? { partialFailures } : {}),
    };
  }
}
