import { Http } from '@capacitor-community/http';
import type { IndexDataProvider } from './IndexDataProvider';
import type { ProviderResult } from '../types';
import { normalizeYahooQuote, type RawYahooQuote } from './normalizeSnapshot';
import { INDEX_CATALOG } from '../catalog/indexCatalog';

/**
 * YahooFinanceProvider — fetches data directly from Yahoo Finance using the
 * Capacitor native HTTP plugin, which bypasses browser CORS restrictions
 * entirely because requests are issued at the Android/iOS native layer.
 *
 * No proxy or server infrastructure is required.
 *
 * UPSTREAM API:
 *   GET https://query1.finance.yahoo.com/v7/finance/quote?symbols=...&fields=...
 *   Response: { quoteResponse: { result: RawYahooQuote[] } }
 *
 * FRESHNESS:
 * Yahoo Finance provides 15-minute delayed data for Indian indexes.
 * This is surfaced via the `freshness` field on each IndexSnapshot.
 */

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com';
const FIELDS = 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime,currency,marketState';

export class YahooFinanceProvider implements IndexDataProvider {
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
    const url = `${YAHOO_BASE_URL}/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${FIELDS}`;

    let rawQuotes: RawYahooQuote[];
    try {
      const response = await Http.get({
        url,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TrackIndexes/1.0)',
          Accept: 'application/json',
        },
        connectTimeout: 10_000,
        readTimeout: 10_000,
      });

      if (response.status < 200 || response.status >= 300) {
        const reason = `Yahoo Finance HTTP ${response.status}`;
        return {
          snapshots: [],
          partialFailures: [
            ...partialFailures,
            ...resolved.map((r) => ({ id: r.id, reason })),
          ],
        };
      }

      const data = response.data as { quoteResponse: { result: RawYahooQuote[] } };
      if (!Array.isArray(data.quoteResponse?.result)) {
        throw new Error('Malformed Yahoo Finance response: missing quoteResponse.result array');
      }
      rawQuotes = data.quoteResponse.result;
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
        partialFailures.push({ id, reason: `Symbol ${symbol} missing from Yahoo Finance response` });
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
