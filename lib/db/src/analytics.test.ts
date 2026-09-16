import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setCaptureError } from "@workspace/logging";
import { MAX_STAT_ROWS, TOP_N, trackEvent, fetchEventStats, fetchMessageStats } from "./analytics";

// ─── shared fixtures ─────────────────────────────────────────────────────────

// Pinned clock so the RPC window args are exactly assertable. Fixed NOW
// minus N calendar days keeps the same time-of-day, so the expected UTC
// instant is timezone-independent (and clear of DST transitions).
const FIXED_NOW = new Date("2024-06-15T12:00:00Z");
const SINCE_30D = "2024-05-16T12:00:00.000Z";
const SINCE_7D = "2024-06-08T12:00:00.000Z";

const EMPTY_EVENT_STATS = {
  daily: [],
  top_projects: [],
  top_posts: [],
  cv_downloads: 0,
  contact_clicks: 0,
  total_views: 0,
};

function buildRpcMock(data: unknown, error: unknown = null) {
  const rpc = vi.fn().mockResolvedValue({ data, error });
  const from = vi.fn();
  const supabase = { rpc, from } as any;
  return { supabase, rpc, from };
}

let capture: ReturnType<typeof vi.fn>;

function pinClock(): void {
  vi.useFakeTimers({ now: FIXED_NOW });
  capture = vi.fn();
  setCaptureError(capture);
}

afterEach(() => {
  setCaptureError(null);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

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

  it("maps metadata.project_slug to preset_id (not the UUID project_id column)", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: null });
    const from = vi.fn().mockReturnValue({ insert });
    const supabase = { from } as any;

    await trackEvent(supabase, "project_view", "/projects/x", { project_slug: "my-project" });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ preset_id: "my-project", project_id: null }),
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

describe("fetchEventStats", () => {
  beforeEach(pinClock);

  it("aggregates via one analytics_event_stats rpc call (UTC window + TOP_N)", async () => {
    const { supabase, rpc, from } = buildRpcMock(EMPTY_EVENT_STATS);

    await fetchEventStats(supabase);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("analytics_event_stats", {
      p_since: SINCE_30D,
      p_top_n: TOP_N,
    });
    // no raw table scans — the whole aggregation lives in Postgres
    expect(from).not.toHaveBeenCalled();
  });

  it("passes the days window as a UTC instant (7d)", async () => {
    const { supabase, rpc } = buildRpcMock(EMPTY_EVENT_STATS);

    await fetchEventStats(supabase, 7);

    expect(rpc).toHaveBeenCalledWith("analytics_event_stats", {
      p_since: SINCE_7D,
      p_top_n: 10,
    });
  });

  it("maps the rpc payload to the legacy stats shape", async () => {
    const { supabase } = buildRpcMock({
      daily: [
        { day: "2024-01-01", count: 2 },
        { day: "2024-01-02", count: 1 },
      ],
      top_projects: [
        { slug: "alpha", views: 2 },
        { slug: "beta", views: 1 },
      ],
      top_posts: [{ slug: "alpha", title: "Alpha Post", views: 2 }],
      cv_downloads: 3,
      contact_clicks: 4,
      total_views: 5,
    });

    const stats = await fetchEventStats(supabase, 30);

    expect(stats).toEqual({
      pageViews: [
        { date: "2024-01-01", count: 2 },
        { date: "2024-01-02", count: 1 },
      ],
      topProjects: [
        { slug: "alpha", title: "alpha", views: 2 },
        { slug: "beta", title: "beta", views: 1 },
      ],
      topPosts: [{ slug: "alpha", title: "Alpha Post", views: 2 }],
      cvDownloads: 3,
      contactClicks: 4,
      totalViews: 5,
    });
  });

  it("returns the legacy empty shape when the rpc returns no data", async () => {
    const { supabase } = buildRpcMock(null);

    const stats = await fetchEventStats(supabase, 30);

    expect(stats).toEqual({
      pageViews: [],
      topProjects: [],
      topPosts: [],
      cvDownloads: 0,
      contactClicks: 0,
      totalViews: 0,
    });
  });

  it("routes rpc failures through @workspace/logging, not raw console.error", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { supabase } = buildRpcMock(null, new Error("relation does not exist"));

    const stats = await fetchEventStats(supabase, 30);

    // error flows through @workspace/logging's capture sink
    expect(capture).toHaveBeenCalledTimes(1);
    const [err, meta] = capture.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).message).toBe("[analytics_events.rpc] relation does not exist");
    expect(meta).toEqual({
      message: "analytics stats rpc failed",
      context: "[analytics_events.rpc]",
    });
    // failure degrades to the legacy empty shape (never throws)
    expect(stats).toEqual({
      pageViews: [],
      topProjects: [],
      topPosts: [],
      cvDownloads: 0,
      contactClicks: 0,
      totalViews: 0,
    });
    // the old implementation logged this exact pair directly via console.error
    expect(consoleError).not.toHaveBeenCalledWith(
      "[analytics] page_view query failed:",
      "relation does not exist",
    );
  });
});

// ─── fetchMessageStats ───────────────────────────────────────────────────────

describe("fetchMessageStats", () => {
  beforeEach(pinClock);

  it("aggregates via one analytics_message_stats rpc call (UTC window)", async () => {
    const { supabase, rpc, from } = buildRpcMock({ daily: [] });

    await fetchMessageStats(supabase);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("analytics_message_stats", { p_since: SINCE_30D });
    expect(from).not.toHaveBeenCalled();
  });

  it("maps the rpc payload to the legacy daily shape", async () => {
    const { supabase } = buildRpcMock({
      daily: [
        { day: "2024-01-01", total: 2, unread: 1 },
        { day: "2024-01-02", total: 1, unread: 1 },
      ],
    });

    const stats = await fetchMessageStats(supabase, 30);

    expect(stats).toEqual([
      { date: "2024-01-01", total: 2, unread: 1 },
      { date: "2024-01-02", total: 1, unread: 1 },
    ]);
  });

  it("returns [] and logs via @workspace/logging when the rpc fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { supabase } = buildRpcMock(null, new Error("permission denied"));

    const stats = await fetchMessageStats(supabase, 30);

    expect(stats).toEqual([]);
    expect(capture).toHaveBeenCalledTimes(1);
    const [err] = capture.mock.calls[0];
    expect((err as Error).message).toBe("[messages.rpc] permission denied");
    expect(consoleError).not.toHaveBeenCalledWith(
      "[analytics] messages query failed:",
      "permission denied",
    );
  });
});

// ─── exported constants ──────────────────────────────────────────────────────

describe("stats constants", () => {
  it("top-N is a named const of 10 (was a magic slice(0, 10))", () => {
    expect(TOP_N).toBe(10);
  });

  it("keeps the legacy MAX_STAT_ROWS export (public surface unchanged)", () => {
    expect(MAX_STAT_ROWS).toBe(50_000);
  });
});
