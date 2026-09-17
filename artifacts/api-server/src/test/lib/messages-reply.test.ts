import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSupabaseClient } from "../../lib/supabase-client";
import { replyToMessage, replySchema } from "../../lib/messages/reply";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";

vi.mocked(getSupabaseClient).mockReset();

const row = {
  id: "m-1",
  name: "Jane Doe",
  email: "jane@example.com",
  message: "Hello there",
  subject: "Hi",
};

const superadminReq = {
  user: { id: "s-1", email: "a@b.c", role: "superadmin" },
  query: {},
} as unknown as AuthenticatedRequest;

function adminReq(id: string): AuthenticatedRequest {
  return {
    supabase: getSupabaseClient(),
    user: { id, email: "a@b.c", role: "admin" },
    query: {},
  } as unknown as AuthenticatedRequest;
}

/** Fresh supabase double: one fluent chain serving fetch (maybeSingle) and update. */
function makeSupabase(opts: {
  row?: Record<string, unknown> | null;
  fetchError?: unknown;
  updateError?: unknown;
} = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => ({
      data: opts.row === undefined ? row : opts.row,
      error: opts.fetchError ?? null,
    })),
    error: opts.updateError ?? null,
  };
  const supabase = { from: vi.fn(() => chain) };
  vi.mocked(getSupabaseClient).mockReturnValue(supabase as never);
  superadminReq.supabase = getSupabaseClient();
  return { chain, supabase };
}

const sendReply = vi.fn(async (_input: {
  to: string;
  recipientName: string;
  reply: string;
  originalSubject?: string | null;
  quoted?: string;
}) => true);

describe("replySchema", () => {
  it("preserves the exact field error messages", () => {
    const empty = replySchema.safeParse({ reply: "" });
    expect(empty.success).toBe(false);
    if (!empty.success) {
      expect(empty.error.flatten().fieldErrors.reply).toEqual(["Reply is required"]);
    }

    const tooLong = replySchema.safeParse({ reply: "x".repeat(5001) });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      expect(tooLong.error.flatten().fieldErrors.reply).toEqual(["Reply is too long"]);
    }
  });

  it("trims whitespace around the reply", () => {
    const parsed = replySchema.safeParse({ reply: "  hello  " });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.reply).toBe("hello");
  });
});

describe("replyToMessage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeSupabase();
    sendReply.mockResolvedValue(true);
  });

  it("invalid body → invalid_body with the exact field errors", async () => {
    const result = await replyToMessage(superadminReq, "m-1", { reply: "" }, sendReply);
    expect(result).toEqual({
      ok: false,
      kind: "invalid_body",
      fieldErrors: { reply: ["Reply is required"] },
    });
    expect(sendReply).not.toHaveBeenCalled();
  });

  it("fetch error → db_error with a sanitized message (raw message never surfaces)", async () => {
    makeSupabase({ fetchError: { message: "secret table internal detail" } });
    const result = await replyToMessage(superadminReq, "m-1", { reply: "ok" }, sendReply);
    expect(result).toEqual({ ok: false, kind: "db_error", message: "Internal server error" });
    expect(sendReply).not.toHaveBeenCalled();
  });

  it("message not found → not_found with the exact message", async () => {
    makeSupabase({ row: null });
    const result = await replyToMessage(superadminReq, "m-1", { reply: "ok" }, sendReply);
    expect(result).toEqual({ ok: false, kind: "not_found", message: "Message not found" });
    expect(sendReply).not.toHaveBeenCalled();
  });

  it("update error → db_error with a sanitized message, no mail sent", async () => {
    makeSupabase({ updateError: { code: "42501", message: "RLS denied" } });
    const result = await replyToMessage(superadminReq, "m-1", { reply: "ok" }, sendReply);
    expect(result).toEqual({
      ok: false,
      kind: "db_error",
      message: "You do not have permission to perform that action.",
    });
    expect(sendReply).not.toHaveBeenCalled();
  });

  it("success persists draft + replied_at + read status, then emails the sender", async () => {
    const { chain } = makeSupabase();
    const result = await replyToMessage(superadminReq, "m-1", { reply: "Here you go" }, sendReply);

    expect(result).toEqual({ ok: true, sent: true });
    expect(chain.update).toHaveBeenCalledWith({
      reply_email_draft: "Here you go",
      replied_at: expect.any(String),
      status: "read",
    });
    expect(sendReply).toHaveBeenCalledTimes(1);
    expect(sendReply).toHaveBeenCalledWith({
      to: "jane@example.com",
      recipientName: "Jane Doe",
      reply: "Here you go",
      originalSubject: "Hi",
      quoted: "Hello there",
    });
  });

  it("propagates a false sent value (SMTP not configured)", async () => {
    makeSupabase();
    sendReply.mockResolvedValue(false);
    const result = await replyToMessage(superadminReq, "m-1", { reply: "ok" }, sendReply);
    expect(result).toEqual({ ok: true, sent: false });
  });

  it("fetch and update rely on request-client RLS without retired user filters", async () => {
    const { chain } = makeSupabase();
    await replyToMessage(adminReq("a-1"), "m-1", { reply: "ok" }, sendReply);
    expect(chain.eq.mock.calls).toEqual([["id", "m-1"], ["id", "m-1"]]);
    expect(chain.or).not.toHaveBeenCalled();
  });
});
