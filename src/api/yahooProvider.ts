import type { IndexSnapshot } from '../types';
import { BaseIndexDataProvider } from './provider';

/**
 * Yahoo Finance response shape (simplified).
 * The proxy must return this structure at its endpoint.
 */
interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number; // Unix timestamp in seconds
}

/**
 * YahooFinanceProvider — fetches data via a thin proxy that adds CORS headers.
 *
 * WHY A PROXY IS REQUIRED:
 * Yahoo Finance (query1.finance.yahoo.com) does not serve CORS headers for
 * browser-originated requests. Direct frontend calls are blocked. A minimal
 * proxy (e.g., Cloudflare Worker) fetches the data server-side and returns it
 * with appropriate CORS headers. The proxy adds no business logic.
 *
 * PROXY CONTRACT:
 *   GET /api/market-data?symbols=^NSEI,^BSESN
 *   Response: { quotes: YahooQuoteResult[] }
 *
 * FRESHNESS:
 * Yahoo Finance provides 15-minute delayed data for Indian indexes on its free
 * endpoints. This is clearly communicated to users via the stale-data indicator.
 *
 * RATE LIMITS:
 * The proxy should implement basic rate limiting to avoid abuse. For personal
 * use, the default Yahoo Finance rate limits are unlikely to be hit.
 */
export class YahooFinanceProvider extends BaseIndexDataProvider {
  private readonly proxyBaseUrl: string;

  constructor(proxyBaseUrl: string) {
    super();
    // e.g. 'https://your-worker.your-subdomain.workers.dev'
    this.proxyBaseUrl = proxyBaseUrl.replace(/\/$/, '');
  }

  async fetchSnapshot(symbol: string): Promise<IndexSnapshot> {
    const snapshots = await this.fetchSnapshots([symbol]);
    const result = snapshots[0];
    if (!result) throw new Error(`No data returned for symbol: ${symbol}`);
    return result;
  }

  async fetchSnapshots(symbols: string[]): Promise<IndexSnapshot[]> {
    const encoded = symbols.map(encodeURIComponent).join(',');
    const url = `${this.proxyBaseUrl}/api/market-data?symbols=${encoded}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000), // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Proxy returned HTTP ${response.status} for symbols: ${symbols.join(', ')}`);
    }

    const data = (await response.json()) as { quotes: YahooQuoteResult[] };

    if (!Array.isArray(data.quotes)) {
      throw new Error('Malformed response from proxy: missing quotes array');
    }

    return data.quotes.map((quote) => ({
      id: quote.symbol,
      value: quote.regularMarketPrice,
      absoluteChange: quote.regularMarketChange,
      percentageChange: quote.regularMarketChangePercent,
      // Yahoo returns seconds; convert to milliseconds
      lastUpdated: quote.regularMarketTime * 1000,
    }));
  }
}
