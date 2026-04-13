import type { IndexDataProvider } from './IndexDataProvider';
import type { ProviderResult } from '../types';
import { normalizeYahooQuote, type RawYahooQuote } from './normalizeSnapshot';
import { INDEX_CATALOG } from '../catalog/indexCatalog';

/**
 * YahooFinanceProvider — fetches data via a thin CORS proxy.
 *
 * WHY A PROXY IS REQUIRED:
 * Yahoo Finance does not serve CORS headers for browser-originated requests.
 * A minimal Cloudflare Worker (proxy/worker.ts) fetches server-side and
 * returns data with appropriate CORS headers. No business logic in the proxy.
 *
 * PROXY CONTRACT:
 *   GET /api/market-data?symbols=^NSEI,^BSESN
 *   Response: { quotes: RawYahooQuote[] }
 *
 * FRESHNESS:
 * Yahoo Finance provides 15-minute delayed data for Indian indexes.
 * This is surfaced via the `freshness` field on each IndexSnapshot.
 */
export class YahooFinanceProvider implements IndexDataProvider {
  private readonly proxyBaseUrl: string;

  constructor(proxyBaseUrl: string) {
    this.proxyBaseUrl = proxyBaseUrl.replace(/\/$/, '');
  }

  async getSnapshots(indexIds: string[]): Promise<ProviderResult> {
    const fetchedAt = Date.now();

    // Resolve index IDs to symbols; track any unknown IDs as partial failures
    const resolved: Array<{ id: string; symbol: string }> = [];
    const partialFailures: ProviderResult['partialFailures'] = [];

    for (const id of indexIds) {
      const def = INDEX_CATALOG.find((x) => x.id === id);
      if (!def) {
        partialFailures.push({ id, reason: `Unknown index id: ${id}` });
      } else {
        resolved.push({ id, symbol: def.symbol });
      }
    }

    if (resolved.length === 0) {
      return { snapshots: [], partialFailures };
    }

    const symbols = resolved.map((r) => r.symbol).join(',');
    const url = `${this.proxyBaseUrl}/api/market-data?symbols=${encodeURIComponent(symbols)}`;

    let rawQuotes: RawYahooQuote[];
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        // Treat entire batch as failed; UI shows error per card
        const reason = `Proxy HTTP ${response.status}`;
        return {
          snapshots: [],
          partialFailures: [
            ...partialFailures,
            ...resolved.map((r) => ({ id: r.id, reason })),
          ],
        };
      }

      const data = (await response.json()) as { quotes: RawYahooQuote[] };
      if (!Array.isArray(data.quotes)) {
        throw new Error('Malformed proxy response: missing quotes array');
      }
      rawQuotes = data.quotes;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return {
        snapshots: [],
        partialFailures: [
          ...partialFailures,
          ...resolved.map((r) => ({ id: r.id, reason })),
        ],
      };
    }

    // Normalize each raw quote; surface missing symbols as partial failures
    const snapshots = [];
    for (const { id, symbol } of resolved) {
      const raw = rawQuotes.find((q) => q.symbol === symbol);
      if (!raw) {
        partialFailures.push({ id, reason: `Symbol ${symbol} missing from proxy response` });
      } else {
        snapshots.push(normalizeYahooQuote(raw, id, fetchedAt));
      }
    }

    return {
      snapshots,
      ...(partialFailures.length > 0 ? { partialFailures } : {}),
    };
  }
}
