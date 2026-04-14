CREATE TABLE IF NOT EXISTS quote_snapshots (
  snapshot_key TEXT PRIMARY KEY,
  payload_json TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  source_summary TEXT NOT NULL,
  is_stale INTEGER NOT NULL DEFAULT 0
);