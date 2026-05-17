import type { SupabaseClient } from "@supabase/supabase-js";

type EventType = "page_view" | "project_view" | "cv_download" | "contact_click";

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
      project_id: metadata?.project_slug ?? metadata?.project_id ?? null,
      referrer: metadata?.referrer ?? null,
      device: metadata?.device ?? null,
    });
  } catch {
    /* fire-and-forget — never affect UI */
  }
}

export async function fetchEventStats(
  supabase: SupabaseClient,
  days: number = 30,
): Promise<{
  pageViews: Array<{ date: string; count: number }>;
  topProjects: Array<{ slug: string; title: string; views: number }>;
  cvDownloads: number;
  contactClicks: number;
  totalViews: number;
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: pageViewRows } = await supabase
    .from("analytics_events")
    .select("created_at")
    .eq("type", "page_view")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const pageViews = aggregateByDate(pageViewRows ?? []);

  const { data: projectViewRows } = await supabase
    .from("analytics_events")
    .select("project_id, path")
    .eq("type", "project_view")
    .gte("created_at", since.toISOString());

  const projectCounts = new Map<string, { slug: string; views: number }>();
  for (const row of projectViewRows ?? []) {
    const slug = row.project_id ?? row.path?.split("/").pop() ?? "unknown";
    const existing = projectCounts.get(slug);
    if (existing) {
      existing.views++;
    } else {
      projectCounts.set(slug, { slug, views: 1 });
    }
  }
  const topProjects = Array.from(projectCounts.values())
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)
    .map((p) => ({ ...p, title: p.slug }));

  const { count: cvDownloads } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "cv_download")
    .gte("created_at", since.toISOString());

  const { count: contactClicks } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "contact_click")
    .gte("created_at", since.toISOString());

  const { count: totalViews } = await supabase
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("type", "page_view")
    .gte("created_at", since.toISOString());

  return {
    pageViews,
    topProjects,
    cvDownloads: cvDownloads ?? 0,
    contactClicks: contactClicks ?? 0,
    totalViews: totalViews ?? 0,
  };
}

export async function fetchMessageStats(
  supabase: SupabaseClient,
  days: number = 30,
): Promise<Array<{ date: string; total: number; unread: number }>> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: allMessages } = await supabase
    .from("contact_messages")
    .select("created_at, is_read")
    .gte("created_at", since.toISOString())
    .order("created_at", { ascending: true });

  const dailyMap = new Map<
    string,
    { total: number; unread: number }
  >();

  for (const msg of allMessages ?? []) {
    const d = msg.created_at.slice(0, 10);
    const entry = dailyMap.get(d) ?? { total: 0, unread: 0 };
    entry.total++;
    if (!msg.is_read) entry.unread++;
    dailyMap.set(d, entry);
  }

  return Array.from(dailyMap.entries())
    .map(([date, counts]) => ({ date, ...counts }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateByDate(
  rows: Array<{ created_at: string }>,
): Array<{ date: string; count: number }> {
  const daily = new Map<string, number>();
  for (const row of rows) {
    const d = row.created_at.slice(0, 10);
    daily.set(d, (daily.get(d) ?? 0) + 1);
  }
  return Array.from(daily.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
