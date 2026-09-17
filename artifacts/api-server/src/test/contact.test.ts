import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../app";
import { getAnonSupabaseClient, getSupabaseClient } from "../lib/supabase-client";

const { anonFactory, serviceFactory } = vi.hoisted(() => ({
  anonFactory: vi.fn(), serviceFactory: vi.fn(),
}));
const portfolioId = "11111111-1111-4111-8111-111111111111";
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
  getSupabaseClient: serviceFactory,
  getAnonSupabaseClient: anonFactory,
}));

vi.mock("../lib/ai/spam", () => ({
  flagSpamIfNeeded: vi.fn().mockResolvedValue(undefined),
}));

function clientWithInsertSpy(insertResult: unknown) {
  const single = vi.fn().mockResolvedValue(insertResult);
  const selectInserted = vi.fn().mockReturnValue({ single });
  const insert = vi.fn().mockReturnValue({
    ...Promise.resolve(insertResult),
    then: Promise.resolve(insertResult).then.bind(Promise.resolve(insertResult)),
    select: selectInserted,
  });
  const maybeSingle = vi.fn().mockResolvedValue({ data: { id: portfolioId }, error: null });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  const client = { from: vi.fn((table: string) => table === "public_portfolios" ? { select } : { insert }) };
  return { client, insert, selectInserted, order, eq, limit, maybeSingle };
}

function clientWithInsertResult(insertResult: unknown) {
  return clientWithInsertSpy(insertResult).client;
}

describe("POST /api/v1/contact", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-key");
    serviceFactory.mockReturnValue(clientWithInsertResult({ data: { id: "msg-1" }, error: null }));
    anonFactory.mockClear();
    anonFactory.mockReturnValue(
      clientWithInsertResult({ data: { id: "msg-1" }, error: null }),
    );
  });

  it("rejects missing name", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ email: "test@example.com", message: "Hello world!", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "invalid", message: "Hello world!", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(400);
  });

  it("rejects short message", async () => {
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test", email: "test@example.com", message: "Short", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(400);
  });

  it("accepts valid contact submission", async () => {
    const mock = clientWithInsertSpy({ data: null, error: null });
    anonFactory.mockReturnValue(mock.client);
    serviceFactory.mockClear();
    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(getAnonSupabaseClient).toHaveBeenCalled();
    expect(getSupabaseClient).not.toHaveBeenCalled();
    expect(mock.client.from).toHaveBeenCalledWith("public_portfolios");
    expect(mock.eq).toHaveBeenCalledWith("is_published", true);
    expect(mock.order).toHaveBeenCalledWith("slug", { ascending: true });
    expect(mock.limit).toHaveBeenCalledWith(1);
    expect(res.body.data.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mock.insert).toHaveBeenCalledWith(expect.objectContaining({
      id: res.body.data.id, portfolio_id: portfolioId, status: "unread",
    }));
    expect(mock.selectInserted).not.toHaveBeenCalled();
  });

  it.each([null, { id: 123 }])("rejects an unavailable portfolio %s", async (data) => {
    const mock = clientWithInsertSpy({ data: null, error: null });
    mock.maybeSingle.mockResolvedValue({ data, error: null });
    anonFactory.mockReturnValue(mock.client);
    const res = await request(app).post("/api/v1/contact").send({
      name: "Visitor", email: "visitor@example.com", message: "A valid contact message", _formLoadedAt: Date.now() - 5000,
    });
    expect(res.status).toBe(500);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("skips insertion when portfolio lookup fails", async () => {
    const mock = clientWithInsertSpy({ data: null, error: null });
    mock.maybeSingle.mockResolvedValue({ data: { id: portfolioId }, error: { message: "offline" } });
    anonFactory.mockReturnValue(mock.client);
    const res = await request(app).post("/api/v1/contact").send({
      name: "Visitor", email: "visitor@example.com", message: "A valid contact message", _formLoadedAt: Date.now() - 5000,
    });
    expect(res.status).toBe(500);
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it("silently drops submissions missing _formLoadedAt", async () => {
    // Real clients (ContactForm) always send this; absence signals a bot.
    const { client, insert } = clientWithInsertSpy({ data: { id: "msg-1" }, error: null });
    anonFactory.mockReturnValue(client);

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "A", email: "a@b.co", message: "hi there friend" }); // omit _formLoadedAt
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(insert).not.toHaveBeenCalled();
  });

  it("silently drops submissions with non-numeric _formLoadedAt", async () => {
    const { client, insert } = clientWithInsertSpy({ data: { id: "msg-1" }, error: null });
    anonFactory.mockReturnValue(client);

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "A", email: "a@b.co", message: "hi there friend", _formLoadedAt: "fast" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(insert).not.toHaveBeenCalled();
  });

  it("triggers AI spam scoring when opt-in is enabled", async () => {
    vi.stubEnv("AI_SPAM_ENABLED", "true");
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.mocked(flagSpamIfNeeded).mockClear();

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(200);
    expect(flagSpamIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({ id: res.body.data.id, email: "test@example.com" }),
    );
  });

  it("returns 429 with a friendly message when the DB per-email spam guard rejects the insert", async () => {
    // The trigger in migration 044_contact_spam_guard.sql raises exactly this
    // message once an email exceeds 5 messages in an hour.
    anonFactory.mockReturnValue(
      clientWithInsertResult({
        data: null,
        error: { message: "Rate limit exceeded: too many messages from this email" },
      }),
    );

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ success: false, message: "Too many messages sent, please try again later" });
  });

  it("still returns 500 for genuine insert failures", async () => {
    anonFactory.mockReturnValue(
      clientWithInsertResult({ data: null, error: { message: "connection refused" } }),
    );

    const res = await request(app)
      .post("/api/v1/contact")
      .send({ name: "Test User", email: "test@example.com", message: "This is a valid message with enough content", _formLoadedAt: Date.now() - 5000 });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ success: false, message: "Failed to send message" });
  });
});
