-- ============================================================================
-- 060_analytics_composite_index.sql
--
-- Composite index powering the Postgres-side analytics stats RPCs (061).
--
-- The admin dashboard filters analytics_events by `type = <event>` with a
-- `created_at >= since` window and groups by UTC day. The pre-existing
-- indexes (001_init) cover `type` and `created_at` only separately, so
-- every stats window had to combine a type bitmap + sort/skip on time.
-- (type, created_at DESC) lets Postgres seek straight to one event type's
-- time-ordered slice — the access pattern of every stats query and of the
-- retention DELETE in cleanup_old_analytics() (019).
--
-- Idempotent: IF NOT EXISTS; safe to re-run.
-- ============================================================================

CREATE INDEX IF NOT EXISTS analytics_events_type_created_at_idx
  ON analytics_events (type, created_at DESC);
