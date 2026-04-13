import type { IndexSnapshot } from '../types';
import { BaseIndexDataProvider } from './provider';

/** Seed data for simulating realistic index values. */
const MOCK_DATA: Record<string, { value: number; change: number; pct: number }> = {
  '^NSEI':      { value: 24050.60, change: 275.50,  pct: 1.16 },
  '^BSESN':     { value: 79218.05, change: 897.30,  pct: 1.15 },
  '^NSMIDCP':   { value: 12980.45, change: -45.20,  pct: -0.35 },
  '^NSEBANK':   { value: 51340.80, change: 620.10,  pct: 1.22 },
  '^CNXIT':     { value: 36890.25, change: -180.40, pct: -0.49 },
  '^CNXFMCG':   { value: 57120.30, change: 310.60,  pct: 0.55 },
  '^CNXPHARMA': { value: 22450.70, change: 120.90,  pct: 0.54 },
  '^CNXAUTO':   { value: 23180.55, change: -95.30,  pct: -0.41 },
  '^CNXMETAL':  { value: 9870.40,  change: 215.80,  pct: 2.24 },
  '^CNXREALTY': { value: 1045.20,  change: -12.50,  pct: -1.18 },
  '^NSEMDCP50': { value: 14230.60, change: 88.40,   pct: 0.62 },
  '^CNXSC':     { value: 17890.35, change: -55.70,  pct: -0.31 },
};

/**
 * MockProvider — returns deterministic fake data with a simulated network delay.
 * Used during development and as a fallback when the live provider is unavailable.
 */
export class MockProvider extends BaseIndexDataProvider {
  private readonly delayMs: number;
  private readonly failRate: number;

  constructor(options: { delayMs?: number; failRate?: number } = {}) {
    super();
    this.delayMs = options.delayMs ?? 600;
    this.failRate = options.failRate ?? 0; // 0–1 probability of simulated failure
  }

  async fetchSnapshot(symbol: string): Promise<IndexSnapshot> {
    await new Promise((res) => setTimeout(res, this.delayMs));

    if (Math.random() < this.failRate) {
      throw new Error(`[MockProvider] Simulated failure for ${symbol}`);
    }

    const seed = MOCK_DATA[symbol];
    if (!seed) {
      throw new Error(`[MockProvider] No mock data for symbol: ${symbol}`);
    }

    // Add a small random jitter to simulate live data movement
    const jitter = (Math.random() - 0.5) * seed.value * 0.002;

    return {
      id: symbol,
      value: parseFloat((seed.value + jitter).toFixed(2)),
      absoluteChange: parseFloat((seed.change + jitter).toFixed(2)),
      percentageChange: parseFloat((seed.pct + jitter * 0.01).toFixed(2)),
      lastUpdated: Date.now(),
    };
  }
}
