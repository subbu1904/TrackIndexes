import { normalizeQuote } from "../normalize.js";
import { ProviderResponseError } from "./errors.js";

const GOOGLE_SENSEX_URL = "https://www.google.com/finance/quote/SENSEX:INDEXBOM";
const GOOGLE_SENSEX_TEXT_URL = "https://r.jina.ai/http://www.google.com/finance/quote/SENSEX:INDEXBOM";
const BSE_SYMBOL = "^BSESN";
const BSE_INDEX_NAME = "SENSEX";

function parseNumber(value) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = Number(value.replaceAll(",", "").replaceAll("%", "").trim());
  return Number.isFinite(normalized) ? normalized : null;
}

export function parseBseQuoteHtml(html) {
  const match = html.match(
    /<div class=\"pKBk1e\">SENSEX<\/div>[\s\S]{0,1200}?<div class=\"YMlKec(?: fxKbKc)?\">([^<]+)<\/div>[\s\S]{0,600}?<div class=\"JwB6zf V7hZne\"[^>]*>([^<]+)<\/div>[\s\S]{0,400}?<span class=\"P2Luy Ebnabc\">([^<]+)<\/span>/
  );

  if (!match) {
    throw new ProviderResponseError("BSE page did not expose a parsable Sensex quote.", 502);
  }

  const [, priceText, percentText, changeText] = match;
  const price = parseNumber(priceText);
  const change = parseNumber(changeText);
  const changePercent = parseNumber(percentText);

  if (price === null || change === null || changePercent === null) {
    throw new ProviderResponseError("BSE page returned an incomplete Sensex quote.", 502);
  }

  return normalizeQuote({
    symbol: BSE_SYMBOL,
    name: BSE_INDEX_NAME,
    price,
    change,
    changePercent,
    timestamp: new Date().toISOString(),
    source: "bse-google",
    isDelayed: false
  });
}

export function parseBseQuoteText(text) {
  const match = text.match(/#\s+SENSEX\s+([0-9,]+\.[0-9]{2})\s+\(([▲▼]?)([+-]?[0-9]+\.[0-9]{2})%\)/);

  if (!match) {
    throw new ProviderResponseError("BSE text relay did not expose a parsable Sensex quote.", 502);
  }

  const [, priceText, direction, percentText] = match;
  const price = parseNumber(priceText);
  const rawChangePercent = parseNumber(percentText);
  const changePercent =
    rawChangePercent === null
      ? null
      : direction === "▼"
        ? rawChangePercent * -1
        : rawChangePercent;

  if (price === null || changePercent === null) {
    throw new ProviderResponseError("BSE text relay returned an incomplete Sensex quote.", 502);
  }

  return normalizeQuote({
    symbol: BSE_SYMBOL,
    name: BSE_INDEX_NAME,
    price,
    change: 0,
    changePercent,
    timestamp: new Date().toISOString(),
    source: "bse-google-relay",
    isDelayed: false
  });
}

export async function fetchBseQuote(_symbol, { fetchImpl = fetch } = {}) {
  const response = await fetchImpl(GOOGLE_SENSEX_URL, {
    headers: {
      accept: "text/html",
      "user-agent": "Mozilla/5.0"
    }
  });

  if (response.ok) {
    try {
      return parseBseQuoteHtml(await response.text());
    } catch {
    }
  }

  const relayResponse = await fetchImpl(GOOGLE_SENSEX_TEXT_URL, {
    headers: {
      accept: "text/plain",
      "user-agent": "Mozilla/5.0"
    }
  });

  if (!relayResponse.ok) {
    throw new ProviderResponseError("BSE quote relay request failed.", relayResponse.status);
  }

  return parseBseQuoteText(await relayResponse.text());
}