# Indian Market Index Data — Zero-Backend Design Note

> **Scope:** Fetching NIFTY 50 and SENSEX in a Flutter web app with no API key, no server, and no paid data vendor.

---

## Problem Statement

Both NSE and BSE block direct browser `fetch()` calls with CORS headers and require session cookies. "Zero-backend" in practice means either using a CORS-permissive intermediary or scraping a third-party widget. The goal is a production-safe solution that costs nothing, has no API key dependency, and works reliably inside a Flutter android app.

---

### 1. Yahoo Finance Unofficial API via CORS Proxy

The simplest working approach. Yahoo Finance exposes `^NSEI` (NIFTY 50) and `^BSESN` (SENSEX) as index tickers with no API key. The endpoint:

```
https://query1.finance.yahoo.com/v8/finance/chart/^NSEI?interval=1d&range=1d
```

Yahoo's CORS headers are inconsistent — they work from `localhost` and some hosted domains but are blocked on others. The reliable workaround is routing through a free CORS proxy:

```js
const url = `https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1d`;
const res = await fetch(url);
const data = await res.json();
const price = data.chart.result[0].meta.regularMarketPrice;
```

**Trade-offs:** Unofficial API — Yahoo has broken this endpoint before without notice. Data is delayed ~15 minutes. Not for production trading.

---
### Yahoo Fallback Endpoints (via corsproxy.io)

```
Sensex:   https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/%5EBSESN?interval=1d&range=1d
NIFTY 50: https://corsproxy.io/?https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=1d

Price:    data.chart.result[0].meta.regularMarketPrice
Change:   data.chart.result[0].meta.regularMarketChange     (nullable)
% Change: data.chart.result[0].meta.regularMarketChangePercent
```

Notes:
- `%5E` is URL-encoded `^` (Yahoo index prefix)
- Data is delayed ~15 min on Yahoo; label the UI accordingly
- Do not poll faster than 60s intervals on `corsproxy.io` free tier

---

