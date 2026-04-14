import test from "node:test";
import assert from "node:assert/strict";

import worker, { buildQuotesApiPayload } from "../worker/src/index.js";
import { refreshLatestQuoteSnapshot } from "../worker/src/scheduled.js";

function createDbStub(record) {
  let latestRecord = record;

  return {
    prepare() {
      return {
        bind(...args) {
          return {
            async first() {
              return latestRecord;
            },
            async run() {
              latestRecord = {
                snapshot_key: args[0],
                payload_json: args[1],
                fetched_at: args[2],
                source_summary: args[3],
                is_stale: args[4]
              };
              return { success: true };
            }
          };
        }
      };
    }
  };
}

test("buildQuotesApiPayload returns a stale error payload when no snapshot exists", () => {
  assert.deepEqual(buildQuotesApiPayload(null), {
    success: false,
    data: null,
    meta: {
      stale: true
    },
    error: "No market data is currently available."
  });
});

test("GET /api/quotes returns the cached snapshot from D1", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/quotes"),
    {
      DB: createDbStub({
        snapshot_key: "latest",
        payload_json: JSON.stringify([
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
        ]),
        fetched_at: "2026-04-14T09:15:04.000Z",
        source_summary: "^NSEI:nse",
        is_stale: 0
      })
    },
    {
      waitUntil() {}
    }
  );

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "public, max-age=15, stale-while-revalidate=45");

  const payload = await response.json();
  assert.equal(payload.success, true);
  assert.equal(payload.data[0].symbol, "^NSEI");
  assert.equal(payload.meta.fetchedAt, "2026-04-14T09:15:04.000Z");
});

test("GET /api/quotes returns 503 when D1 has no cached snapshot", async () => {
  const response = await worker.fetch(
    new Request("https://example.com/api/quotes"),
    {
      DB: createDbStub(null)
    },
    {
      waitUntil() {}
    }
  );

  assert.equal(response.status, 503);
  const payload = await response.json();
  assert.equal(payload.success, false);
});

test("refreshLatestQuoteSnapshot stores a partial stale snapshot when one symbol cannot be refreshed", async () => {
  const snapshot = await refreshLatestQuoteSnapshot(
    { DB: createDbStub(null) },
    {
      now: () => "2026-04-14T09:15:04.000Z",
      fetchImpl: async (url) => {
        if (url.includes("%5ENSEI")) {
          return {
            ok: true,
            json: async () => ({
              chart: {
                result: [
                  {
                    meta: {
                      regularMarketPrice: 23842.65,
                      regularMarketChange: -207.95,
                      regularMarketChangePercent: -0.86,
                      regularMarketTime: 1776158104
                    }
                  }
                ]
              }
            })
          };
        }

        return {
          ok: false,
          status: 403,
          json: async () => ({})
        };
      }
    }
  );

  assert.equal(snapshot.quotes.length, 1);
  assert.equal(snapshot.quotes[0].symbol, "^NSEI");
  assert.equal(snapshot.isStale, true);
  assert.match(snapshot.sourceSummary, /\^BSESN:unavailable/);
});