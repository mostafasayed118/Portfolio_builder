import { describe, it, expect, vi, beforeEach } from "vitest";
import { trackEvent, fetchEventStats, fetchMessageStats } from "./analytics";

// ─── trackEvent ──────────────────────────────────────────────────────────────

describe("trackEvent", () => {
  it("inserts into analytics_events with mapped fields", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from } as any;

    await trackEvent(supabase, "page_view", "/home");

    expect(from).toHaveBeenCalledWith("analytics_events");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ type: "page_view", path: "/home" }),
    );
  });

  it("maps metadata.section to section_key", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from } as any;

    await trackEvent(supabase, "project_view", "/projects/x", { section: "hero" });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ section_key: "hero" }),
    );
  });

  it("maps metadata.project_slug to project_id", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from } as any;

    await trackEvent(supabase, "project_view", "/projects/x", { project_slug: "my-project" });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ project_id: "my-project" }),
    );
  });

  it("swallows errors silently (fire-and-forget)", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("network down"));
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from } as any;

    await expect(trackEvent(supabase, "page_view", "/")).resolves.toBeUndefined();
  });
});

// ─── fetchEventStats ─────────────────────────────────────────────────────────

function buildEventStatsMock(pageViews: any[] = [], projectViews: any[] = [], counts: Record<string, number> = {}) {
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "analytics_events") {
      return {
        select: vi.fn().mockImplementation((cols: string, opts?: any) => {
          if (opts?.count === "exact") {
            // count query — resolves via eq chain
            return {
              eq: vi.fn().mockImplementation((type: string) => ({
                gte: vi.fn().mockResolvedValue({ count: counts[type] ?? 0, error: null }),
              })),
              gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
            };
          }
          // data query
          if (cols === "created_at") {
            return {
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({ data: pageViews, error: null }),
                }),
              }),
            };
          }
          if (cols === "project_id, path") {
            return {
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockResolvedValue({ data: projectViews, error: null }),
              }),
            };
          }
          return { gte: vi.fn().mockResolvedValue({ data: [], error: null }) };
        }),
      };
    }
    return { select: vi.fn() };
  });
  return { from } as any;
}

describe("fetchEventStats", () => {
  it("returns pageViews aggregated by date", async () => {
    const supabase = buildEventStatsMock(
      [
        { created_at: "2024-01-01T10:00:00Z" },
        { created_at: "2024-01-01T12:00:00Z" },
        { created_at: "2024-01-02T09:00:00Z" },
      ],
      [],
      {},
    );

    const stats = await fetchEventStats(supabase, 30);

    expect(stats.pageViews).toEqual([
      { date: "2024-01-01", count: 2 },
      { date: "2024-01-02", count: 1 },
    ]);
  });

  it("returns topProjects sorted by views descending", async () => {
    const supabase = buildEventStatsMock(
      [],
      [
        { project_id: "alpha", path: "/projects/alpha" },
        { project_id: "alpha", path: "/projects/alpha" },
        { project_id: "beta", path: "/projects/beta" },
      ],
      {},
    );

    const stats = await fetchEventStats(supabase, 30);

    expect(stats.topProjects[0].slug).toBe("alpha");
    expect(stats.topProjects[0].views).toBe(2);
    expect(stats.topProjects[1].slug).toBe("beta");
    expect(stats.topProjects[1].views).toBe(1);
  });

  it("returns zero counts when no data exists", async () => {
    const supabase = buildEventStatsMock([], [], {});

    const stats = await fetchEventStats(supabase, 30);

    expect(stats.totalViews).toBe(0);
    expect(stats.cvDownloads).toBe(0);
    expect(stats.contactClicks).toBe(0);
    expect(stats.topProjects).toEqual([]);
  });
});

// ─── fetchMessageStats ───────────────────────────────────────────────────────

function buildMessageStatsMock(messages: any[] = []) {
  const from = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      gte: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: messages, error: null }),
      }),
    }),
  });
  return { from } as any;
}

describe("fetchMessageStats", () => {
  it("aggregates messages by date with total and unread counts", async () => {
    const supabase = buildMessageStatsMock([
      { created_at: "2024-01-01T10:00:00Z", is_read: false },
      { created_at: "2024-01-01T11:00:00Z", is_read: true },
      { created_at: "2024-01-02T09:00:00Z", is_read: false },
    ]);

    const stats = await fetchMessageStats(supabase, 30);

    expect(stats).toEqual([
      { date: "2024-01-01", total: 2, unread: 1 },
      { date: "2024-01-02", total: 1, unread: 1 },
    ]);
  });

  it("returns an empty array when there are no messages", async () => {
    const supabase = buildMessageStatsMock([]);

    const stats = await fetchMessageStats(supabase, 30);

    expect(stats).toEqual([]);
  });
});
