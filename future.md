

### 5. Cloudflare D1 + Scheduled Worker (Recommended for Production)

The most robust zero-infrastructure pattern. A Cloudflare Cron Trigger Worker runs every minute during market hours, fetches NSE/BSE data using approach 2, and writes it to D1. The Flutter app reads from D1 via a Worker API — no per-request latency, no hammering NSE on every page load:

```
Flutter browser app → Cloudflare Worker (read) → D1 cache
                                    ↑
Cron Worker (write, every 1 min) → NSE API → D1
```

Fits naturally into an existing Cloudflare setup (Pages, Workers, R2). Free tier covers this entirely.

---

