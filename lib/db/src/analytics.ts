import type { SupabaseClient } from "@supabase/supabase-js";
import { logError } from "@workspace/logging";
import { queryOrThrow } from "./query";

type EventType = "page_view" | "project_view" | "cv_download" | "contact_click";

/**
 * How many top items (projects, posts) the stats RPCs return. Named
 * replacement for the former magic `slice(0, 10)` in the JS aggregation.
 */
export const TOP_N = 10;

/**
 * Legacy scan cap from the JS-side stats era. Aggregation now happens
 * inside Postgres (see supabase/migrations/061_analytics_stats_rpc.sql),
 * so no row cap is needed — only aggregated rows cross the wire and the
 * 50k-row undercount cliff is gone. Kept exported for backward
 * compatibility with the module's public surface.
 */
export const MAX_STAT_ROWS = 50_000;

/** jsonb shape returned by public.analytics_event_stats (migration 061). */
interface EventStatsRpcPayload {
  daily: Array<{ day: string; count: number }>;
  top_projects: Array<{ slug: string; views: number }>;
  top_posts: Array<{ slug: string; title: string; views: number }>;
  cv_downloads: number;
  contact_clicks: number;
  total_views: number;
}

/** jsonb shape returned by public.analytics_message_stats (migration 061). */
interface MessageStatsRpcPayload {
  daily: Array<{ day: string; total: number; unread: number }>;
}

export async function trackEvent(
  supabase: SupabaseClient,
  eventType: EventType,
  page: string,
  metadata?: Record<string, string>,
): Promise<void> {
  try {
    await supabase.from("analytics_events").insert({
      type: eventType,
      path: page,
      section_key: metadata?.section ?? null,
      // project_id is a UUID FK — only pass real UUIDs. String identifiers
      // (project slugs) belong in the TEXT preset_id column; sending a slug
      // into project_id makes PostgREST reject the insert with a 400.
      preset_id: metadata?.project_slug ?? null,
      project_id: metadata?.project_id ?? null,
      referrer: metadata?.referrer ?? null,
      device: metadata?.device ?? null,
    });
  } catch {
    /* fire-and-forget — never affect UI */
  }
}

/**
 * Shared single-round-trip stats fetch: calls the named Postgres RPC via
 * the injected client and degrades to `null` on failure (stats routes
 * must never 500 over a stats hiccup). Errors are logged through
 * @workspace/logging with the `[table.rpc]` context prefix.
 */
async function fetchStatsRpc<T>(
  supabase: SupabaseClient,
  table: "analytics_events" | "messages",
  fn: string,
  args: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await queryOrThrow<T>(supabase.rpc(fn, args), { table, operation: "rpc" });
  } catch (err) {
    logError("analytics stats rpc failed", err, `[${table}.rpc]`);
    return null;
  }
}

export async function fetchEventStats(
  supabase: SupabaseClient,
  days: number = 30,
): Promise<{
  pageViews: Array<{ date: string; count: number }>;
  topProjects: Array<{ slug: string; title: string; views: number }>;
  topPosts: Array<{ slug: string; title: string; views: number }>;
  cvDownloads: number;
  contactClicks: number;
  totalViews: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const payload = await fetchStatsRpc<EventStatsRpcPayload>(
    supabase,
    "analytics_events",
    "analytics_event_stats",
    { p_since: since.toISOString(), p_top_n: TOP_N },
  );

  return {
    // daily rows arrive sorted by day ascending from the RPC (UTC dates)
    pageViews: (payload?.daily ?? []).map(({ day, count }) => ({ date: day, count })),
    topProjects: (payload?.top_projects ?? []).map(({ slug, views }) => ({
      slug,
      // legacy shape reused the slug as the title for projects
      title: slug,
      views,
    })),
    topPosts: payload?.top_posts ?? [],
    cvDownloads: payload?.cv_downloads ?? 0,
    contactClicks: payload?.contact_clicks ?? 0,
    totalViews: payload?.total_views ?? 0,
  };
}

export async function fetchMessageStats(
  supabase: SupabaseClient,
  days: number = 30,
): Promise<Array<{ date: string; total: number; unread: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const payload = await fetchStatsRpc<MessageStatsRpcPayload>(
    supabase,
    "messages",
    "analytics_message_stats",
    { p_since: since.toISOString() },
  );

  // daily rows arrive sorted by day ascending from the RPC (UTC dates)
  return (payload?.daily ?? []).map(({ day, total, unread }) => ({
    date: day,
    total,
    unread,
  }));
}
