import { normalizeQuoteSnapshot } from "./normalize.js";

export const LATEST_SNAPSHOT_KEY = "latest";

export async function readLatestQuoteSnapshot(db) {
  const row = await db
    .prepare(
      `SELECT snapshot_key, payload_json, fetched_at, source_summary, is_stale
       FROM quote_snapshots
       WHERE snapshot_key = ?`
    )
    .bind(LATEST_SNAPSHOT_KEY)
    .first();

  if (!row) {
    return null;
  }

  return normalizeQuoteSnapshot(JSON.parse(row.payload_json), {
    fetchedAt: row.fetched_at,
    isStale: Boolean(row.is_stale),
    sourceSummary: row.source_summary
  });
}

export async function writeLatestQuoteSnapshot(db, snapshot) {
  const normalizedSnapshot = normalizeQuoteSnapshot(snapshot.quotes, {
    fetchedAt: snapshot.fetchedAt,
    isStale: snapshot.isStale,
    sourceSummary: snapshot.sourceSummary
  });

  await db
    .prepare(
      `INSERT INTO quote_snapshots (
         snapshot_key,
         payload_json,
         fetched_at,
         source_summary,
         is_stale
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(snapshot_key) DO UPDATE SET
         payload_json = excluded.payload_json,
         fetched_at = excluded.fetched_at,
         source_summary = excluded.source_summary,
         is_stale = excluded.is_stale`
    )
    .bind(
      LATEST_SNAPSHOT_KEY,
      JSON.stringify(normalizedSnapshot.quotes),
      normalizedSnapshot.fetchedAt,
      normalizedSnapshot.sourceSummary,
      normalizedSnapshot.isStale ? 1 : 0
    )
    .run();

  return normalizedSnapshot;
}