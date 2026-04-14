import { normalizeQuote } from "../normalize.js";
import { ProviderResponseError } from "./errors.js";

const NSE_ALL_INDICES_URL = "https://www.nseindia.com/api/allIndices";
const NSE_SYMBOL = "^NSEI";
const NSE_INDEX_NAME = "NIFTY 50";

function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(normalized) ? normalized : null;
  }

  return null;
}

export function parseNseQuotePayload(payload) {
  const entries = Array.isArray(payload?.data) ? payload.data : [];
  const entry = entries.find((candidate) => candidate?.index === NSE_INDEX_NAME);

  if (!entry) {
    throw new ProviderResponseError("NSE did not return a NIFTY 50 quote.", 502);
  }

  const price = parseNumber(entry.last);
  const change = parseNumber(entry.variation) ?? 0;
  const changePercent = parseNumber(entry.percentChange);

  if (price === null || changePercent === null) {
    throw new ProviderResponseError("NSE returned an incomplete NIFTY 50 quote.", 502);
  }

  return normalizeQuote({
    symbol: NSE_SYMBOL,
    name: NSE_INDEX_NAME,
    price,
    change,
    changePercent,
    timestamp: new Date().toISOString(),
    source: "nse",
    isDelayed: false
  });
}

export async function fetchNseQuote(_symbol, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(NSE_ALL_INDICES_URL, {
    headers: {
      accept: "application/json",
      "user-agent": "Mozilla/5.0",
      referer: "https://www.nseindia.com/"
    }
  });

  if (!response.ok) {
    throw new ProviderResponseError("NSE request failed.", response.status);
  }

  return parseNseQuotePayload(await response.json());
}