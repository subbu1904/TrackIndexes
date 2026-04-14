import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchMarketSnapshot,
  parseMarketDataResponse
} from "../src/services/marketDataService.js";

test("parseMarketDataResponse normalizes quotes and preserves freshness metadata", () => {
  const snapshot = parseMarketDataResponse(
    {
      success: true,
      data: [
        {
          symbol: "^NSEI",
          name: "NIFTY 50",
          price: 23842.65,
          change: -207.95,
          changePercent: -0.86,
          timestamp: "2026-04-14T09:15:00.000Z",
          source: "nse",
          isDelayed: false
        }
      ],
      meta: {
        fetchedAt: "2026-04-14T09:15:04.000Z",
        stale: false,
        ageSeconds: 4
      },
      error: null
    },
    { now: () => "2026-04-14T09:20:00.000Z" }
  );

  assert.equal(snapshot.lastUpdatedAt, "2026-04-14T09:15:04.000Z");
  assert.equal(snapshot.meta.stale, false);
  assert.equal(snapshot.meta.ageSeconds, 4);
  assert.equal(snapshot.quotes[0].statusLabel, "Live");
  assert.equal(snapshot.quotes[0].source, "nse");
});

test("parseMarketDataResponse marks stale cache results as delayed cached quotes", () => {
  const snapshot = parseMarketDataResponse(
    {
      success: true,
      data: [
        {
          symbol: "^BSESN",
          name: "SENSEX",
          price: 76847.57,
          change: -702.68,
          changePercent: -0.91,
          timestamp: "2026-04-14T09:15:00.000Z",
          source: "cache",
          isDelayed: true
        }
      ],
      meta: {
        fetchedAt: "2026-04-14T09:45:04.000Z",
        stale: true,
        ageSeconds: 1804
      },
      error: null
    },
    { now: () => "2026-04-14T09:50:00.000Z" }
  );

  assert.equal(snapshot.meta.stale, true);
  assert.equal(snapshot.quotes[0].isDelayed, true);
  assert.equal(snapshot.quotes[0].statusLabel, "Cached");
});

test("fetchMarketSnapshot loads normalized quotes from the API endpoint", async () => {
  const calls = [];

  const snapshot = await fetchMarketSnapshot({
    apiUrl: "https://example.com/api/quotes",
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return {
        ok: true,
        json: async () => ({
          success: true,
          data: [
            {
              symbol: "^NSEI",
              name: "NIFTY 50",
              price: 23842.65,
              change: -207.95,
              changePercent: -0.86,
              timestamp: "2026-04-14T09:15:00.000Z",
              source: "nse",
              isDelayed: false
            },
            {
              symbol: "^BSESN",
              name: "SENSEX",
              price: 76847.57,
              change: -702.68,
              changePercent: -0.91,
              timestamp: "2026-04-14T09:15:00.000Z",
              source: "bse",
              isDelayed: false
            }
          ],
          meta: {
            fetchedAt: "2026-04-14T09:15:04.000Z",
            stale: false,
            ageSeconds: 4
          },
          error: null
        })
      };
    }
  });

  assert.equal(calls[0].url, "https://example.com/api/quotes");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(snapshot.quotes.length, 2);
  assert.equal(snapshot.lastUpdatedAt, "2026-04-14T09:15:04.000Z");
});

test("fetchMarketSnapshot falls back to the legacy client fetch path when the API is unavailable", async () => {
  const snapshot = await fetchMarketSnapshot({
    symbols: ["^NSEI"],
    apiUrl: "https://example.com/api/quotes",
    fetchImpl: async () => {
      throw new TypeError("fetch failed");
    },
    fetchQuoteImpl: async (symbol) => ({
      symbol,
      name: "NIFTY 50",
      price: 23842.65,
      change: -207.95,
      changePercent: -0.86,
      timestamp: "2026-04-14T09:15:00.000Z",
      isDelayed: true
    })
  });

  assert.equal(snapshot.quotes.length, 1);
  assert.equal(snapshot.quotes[0].symbol, "^NSEI");
  assert.equal(snapshot.quotes[0].source, "legacy-client");
});