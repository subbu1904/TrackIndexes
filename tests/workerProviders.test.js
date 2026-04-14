import test from "node:test";
import assert from "node:assert/strict";

import { parseBseQuoteHtml, parseBseQuoteText } from "../worker/src/providers/bse.js";
import { parseNseQuotePayload } from "../worker/src/providers/nse.js";

test("parseNseQuotePayload normalizes the NIFTY 50 quote", () => {
  const quote = parseNseQuotePayload({
    data: [
      {
        index: "NIFTY 50",
        last: 23842.65,
        variation: -207.95,
        percentChange: -0.86
      }
    ]
  });

  assert.equal(quote.symbol, "^NSEI");
  assert.equal(quote.source, "nse");
  assert.equal(quote.price, 23842.65);
});

test("parseBseQuoteHtml extracts the Sensex quote from Google Finance HTML", () => {
  const quote = parseBseQuoteHtml(`
    <div class="pKBk1e">SENSEX</div>
    <div class="wzUQBf"><span class="lh92"><div jsname="ip75Cb" class="s1OkXb"><div class="YMlKec">76,847.57</div></div></span></div>
    <div class="T7Akdb"><span jsname="p08n3b"><div class="JwB6zf V7hZne" style="font-size: 12px;">-0.91%</div></span><div><span class="P2Luy Ebnabc">-702.68</span></div></div>
  `);

  assert.equal(quote.symbol, "^BSESN");
  assert.equal(quote.source, "bse-google");
  assert.equal(quote.changePercent, -0.91);
  assert.equal(quote.change, -702.68);
});

test("parseBseQuoteText extracts the Sensex quote from the Google Finance text relay", () => {
  const quote = parseBseQuoteText(
    "# SENSEX 76,847.57 (▼0.91%) BSE SENSEX | Google Finance"
  );

  assert.equal(quote.symbol, "^BSESN");
  assert.equal(quote.source, "bse-google-relay");
  assert.equal(quote.price, 76847.57);
  assert.equal(quote.changePercent, 0.91 * -1);
});