import { readLatestQuoteSnapshot, writeLatestQuoteSnapshot } from "./d1.js";
import { normalizeQuoteSnapshot } from "./normalize.js";
import { fetchBseQuote } from "./providers/bse.js";
import { fetchNseQuote } from "./providers/nse.js";
import { fetchYahooQuote } from "./providers/yahoo.js";

const PROVIDER_CHAIN = {
  "^NSEI": [fetchNseQuote, fetchYahooQuote],
  "^BSESN": [fetchBseQuote, fetchYahooQuote]
};

function formatIstParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });

  return Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
}

export function shouldRefreshMarketSnapshot(date = new Date()) {
  const parts = formatIstParts(date);
  const weekday = parts.weekday;
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const totalMinutes = hour * 60 + minute;

  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const isMarketHours = totalMinutes >= 9 * 60 + 15 && totalMinutes <= 15 * 60 + 30;

  return isWeekday && isMarketHours;
}

async function resolveQuote(symbol, { fetchImpl, cachedSnapshot }) {
  let lastError = null;

  for (const provider of PROVIDER_CHAIN[symbol] ?? []) {
    try {
      return await provider(symbol, { fetchImpl });
    } catch (error) {
      lastError = error;
    }
  }

  const cachedQuote = cachedSnapshot?.quotes?.find((quote) => quote.symbol === symbol);
  if (cachedQuote) {
    return {
      ...cachedQuote,
      source: "cache",
      isDelayed: true
    };
  }

  throw lastError ?? new Error(`No market data provider is available for ${symbol}.`);
}

export async function refreshLatestQuoteSnapshot(
  env,
  { fetchImpl = fetch, now = () => new Date().toISOString() } = {}
) {
  const cachedSnapshot = await readLatestQuoteSnapshot(env.DB);
  const quotes = [];
  const sourceParts = [];
  const unresolvedSymbols = [];
  let lastError = null;

  for (const symbol of Object.keys(PROVIDER_CHAIN)) {
    try {
      const quote = await resolveQuote(symbol, { fetchImpl, cachedSnapshot });
      quotes.push(quote);
      sourceParts.push(`${quote.symbol}:${quote.source}`);
    } catch (error) {
      unresolvedSymbols.push(symbol);
      sourceParts.push(`${symbol}:unavailable`);
      lastError = error;
    }
  }

  if (quotes.length === 0) {
    throw lastError ?? new Error("No market data could be refreshed.");
  }

  const normalizedSnapshot = normalizeQuoteSnapshot(quotes, {
    fetchedAt: now(),
    isStale:
      quotes.some((quote) => quote.source === "cache") || unresolvedSymbols.length > 0,
    sourceSummary: sourceParts.join(",")
  });

  return writeLatestQuoteSnapshot(env.DB, normalizedSnapshot);
}