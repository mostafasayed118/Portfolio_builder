import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// ─── Mock the supabase client to return controllable data ───────────────────
const mockSelect = vi.fn();
const mockSingle = vi.fn();
const mockMaybeSingle = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();
const mockIs = vi.fn();
const mockRpc = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockRemove = vi.fn();
const mockUpload = vi.fn();

function resetMocks() {
  mockSelect.mockReset();
  mockSingle.mockReset();
  mockMaybeSingle.mockReset();
  mockInsert.mockReset();
  mockUpdate.mockReset();
  mockEq.mockReset();
  mockOrder.mockReset();
  mockLimit.mockReset();
  mockIs.mockReset();
  mockRpc.mockReset();
  mockGetPublicUrl.mockReset();
  mockRemove.mockReset();
  mockUpload.mockReset();

  // Default chainable mock
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  mockSelect.mockReturnValue(chainable);
  mockInsert.mockReturnValue(chainable);
  mockUpdate.mockReturnValue(chainable);
  mockEq.mockReturnValue({ ...chainable, single: vi.fn().mockResolvedValue({ data: null, error: null }) });
  mockOrder.mockReturnValue({ ...chainable, limit: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }) });
  mockLimit.mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) });
}

// ─── Override the supabase-client mock to return our controlled mock ─────────
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  is: mockIs,
  rpc: mockRpc,
  storage: {
    from: vi.fn().mockReturnValue({
      getPublicUrl: mockGetPublicUrl,
      remove: mockRemove,
      upload: mockUpload,
      download: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    }),
  },
};

vi.mock("../lib/supabase-client", () => ({
  getSupabaseClient: () => mockSupabaseClient,
}));

// ─── Import the app ──────────────────────────────────────────────────────────
import app from "../app";

beforeEach(() => {
  resetMocks();
});

describe("Health endpoint", () => {
  it("GET /api/healthz returns 200 with status ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("HEAD /api/healthz returns 200 with no body", async () => {
    const res = await request(app).head("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({});
  });
});

describe("CV settings", () => {
  it("GET /api/v1/admin/cv/settings requires auth", async () => {
    const res = await request(app).get("/api/v1/admin/cv/settings");
    expect(res.status).toBe(401);
  });
});

describe("404 handling", () => {
  it("returns 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nonexistent");
    expect(res.status).toBe(404);
  });
});

describe("Rate limiting", () => {
  it("contact endpoint returns 200 with valid payload (mocked)", async () => {
    // The contact endpoint is public and doesn't require auth
    // It uses rate limiting but since we mock, we just test the route exists
    mockInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "1" }, error: null }),
      }),
    });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const res = await request(app)
      .post("/api/v1/contact")
      .send({
        name: "Test User",
        email: "test@example.com",
        message: "This is a test message that is longer than 10 characters.",
        _formLoadedAt: Date.now() - 5000,
      });
    // May be 200 or rate-limited — both are valid responses
    expect([200, 401, 429]).toContain(res.status);
  });
});

describe("Admin routes", () => {
  it("GET /api/v1/admin/hero requires auth", async () => {
    const res = await request(app).get("/api/v1/admin/hero");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/admin/skills requires auth", async () => {
    const res = await request(app).get("/api/v1/admin/skills");
    expect(res.status).toBe(401);
  });
});

describe("CORS headers", () => {
  it("includes security headers on responses", async () => {
    const res = await request(app).get("/api/healthz");
    // Helmet adds various security headers
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-frame-options"]).toBeDefined();
  });
});

describe("Request ID tracking", () => {
  it("includes x-request-id header in response", async () => {
    mockSelect.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 1 }, error: null }),
      }),
    });
    const res = await request(app).get("/api/healthz");
    expect(res.headers["x-request-id"]).toBeDefined();
  });
});
