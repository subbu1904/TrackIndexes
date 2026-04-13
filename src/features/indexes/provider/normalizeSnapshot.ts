import type { IndexSnapshot, DataFreshness } from '../types';

/**
 * Raw shape returned by the Yahoo Finance proxy endpoint.
 * This is the only place that knows about the upstream wire format.
 */
export interface RawYahooQuote {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  /** Unix timestamp in seconds */
  regularMarketTime: number;
  currency?: string;
  marketState?: 'REGULAR' | 'PRE' | 'POST' | 'PREPRE' | 'POSTPOST' | 'CLOSED';
}

/**
 * Normalize a raw Yahoo Finance quote into the app's IndexSnapshot shape.
 * Isolates the app from upstream format changes — only this file needs updating
 * if Yahoo Finance changes its response structure.
 */
export function normalizeYahooQuote(
  raw: RawYahooQuote,
  indexId: string,
  fetchedAt: number
): IndexSnapshot {
  const freshness = resolveFreshness(raw);

  return {
    id: indexId,
    value: raw.regularMarketPrice,
    absoluteChange: raw.regularMarketChange,
    percentageChange: raw.regularMarketChangePercent,
    lastUpdated: raw.regularMarketTime * 1000, // seconds → ms
    fetchedAt,
    source: 'yahoo_finance',
    freshness,
    currency: raw.currency ?? 'INR',
  };
}

function resolveFreshness(raw: RawYahooQuote): DataFreshness {
  if (!raw.marketState) return 'delayed';

  switch (raw.marketState) {
    case 'REGULAR':
      return 'delayed'; // Yahoo free tier is always 15-min delayed
    case 'CLOSED':
    case 'PREPRE':
    case 'POSTPOST':
      return 'market_closed';
    case 'PRE':
    case 'POST':
      return 'delayed';
    default:
      return 'unknown';
  }
}
