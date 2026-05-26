import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import request from "supertest";
import app from "../../app";
import { resetHealthCache } from "../../routes/health";

const { mockSupabaseClient } = vi.hoisted(() => {
  const m = {
    from: vi.fn(),
    select: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
  };
  m.from.mockReturnValue(m);
  m.select.mockReturnValue(m);
  m.limit.mockReturnValue(m);
  return { mockSupabaseClient: m };
});

vi.mock("../../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(() => mockSupabaseClient),
  getPublicSupabaseClient: vi.fn(() => mockSupabaseClient),
  resetSupabaseClient: vi.fn(),
}));

function resetMocks() {
  // Clear call history
  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.select.mockClear();
  mockSupabaseClient.limit.mockClear();
  mockSupabaseClient.single.mockReset();

  // Re-establish chain defaults
  mockSupabaseClient.from.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.select.mockReturnValue(mockSupabaseClient);
  mockSupabaseClient.limit.mockReturnValue(mockSupabaseClient);

  // Default: ping returns success (site_settings has one row)
  mockSupabaseClient.single.mockResolvedValue({ data: { id: 1 }, error: null });
}

beforeEach(() => {
  resetHealthCache(); // Clear module-level cache between tests
  resetMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/v1/healthz", () => {
  it("returns 200 with correct response shape when DB is healthy", async () => {
    const res = await request(app).get("/api/v1/healthz");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("uptime");
    expect(res.body).toHaveProperty("db");
    expect(res.body).toHaveProperty("api");
    expect(res.body.db).toHaveProperty("status", "ok");
    expect(res.body.db).toHaveProperty("latency_ms");
    expect(typeof res.body.db.latency_ms).toBe("number");
    expect(res.body.api).toHaveProperty("status", "ok");
    expect(res.body.api).toHaveProperty("response_ms");
    expect(typeof res.body.api.response_ms).toBe("number");
  });

  it("caches response and returns cached result on second request within TTL", async () => {
    // First request — cold cache, hits DB
    const res1 = await request(app).get("/api/v1/healthz");
    expect(res1.status).toBe(200);
    expect(mockSupabaseClient.from).toHaveBeenCalledOnce();

    // Second request — within 5s cache window, should return cached data
    mockSupabaseClient.from.mockClear();
    const res2 = await request(app).get("/api/v1/healthz");
    expect(res2.status).toBe(200);
    // Cache hit — from() should NOT have been called again
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();

    // Response should still have the full shape
    expect(res2.body).toHaveProperty("status", "ok");
    expect(res2.body).toHaveProperty("db");
    expect(res2.body).toHaveProperty("api");
  });

  it("re-fetches from DB after cache expires (5s TTL)", async () => {
    vi.useFakeTimers();

    // First request — cold cache, populates cache
    const res1 = await request(app).get("/api/v1/healthz");
    expect(res1.status).toBe(200);
    expect(mockSupabaseClient.from).toHaveBeenCalledOnce();

    // Advance past the 5-second cache TTL
    mockSupabaseClient.from.mockClear();
    vi.advanceTimersByTime(6000);

    // Second request — cache expired, should call DB again
    const res2 = await request(app).get("/api/v1/healthz");
    expect(res2.status).toBe(200);
    expect(mockSupabaseClient.from).toHaveBeenCalledOnce();

    vi.useRealTimers();
  });

  it("returns 503 with degraded status when DB ping returns error", async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: { message: "connection timeout" } });

    const res = await request(app).get("/api/v1/healthz");

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty("status", "degraded");
    expect(res.body.db).toHaveProperty("status", "error");
    expect(res.body.api).toHaveProperty("status", "ok");
  });

  it("returns 503 with degraded status when ping throws", async () => {
    mockSupabaseClient.single.mockRejectedValue(new Error("DB unreachable"));

    const res = await request(app).get("/api/v1/healthz");

    expect(res.status).toBe(503);
    expect(res.body).toHaveProperty("status", "degraded");
    expect(res.body.db).toHaveProperty("status", "error");
  });

  it("caches degraded status and returns 503 from cache", async () => {
    // First request — DB error, cached as degraded
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: { message: "timeout" } });
    const res1 = await request(app).get("/api/v1/healthz");
    expect(res1.status).toBe(503);
    expect(res1.body.status).toBe("degraded");
    expect(mockSupabaseClient.from).toHaveBeenCalledOnce();

    // Second request within TTL — should return cached degraded state
    mockSupabaseClient.from.mockClear();
    const res2 = await request(app).get("/api/v1/healthz");
    expect(res2.status).toBe(503);
    expect(res2.body.status).toBe("degraded");
    // Cache hit — no new DB call
    expect(mockSupabaseClient.from).not.toHaveBeenCalled();
  });
});
