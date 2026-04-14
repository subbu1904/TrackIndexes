import { normalizeQuote } from "../normalize.js";
import { ProviderResponseError } from "./errors.js";

const YAHOO_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";

const SYMBOL_NAMES = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX"
};

export function buildYahooQuoteUrl(symbol) {
  return `${YAHOO_CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
}

export async function fetchYahooQuote(symbol, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(buildYahooQuoteUrl(symbol), {
    headers: {
      accept: "application/json"
    }
  });

  if (!response.ok) {
    throw new ProviderResponseError(
      `Yahoo Finance request failed for ${SYMBOL_NAMES[symbol] ?? symbol}.`,
      response.status
    );
  }

  const payload = await response.json();
  const meta = payload?.chart?.result?.[0]?.meta;

  if (
    !meta ||
    typeof meta.regularMarketPrice !== "number" ||
    typeof meta.regularMarketChangePercent !== "number"
  ) {
    throw new ProviderResponseError(
      `Yahoo Finance returned an incomplete payload for ${SYMBOL_NAMES[symbol] ?? symbol}.`,
      response.status
    );
  }

  return normalizeQuote({
    symbol,
    name: SYMBOL_NAMES[symbol] ?? symbol,
    price: meta.regularMarketPrice,
    change: meta.regularMarketChange ?? 0,
    changePercent: meta.regularMarketChangePercent,
    timestamp:
      typeof meta.regularMarketTime === "number"
        ? new Date(meta.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    source: "yahoo",
    isDelayed: true
  });
}