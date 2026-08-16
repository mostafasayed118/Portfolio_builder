import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { getSupabaseClient } from "../lib/supabase-client";
import { flagSpamIfNeeded } from "../lib/ai/spam";

// Bypass the express rate limiters for these route-level unit tests — the
// limiters have their own dedicated test file (middleware/rateLimiter.test.ts).
// Without this, the contact route's 5 req/hour/IP limiter would 429 the later
// POSTs in this file and make the assertions order-dependent.
vi.mock("../middleware/rateLimiter", () => {
  const pass = (_req: unknown, _res: unknown, next: () => void) => next();
  return {
    generalLimiter: pass,
    contactLimiter: pass,
    adminLimiter: pass,
    imageMetadataLimiter: pass,
    imageUploadLimiter: pass,
    apiKeyLimiter: pass,
    chatLimiter: pass,
  };
});

// Controllable Supabase client so tests can exercise the insert error paths
// (the shared setup mock always resolves insert with a null error).
vi.mock("../lib/supabase-client", () => ({
  getSupabaseClient: vi.fn(),
}));

vi.mock("../lib/ai/spam", () => ({
  flagSpamIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

/** Build a minimal supabase client whose `.from().insert()` resolves to the given value. */
function clientWithInsertResult(insertResult: unknown) {
  return {
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(insertResult),
        }),
      }),
    }),
  } as never;
}

describe("POST /api/v1/contact", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    // Default: insert succeeds.
    vi.mocked(getSupabaseClient).mockReturnValue(
      clientWithInsertResult({ data: { id: "msg-1" }, error: null }),
    );
  });

  it("rejects missing name", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ email: "test@example.com", message: "Hello world!" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "invalid", message: "Hello world!" });
    expect(res.status).toBe(400);
  });

  it("rejects short message", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "test@example.com", message: "Short" });
    expect(res.status).toBe(400);
  });

  it("accepts valid contact submission", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content" });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it("triggers AI spam scoring when opt-in is enabled", async () => {
    vi.stubEnv("AI_SPAM_ENABLED", "true");
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.mocked(flagSpamIfNeeded).mockClear();

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content" });
    expect(res.status).toBe(200);
    expect(flagSpamIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ id: "msg-1", email: "test@example.com" }),
    );
  });

  it("returns 429 with a friendly message when the DB per-email spam guard rejects the insert", async () => {
    // The trigger in migration 044_contact_spam_guard.sql raises exactly this
    // message once an email exceeds 5 messages in an hour.
    vi.mocked(getSupabaseClient).mockReturnValue(
      clientWithInsertResult({
        data: null,
        error: { message: "Rate limit exceeded: too many messages from this email" },
      }),
    );

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content" });
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ success: false, message: "Too many messages sent, please try again later" });
  });

  it("still returns 500 for genuine insert failures", async () => {
    vi.mocked(getSupabaseClient).mockReturnValue(
      clientWithInsertResult({ data: null, error: { message: "connection refused" } }),
    );

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: "Failed to send message" });
  });
});
