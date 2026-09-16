-- ============================================================================
-- 061_analytics_stats_rpc.sql
--
-- Moves the admin analytics dashboard aggregation from JS row scans into
-- Postgres RPCs. lib/db/src/analytics.ts previously pulled up to
-- MAX_STAT_ROWS = 50,000 raw rows per query and bucketed them in Node;
-- these functions replicate that aggregation EXACTLY (same shapes, same
-- sort orders) so the JS fetchers become thin RPC mappers.
--
--   public.analytics_event_stats(p_since timestamptz, p_top_n int)
--   public.analytics_message_stats(p_since timestamptz)
--
-- Semantics replicated from the old JS aggregation:
--   * Daily buckets are keyed by the UTC calendar date of created_at —
--     the JS bucketed with created_at.slice(0, 10), which is the UTC
--     date, so the SQL uses (created_at AT TIME ZONE 'utc')::date.
--     date_trunc('day', created_at) would bucket in the database
--     server's time zone and shift every bucket.
--   * Event stats: page_view daily counts; top project slugs derived
--     as preset_id ?? project_id ?? last path segment ?? 'unknown';
--     top blog slugs from /blog/<slug> page views with published titles
--     (slug fallback for missing/unpublished posts); exact counts for
--     cv_download / contact_click / page_view (uncapped, as before).
--   * Message stats: per-day total and unread counts (no deleted_at
--     filter, as before).
--   * Daily rows are ordered by day ascending; top-N by views
--     descending with slug ascending as deterministic tiebreak (the
--     old JS insertion-order tiebreak was arbitrary anyway).
--
-- Intentional divergence from the JS era: the MAX_STAT_ROWS scan cap no
-- longer applies — aggregation happens inside Postgres, so only the
-- aggregated rows (days x buckets + top-N) cross the wire.
--
-- Retention: schedules the existing cleanup_old_analytics() (019) daily
-- at 03:00 UTC via pg_cron when pg_cron is available. Every step is
-- guarded so databases without pg_cron (local CI, some hosted plans)
-- still migrate cleanly.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.analytics_event_stats(
  p_since timestamptz,
  p_top_n int
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'daily', (
      SELECT COALESCE(jsonb_agg(
               jsonb_build_object('day', day, 'count', count) ORDER BY day),
               '[]'::jsonb)
      FROM (
        SELECT (created_at AT TIME ZONE 'utc')::date AS day,
               COUNT(*)::int AS count
        FROM analytics_events
        WHERE type = 'page_view'
          AND created_at >= p_since
        GROUP BY 1
      ) daily_page_views
    ),
    'top_projects', (
      SELECT COALESCE(jsonb_agg(
               jsonb_build_object('slug', slug, 'views', views)
               ORDER BY views DESC, slug),
               '[]'::jsonb)
      FROM (
        SELECT CASE
                 WHEN preset_id IS NOT NULL THEN preset_id
                 WHEN project_id IS NOT NULL THEN project_id::text
                 WHEN path IS NULL THEN 'unknown'
                 ELSE regexp_replace(path, '^.*/', '')  -- last path segment
               END AS slug,
               COUNT(*)::int AS views
        FROM analytics_events
        WHERE type = 'project_view'
          AND created_at >= p_since
        GROUP BY 1
        ORDER BY views DESC, slug
        LIMIT p_top_n  -- caller passes TOP_N (10); never negative
      ) top_projects
    ),
    'top_posts', (
      SELECT COALESCE(jsonb_agg(
               jsonb_build_object('slug', slug, 'title', title, 'views', views)
               ORDER BY views DESC, slug),
               '[]'::jsonb)
      FROM (
        SELECT counted.slug,
               COALESCE(bp.title, counted.slug) AS title,
               counted.views
        FROM (
          SELECT substring(path FROM '^/blog/([^/?#]+)') AS slug,
                 COUNT(*)::int AS views
          FROM analytics_events
          WHERE type = 'page_view'
            AND created_at >= p_since
            AND path ~ '^/blog/[^/?#]+'
          GROUP BY 1
          ORDER BY views DESC, slug
          LIMIT p_top_n
        ) counted
        LEFT JOIN blog_posts bp
          ON bp.slug = counted.slug
         AND bp.is_published = true
         AND bp.deleted_at IS NULL
      ) top_posts
    ),
    'cv_downloads', (
      SELECT COUNT(*)::int FROM analytics_events
      WHERE type = 'cv_download' AND created_at >= p_since
    ),
    'contact_clicks', (
      SELECT COUNT(*)::int FROM analytics_events
      WHERE type = 'contact_click' AND created_at >= p_since
    ),
    'total_views', (
      SELECT COUNT(*)::int FROM analytics_events
      WHERE type = 'page_view' AND created_at >= p_since
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.analytics_message_stats(p_since timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'daily', (
      SELECT COALESCE(jsonb_agg(
               jsonb_build_object('day', day, 'total', total, 'unread', unread)
               ORDER BY day),
               '[]'::jsonb)
      FROM (
        SELECT (created_at AT TIME ZONE 'utc')::date AS day,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'unread')::int AS unread
        FROM messages
        WHERE created_at >= p_since
        GROUP BY 1
      ) daily_messages
    )
  );
$$;

-- Stats are admin-only surface. Postgres grants EXECUTE on new functions
-- to PUBLIC by default (and Supabase layers explicit grants for
-- anon/authenticated on top), so revoke from all three and re-grant to
-- the service role only — the API server calls these with the
-- service-role key.
REVOKE EXECUTE ON FUNCTION public.analytics_event_stats(timestamptz, int)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.analytics_message_stats(timestamptz)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_event_stats(timestamptz, int)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_message_stats(timestamptz)
  TO service_role;

COMMENT ON FUNCTION public.analytics_event_stats(timestamptz, int)
  IS 'Admin analytics: page_view daily counts (UTC-day buckets), top project slugs, top blog slugs with published titles, and exact event counts since p_since. Mirrors the legacy JS aggregation in lib/db/src/analytics.ts.';
COMMENT ON FUNCTION public.analytics_message_stats(timestamptz)
  IS 'Admin analytics: per-UTC-day message totals and unread counts since p_since. Mirrors the legacy JS aggregation in lib/db/src/analytics.ts.';

-- ── Retention: schedule cleanup_old_analytics() (019) via pg_cron ──────────
-- Guarded so databases without pg_cron still reset/migrate cleanly.
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cleanup-old-analytics'
    ) THEN
      PERFORM cron.schedule(
        'cleanup-old-analytics',
        '0 3 * * *',
        'SELECT public.cleanup_old_analytics()'
      );
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
