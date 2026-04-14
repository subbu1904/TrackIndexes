export class SnapshotValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "SnapshotValidationError";
  }
}

function normalizeTimestamp(value, fallback) {
  if (typeof value === "string" && !Number.isNaN(Date.parse(value))) {
    return value;
  }

  return fallback;
}

export function normalizeQuote(quote, { fallbackTimestamp } = {}) {
  if (typeof quote?.symbol !== "string" || typeof quote?.name !== "string") {
    throw new SnapshotValidationError("Quote payload is missing symbol or name.");
  }

  if (typeof quote.price !== "number" || typeof quote.changePercent !== "number") {
    throw new SnapshotValidationError(`Quote payload for ${quote.name} is invalid.`);
  }

  return {
    symbol: quote.symbol,
    name: quote.name,
    price: quote.price,
    change: typeof quote.change === "number" ? quote.change : 0,
    changePercent: quote.changePercent,
    timestamp: normalizeTimestamp(
      quote.timestamp,
      fallbackTimestamp ?? new Date().toISOString()
    ),
    source: typeof quote.source === "string" ? quote.source : "unknown",
    isDelayed: Boolean(quote.isDelayed)
  };
}

export function normalizeQuoteSnapshot(
  quotes,
  {
    fetchedAt = new Date().toISOString(),
    isStale = false,
    sourceSummary = "unknown"
  } = {}
) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new SnapshotValidationError("A quote snapshot must include at least one quote.");
  }

  const normalizedFetchedAt = normalizeTimestamp(fetchedAt, new Date().toISOString());

  return {
    quotes: quotes.map((quote) =>
      normalizeQuote(quote, { fallbackTimestamp: normalizedFetchedAt })
    ),
    fetchedAt: normalizedFetchedAt,
    isStale: Boolean(isStale),
    sourceSummary
  };
}

export function computeSnapshotAgeSeconds(fetchedAt, { now = () => Date.now() } = {}) {
  const fetchedAtMs = Date.parse(fetchedAt);
  if (!Number.isFinite(fetchedAtMs)) {
    return null;
  }

  return Math.max(0, Math.floor((now() - fetchedAtMs) / 1000));
}