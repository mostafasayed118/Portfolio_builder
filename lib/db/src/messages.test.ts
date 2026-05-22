import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  listMessages,
  unreadCount,
  sendMessage,
  markMessageRead,
  markAllMessagesRead,
  deleteMessage,
  replyToMessage,
} from "./messages";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("listMessages", () => {
  it("selects non-deleted messages ordered by created_at descending", async () => {
    const rows = [
      { id: "1", name: "Alice", email: "a@b.com", message: "Hi", created_at: "2024-02-01" },
      { id: "2", name: "Bob", email: "b@c.com", message: "Hey", created_at: "2024-01-01" },
    ];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listMessages(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("messages");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("db error") });

    await expect(listMessages(supabase as any)).rejects.toThrow("db error");
  });
});

describe("unreadCount", () => {
  it("returns count of unread non-deleted messages", async () => {
    // unreadCount chain ends at .is() — override to return count
    supabase.is.mockResolvedValue({ count: 7, error: null });

    const count = await unreadCount(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("messages");
    expect(supabase.select).toHaveBeenCalledWith("*", { count: "exact", head: true });
    expect(supabase.eq).toHaveBeenCalledWith("status", "unread");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(count).toBe(7);
  });

  it("returns 0 when count is null", async () => {
    supabase.is.mockResolvedValue({ count: null, error: null });

    const count = await unreadCount(supabase as any);

    expect(count).toBe(0);
  });

  it("throws on error", async () => {
    supabase.is.mockResolvedValue({ count: null, error: new Error("fail") });

    await expect(unreadCount(supabase as any)).rejects.toThrow("fail");
  });
});

describe("sendMessage", () => {
  it("inserts message with status 'unread'", async () => {
    supabase.insert.mockResolvedValue({ error: null });

    await sendMessage(supabase as any, {
      name: "Alice",
      email: "alice@example.com",
      message: "Hello there!",
    });

    expect(supabase.from).toHaveBeenCalledWith("messages");
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice",
        email: "alice@example.com",
        message: "Hello there!",
        status: "unread",
        created_at: expect.any(String),
      }),
    );
  });

  it("throws on insert error", async () => {
    supabase.insert.mockResolvedValue({ error: new Error("insert failed") });

    await expect(
      sendMessage(supabase as any, { name: "A", email: "a@b.com", message: "m" }),
    ).rejects.toThrow("insert failed");
  });
});

describe("markMessageRead", () => {
  it("updates message status to 'read'", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await markMessageRead(supabase as any, "msg-1");

    expect(supabase.from).toHaveBeenCalledWith("messages");
    expect(supabase.update).toHaveBeenCalledWith({ status: "read" });
    expect(supabase.eq).toHaveBeenCalledWith("id", "msg-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("not found") });

    await expect(markMessageRead(supabase as any, "bad")).rejects.toThrow("not found");
  });
});

describe("markAllMessagesRead", () => {
  it("updates all unread messages to 'read'", async () => {
    // Chain is: update({status:"read"}).eq("status","unread")
    // The second eq is the terminal call
    const secondEq = vi.fn().mockResolvedValue({ error: null });
    supabase.eq
      .mockReturnValueOnce({ ...supabase, eq: secondEq })
      .mockReturnValueOnce({ error: null });

    await markAllMessagesRead(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("messages");
    expect(supabase.update).toHaveBeenCalledWith({ status: "read" });
    // First eq call
    expect(supabase.eq).toHaveBeenCalledWith("status", "unread");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("batch fail") });

    await expect(markAllMessagesRead(supabase as any)).rejects.toThrow("batch fail");
  });
});

describe("deleteMessage", () => {
  it("soft-deletes by setting deleted_at", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await deleteMessage(supabase as any, "msg-1");

    expect(supabase.from).toHaveBeenCalledWith("messages");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "msg-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("fail") });

    await expect(deleteMessage(supabase as any, "x")).rejects.toThrow("fail");
  });
});

describe("replyToMessage", () => {
  it("returns a mailto URL with subject and body", async () => {
    const result = await replyToMessage("test@test.com", "Hello", "Body");
    expect(result).toBe("mailto:test@test.com?subject=Hello&body=Body");
  });

  it("encodes special characters in subject and body", async () => {
    const result = await replyToMessage("a@b.com", "Hello World", "Line 1\nLine 2");
    expect(result).toContain("mailto:a@b.com");
    expect(result).toContain("subject=Hello+World");
    expect(result).toContain("body=");
  });

  it("handles empty subject and body", async () => {
    const result = await replyToMessage("user@example.com", "", "");
    expect(result).toBe("mailto:user@example.com?subject=&body=");
  });
});
