import { createIndexQuote } from "../models/IndexQuote.js";

const BASE_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
const CORS_PROXY_URL = "https://corsproxy.io/?";
const FALLBACK_DELAY_FLAG = true;

const SYMBOL_NAMES = {
  "^NSEI": "NIFTY 50",
  "^BSESN": "SENSEX"
};

export class QuoteParsingError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuoteParsingError";
  }
}

export class QuoteNetworkError extends Error {
  constructor(message) {
    super(message);
    this.name = "QuoteNetworkError";
  }
}

export class QuoteHttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "QuoteHttpError";
    this.status = status;
  }
}

export function buildYahooChartUrl(symbol) {
  const encodedSymbol = encodeURIComponent(symbol);
  return `${BASE_URL}/${encodedSymbol}?interval=1d&range=1d`;
}

export function buildYahooProxyChartUrl(symbol) {
  const encodedSymbol = encodeURIComponent(symbol);
  return `${CORS_PROXY_URL}${BASE_URL}/${encodedSymbol}?interval=1d&range=1d`;
}

function buildYahooRequestUrls(symbol) {
  return [buildYahooChartUrl(symbol), buildYahooProxyChartUrl(symbol)];
}

export function parseYahooChartQuote(symbol, payload) {
  const meta = payload?.chart?.result?.[0]?.meta;
  const name = SYMBOL_NAMES[symbol] ?? symbol;

  if (
    !meta ||
    typeof meta.regularMarketPrice !== "number" ||
    typeof meta.regularMarketChangePercent !== "number"
  ) {
    throw new QuoteParsingError(
      `Market data for ${name} is unavailable right now.`
    );
  }

  const timestamp =
    typeof meta.regularMarketTime === "number"
      ? new Date(meta.regularMarketTime * 1000).toISOString()
      : new Date().toISOString();

  return createIndexQuote({
    symbol,
    name,
    price: meta.regularMarketPrice,
    change: meta.regularMarketChange ?? 0,
    changePercent: meta.regularMarketChangePercent,
    timestamp,
    isDelayed: FALLBACK_DELAY_FLAG
  });
}

export async function fetchQuote(
  symbol,
  { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new QuoteNetworkError("No fetch implementation is available.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let lastError = null;

    for (const url of buildYahooRequestUrls(symbol)) {
      try {
        const response = await fetchImpl(url, {
          signal: controller.signal
        });

        if (!response.ok) {
          lastError = new QuoteHttpError(
            `Market data for ${SYMBOL_NAMES[symbol] ?? symbol} could not be loaded.`,
            response.status
          );
          continue;
        }

        const payload = await response.json();
        return parseYahooChartQuote(symbol, payload);
      } catch (error) {
        if (error?.name === "AbortError") {
          throw error;
        }

        if (
          error instanceof QuoteParsingError ||
          error instanceof QuoteHttpError ||
          error instanceof QuoteNetworkError
        ) {
          lastError = error;
          continue;
        }

        lastError = error;
      }
    }

    if (lastError instanceof QuoteParsingError || lastError instanceof QuoteHttpError) {
      throw lastError;
    }

    throw new QuoteNetworkError(
      `Market data for ${SYMBOL_NAMES[symbol] ?? symbol} could not be loaded.`
    );
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new QuoteNetworkError(
        `Market data request for ${SYMBOL_NAMES[symbol] ?? symbol} timed out.`
      );
    }

    if (
      error instanceof QuoteParsingError ||
      error instanceof QuoteHttpError ||
      error instanceof QuoteNetworkError
    ) {
      throw error;
    }

    throw new QuoteNetworkError(
      `Market data for ${SYMBOL_NAMES[symbol] ?? symbol} could not be loaded.`
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
