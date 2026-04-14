import test from "node:test";
import assert from "node:assert/strict";

import { createIndexQuote } from "../src/models/IndexQuote.js";
import {
  buildYahooChartUrl,
  fetchQuote,
  parseYahooChartQuote
} from "../src/services/yahooFinance.js";

test("createIndexQuote normalizes serializable quote data", () => {
  const quote = createIndexQuote({
    symbol: "^NSEI",
    name: "NIFTY 50",
    price: 24321.55,
    change: 128.35,
    changePercent: 0.53,
    timestamp: "2026-04-14T07:35:00.000Z",
    isDelayed: true
  });

  assert.deepEqual(quote, {
    symbol: "^NSEI",
    name: "NIFTY 50",
    price: 24321.55,
    change: 128.35,
    changePercent: 0.53,
    timestamp: "2026-04-14T07:35:00.000Z",
    isDelayed: true
  });
});

test("buildYahooChartUrl URL-encodes index symbols for the proxy", () => {
  assert.equal(
    buildYahooChartUrl("^BSESN"),
    "https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1d"
  );
});

test("parseYahooChartQuote extracts price and change fields from Yahoo payload", () => {
  const quote = parseYahooChartQuote("^NSEI", {
    chart: {
      result: [
        {
          meta: {
            symbol: "^NSEI",
            regularMarketPrice: 24321.55,
            regularMarketChange: 128.35,
            regularMarketChangePercent: 0.53,
            regularMarketTime: 1713079800
          }
        }
      ]
    }
  });

  assert.deepEqual(quote, {
    symbol: "^NSEI",
    name: "NIFTY 50",
    price: 24321.55,
    change: 128.35,
    changePercent: 0.53,
    timestamp: "2024-04-14T07:30:00.000Z",
    isDelayed: true
  });
});

test("parseYahooChartQuote throws a user-facing error when the payload is missing core fields", () => {
  assert.throws(
    () =>
      parseYahooChartQuote("^NSEI", {
        chart: {
          result: [{ meta: { regularMarketChange: 12 } }]
        }
      }),
    {
      name: "QuoteParsingError",
      message: "Market data for NIFTY 50 is unavailable right now."
    }
  );
});

test("fetchQuote loads Yahoo data through an injected fetch implementation", async () => {
  const calls = [];
  const quote = await fetchQuote("^BSESN", {
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => ({
          chart: {
            result: [
              {
                meta: {
                  symbol: "^BSESN",
                  regularMarketPrice: 79912.4,
                  regularMarketChange: -82.2,
                  regularMarketChangePercent: -0.1,
                  regularMarketTime: 1713079800
                }
              }
            ]
          }
        })
      };
    }
  });

  assert.equal(
    calls[0],
    "https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1d"
  );
  assert.equal(quote.name, "SENSEX");
  assert.equal(quote.price, 79912.4);
  assert.equal(quote.changePercent, -0.1);
});
