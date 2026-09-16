import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { collectionQuery, collectionMutate, COLLECTION_TABLES } from "./collection";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("COLLECTION_TABLES", () => {
  it("contains exactly the admin CMS collection tables", () => {
    expect([...COLLECTION_TABLES].sort()).toEqual([
      "blog_posts",
      "certifications",
      "experience",
      "messages",
      "projects",
      "section_settings",
      "skills",
      "theme_presets",
    ]);
  });
});

describe("collectionQuery", () => {
  it("rejects a table outside the allowlist", async () => {
    await expect(
      collectionQuery(supabase as any, "users", { limit: 10, offset: 0 }),
    ).rejects.toThrow('[collection] table "users" is not in the collection allowlist');
  });

  it("selects with exact count, applies soft-delete, order and range", async () => {
    const rows = [{ id: "1" }, { id: "2" }];
    supabase.returns.mockResolvedValueOnce({ data: rows, count: 42, error: null });

    const result = await collectionQuery(supabase as any, "projects", {
      softDelete: true,
      orderBy: "sort_order",
      orderAsc: false,
      limit: 10,
      offset: 20,
    });

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.select).toHaveBeenCalledWith("*", { count: "exact" });
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: false });
    expect(supabase.range).toHaveBeenCalledWith(20, 29);
    expect(result).toEqual({ data: rows, count: 42 });
  });

  it("scopes to the target user with includeOrphans via a single or() filter", async () => {
    supabase.returns.mockResolvedValueOnce({ data: [], count: 0, error: null });

    await collectionQuery(supabase as any, "messages", {
      targetUserId: "user-1",
      includeOrphans: true,
      limit: 10,
      offset: 0,
    });

    expect(supabase.or).toHaveBeenCalledWith("user_id.eq.user-1,user_id.is.null");
  });

  it("applies the only-soft-delete mode via not(deleted_at, is, null)", async () => {
    supabase.returns.mockResolvedValueOnce({ data: [], count: 0, error: null });

    await collectionQuery(supabase as any, "messages", {
      softDelete: "only",
      limit: 10,
      offset: 0,
    });

    expect(supabase.not).toHaveBeenCalledWith("deleted_at", "is", null);
  });

  it("throws on error", async () => {
    supabase.returns.mockResolvedValueOnce({ data: null, count: null, error: new Error("db down") });

    await expect(
      collectionQuery(supabase as any, "skills", { limit: 10, offset: 0 }),
    ).rejects.toThrow("db down");
  });
});

describe("collectionMutate", () => {
  it("inserts the row and resolves null", async () => {
    supabase.insert.mockResolvedValueOnce({ data: null, error: null });

    const result = await collectionMutate(supabase as any, "skills", {
      action: "insert",
      row: { name: "React", user_id: "user-1" },
    });

    expect(supabase.from).toHaveBeenCalledWith("skills");
    expect(supabase.insert).toHaveBeenCalledWith({ name: "React", user_id: "user-1" });
    expect(result).toBeNull();
  });

  it("updates scoped by id and returns the matched rows", async () => {
    supabase.select.mockResolvedValueOnce({ data: [{ id: "p1" }], error: null });

    const result = await collectionMutate(supabase as any, "projects", {
      action: "update",
      id: "p1",
      patch: { name: "New" },
    });

    expect(supabase.update).toHaveBeenCalledWith({ name: "New" });
    expect(supabase.eq).toHaveBeenNthCalledWith(1, "id", "p1");
    expect(supabase.eq).toHaveBeenCalledTimes(1);
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(result).toEqual([{ id: "p1" }]);
  });

  it("additionally scopes the update by user when userId is set (theme_presets)", async () => {
    supabase.select.mockResolvedValueOnce({ data: [], error: null });

    const result = await collectionMutate(supabase as any, "theme_presets", {
      action: "update",
      id: "p1",
      patch: { name: "New" },
      userId: "user-1",
    });

    expect(supabase.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
    expect(result).toEqual([]);
  });

  it("rejects a table outside the allowlist", async () => {
    await expect(
      collectionMutate(supabase as any, "audit_logs", { action: "insert", row: {} }),
    ).rejects.toThrow("not in the collection allowlist");
  });

  it("throws on error", async () => {
    supabase.insert.mockResolvedValueOnce({ data: null, error: new Error("write failed") });

    await expect(
      collectionMutate(supabase as any, "skills", { action: "insert", row: {} }),
    ).rejects.toThrow("write failed");
  });
});
