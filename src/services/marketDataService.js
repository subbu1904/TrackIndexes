import { createIndexQuote } from "../models/IndexQuote.js";
import { fetchQuote } from "./yahooFinance.js";

const DEFAULT_MARKET_DATA_API_PATH = "/api/quotes";
const DEFAULT_SYMBOLS = ["^NSEI", "^BSESN"];

export class MarketDataValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MarketDataValidationError";
  }
}

export class MarketDataNetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "MarketDataNetworkError";
  }
}

export class MarketDataHttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "MarketDataHttpError";
    this.status = status;
  }
}

export function resolveMarketDataApiUrl() {
  const envApiUrl = import.meta.env?.VITE_MARKET_DATA_API_URL?.trim();
  if (envApiUrl) {
    return envApiUrl;
  }

  return DEFAULT_MARKET_DATA_API_PATH;
}

function normalizeTimestamp(value, fallbackNow) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return fallbackNow;
}

function normalizeQuote(rawQuote, { stale, nowIso }) {
  if (typeof rawQuote?.symbol !== "string" || typeof rawQuote?.name !== "string") {
    throw new MarketDataValidationError("Market data payload is invalid.");
  }

  if (
    typeof rawQuote.price !== "number" ||
    typeof rawQuote.changePercent !== "number"
  ) {
    throw new MarketDataValidationError(
      `Market data for ${rawQuote.name} is unavailable right now.`
    );
  }

  const isDelayed = Boolean(rawQuote.isDelayed) || stale || rawQuote.source === "cache";

  return {
    ...createIndexQuote({
      symbol: rawQuote.symbol,
      name: rawQuote.name,
      price: rawQuote.price,
      change: typeof rawQuote.change === "number" ? rawQuote.change : 0,
      changePercent: rawQuote.changePercent,
      timestamp: normalizeTimestamp(rawQuote.timestamp, nowIso),
      isDelayed
    }),
    source: typeof rawQuote.source === "string" ? rawQuote.source : "unknown",
    statusLabel: stale ? "Cached" : isDelayed ? "Delayed" : "Live"
  };
}

export function parseMarketDataResponse(payload, { now = () => new Date().toISOString() } = {}) {
  if (payload?.success !== true || !Array.isArray(payload?.data)) {
    throw new MarketDataValidationError(
      typeof payload?.error === "string"
        ? payload.error
        : "Market data is unavailable right now."
    );
  }

  const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};
  const stale = Boolean(meta.stale);
  const nowIso = now();
  const quotes = payload.data.map((quote) => normalizeQuote(quote, { stale, nowIso }));

  const lastUpdatedAt =
    typeof meta.fetchedAt === "string" && !Number.isNaN(Date.parse(meta.fetchedAt))
      ? meta.fetchedAt
      : quotes.reduce((latest, quote) =>
          Date.parse(quote.timestamp) > Date.parse(latest) ? quote.timestamp : latest,
        nowIso);

  return {
    quotes,
    lastUpdatedAt,
    meta: {
      fetchedAt: lastUpdatedAt,
      stale,
      ageSeconds: typeof meta.ageSeconds === "number" ? meta.ageSeconds : null
    }
  };
}

async function fetchLegacyMarketSnapshot({
  symbols = DEFAULT_SYMBOLS,
  fetchQuoteImpl = fetchQuote
} = {}) {
  const quotes = await Promise.all(symbols.map((symbol) => fetchQuoteImpl(symbol)));
  const fetchedAt = new Date().toISOString();

  return {
    quotes: quotes.map((quote) => ({
      ...quote,
      source: "legacy-client",
      statusLabel: quote.isDelayed ? "Delayed" : "Live"
    })),
    lastUpdatedAt: fetchedAt,
    meta: {
      fetchedAt,
      stale: false,
      ageSeconds: 0
    }
  };
}

export async function fetchMarketSnapshot({
  apiUrl = resolveMarketDataApiUrl(),
  symbols = DEFAULT_SYMBOLS,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8000,
  fallbackToLegacyClient = true,
  fetchQuoteImpl = fetchQuote
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new MarketDataNetworkError("No fetch implementation is available.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(apiUrl, {
      method: "GET",
      headers: {
        accept: "application/json"
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new MarketDataHttpError("Market data could not be loaded.", response.status);
    }

    const payload = await response.json();
    return parseMarketDataResponse(payload);
  } catch (error) {
    if (fallbackToLegacyClient) {
      try {
        return await fetchLegacyMarketSnapshot({ symbols, fetchQuoteImpl });
      } catch {
      }
    }

    if (error?.name === "AbortError") {
      throw new MarketDataNetworkError("Market data request timed out.");
    }

    if (
      error instanceof MarketDataValidationError ||
      error instanceof MarketDataNetworkError ||
      error instanceof MarketDataHttpError
    ) {
      throw error;
    }

    throw new MarketDataNetworkError("Market data could not be loaded.");
  } finally {
    clearTimeout(timeoutId);
  }
}