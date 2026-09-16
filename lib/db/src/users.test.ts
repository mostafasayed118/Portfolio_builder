import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { USER_COLUMNS, listUsers, updateUserRole } from "./users";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

const ROW = {
  id: "u-1",
  clerk_id: "clerk_1",
  email: "a@b.com",
  name: "Alice",
  role: "superadmin",
  created_at: "2026-01-01T00:00:00Z",
};

describe("listUsers", () => {
  it("selects USER_COLUMNS with exact count, ordered by created_at descending", async () => {
    supabase.range.mockResolvedValue({ data: [ROW], count: 1, error: null });

    const result = await listUsers(supabase as any, { limit: 50, offset: 0 });

    expect(supabase.from).toHaveBeenCalledWith("users");
    expect(supabase.select).toHaveBeenCalledWith(USER_COLUMNS, { count: "exact" });
    expect(supabase.order).toHaveBeenCalledWith("created_at", { ascending: false });
    expect(result).toEqual({ rows: [ROW], count: 1 });
  });

  it("ranges over offset..offset+limit-1 for pagination", async () => {
    supabase.range.mockResolvedValue({ data: [], count: 0, error: null });

    await listUsers(supabase as any, { limit: 10, offset: 20 });

    expect(supabase.range).toHaveBeenCalledWith(20, 29);
  });

  it("returns empty rows and 0 count when data is null", async () => {
    supabase.range.mockResolvedValue({ data: null, count: null, error: null });

    const result = await listUsers(supabase as any, { limit: 50, offset: 0 });

    expect(result).toEqual({ rows: [], count: 0 });
  });

  it("throws on error", async () => {
    supabase.range.mockResolvedValue({ data: null, count: null, error: new Error("db error") });

    await expect(listUsers(supabase as any, { limit: 50, offset: 0 })).rejects.toThrow("db error");
  });
});

describe("updateUserRole", () => {
  it("updates the role and returns the matched rows", async () => {
    const updated = { ...ROW, role: "user" };
    supabase.select.mockResolvedValue({ data: [updated], count: null, error: null });

    const result = await updateUserRole(supabase as any, "u-1", "user");

    expect(supabase.from).toHaveBeenCalledWith("users");
    expect(supabase.update).toHaveBeenCalledWith({ role: "user" });
    expect(supabase.eq).toHaveBeenCalledWith("id", "u-1");
    expect(supabase.select).toHaveBeenCalledWith(USER_COLUMNS);
    expect(result).toEqual([updated]);
  });

  it("returns an empty array when no row matched the id", async () => {
    supabase.select.mockResolvedValue({ data: [], count: null, error: null });

    const result = await updateUserRole(supabase as any, "missing", "user");

    expect(result).toEqual([]);
  });

  it("throws on error", async () => {
    supabase.select.mockResolvedValue({ data: null, error: new Error("not found") });

    await expect(updateUserRole(supabase as any, "bad", "superadmin")).rejects.toThrow("not found");
  });
});
