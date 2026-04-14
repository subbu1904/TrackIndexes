/**
 * Cloudflare Worker — Minimal Yahoo Finance CORS Proxy (OPTIONAL)
 *
 * NOTE: This worker is no longer required for the Android/iOS app.
 * The app now uses @capacitor-community/http which makes native HTTP requests
 * that bypass CORS entirely, so no proxy is needed.
 *
 * This file is kept for reference in case a web/PWA version of the app is
 * built in the future and a browser-safe CORS proxy is needed.
 *
 * DEPLOY (if needed for a web build):
 *   1. Install Wrangler: npm install -g wrangler
 *   2. wrangler login
 *   3. wrangler deploy proxy/worker.ts
 *
 * ENDPOINT:
 *   GET /api/market-data?symbols=^NSEI,^BSESN
 *
 * RESPONSE:
 *   { quotes: YahooQuoteResult[] }
 */

interface YahooQuoteResult {
  symbol: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketTime: number;
}

const ALLOWED_ORIGIN = '*'; // Restrict to your domain in production, e.g. 'https://trackindexes.pages.dev'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname !== '/api/market-data') {
      return new Response('Not found', { status: 404, headers: CORS_HEADERS });
    }

    const symbolsParam = url.searchParams.get('symbols');
    if (!symbolsParam) {
      return new Response(
        JSON.stringify({ error: 'Missing symbols parameter' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const symbols = symbolsParam.split(',').map((s) => s.trim()).filter(Boolean);
    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid symbols provided' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const fields = 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime';
    const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=${fields}`;

    try {
      const yahooResponse = await fetch(yahooUrl, {
        headers: {
          // Mimic a browser request to avoid bot detection
          'User-Agent': 'Mozilla/5.0 (compatible; TrackIndexes/1.0)',
          Accept: 'application/json',
        },
      });

      if (!yahooResponse.ok) {
        return new Response(
          JSON.stringify({ error: `Upstream error: HTTP ${yahooResponse.status}` }),
          { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      const data = await yahooResponse.json() as {
        quoteResponse: { result: YahooQuoteResult[] };
      };

      const quotes = (data.quoteResponse?.result ?? []).map((q) => ({
        symbol: q.symbol,
        regularMarketPrice: q.regularMarketPrice,
        regularMarketChange: q.regularMarketChange,
        regularMarketChangePercent: q.regularMarketChangePercent,
        regularMarketTime: q.regularMarketTime,
      }));

      return new Response(JSON.stringify({ quotes }), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          // Cache at the CDN edge for 60 seconds to reduce upstream calls
          'Cache-Control': 'public, max-age=60',
        },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from upstream', detail: String(err) }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
  },
};
