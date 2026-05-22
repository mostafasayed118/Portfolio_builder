import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  listSkills,
  listSkillsByCategory,
  createSkill,
  updateSkill,
  deleteSkill,
} from "./skills";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("listSkills", () => {
  it("selects non-deleted skills ordered by sort_order", async () => {
    const rows = [
      { id: "1", name: "TS", category: "frontend", sort_order: 1 },
      { id: "2", name: "Go", category: "backend", sort_order: 2 },
    ];
    // Terminal method in the chain is .order() — override to resolve
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listSkills(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("skills");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws when supabase returns an error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("db down") });

    await expect(listSkills(supabase as any)).rejects.toThrow("db down");
  });
});

describe("listSkillsByCategory", () => {
  it("filters by category in addition to soft-delete check", async () => {
    const rows = [{ id: "1", name: "React", category: "frontend", sort_order: 1 }];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listSkillsByCategory(supabase as any, "frontend");

    expect(supabase.eq).toHaveBeenCalledWith("category", "frontend");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toEqual(rows);
  });

  it("throws when supabase returns an error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("fail") });

    await expect(listSkillsByCategory(supabase as any, "x")).rejects.toThrow("fail");
  });
});

describe("createSkill", () => {
  it("inserts skill and returns the new id", async () => {
    supabase.single.mockResolvedValue({
      data: { id: "new-skill-id" },
      error: null,
    });

    const id = await createSkill(supabase as any, {
      name: "Rust",
      category: "backend",
      proficiency: 80,
      icon: "rust-logo",
      sort_order: 5,
      is_visible: true,
    });

    expect(supabase.from).toHaveBeenCalledWith("skills");
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Rust",
        category: "backend",
        proficiency: 80,
        icon: "rust-logo",
        sort_order: 5,
        is_visible: true,
      }),
    );
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(id).toBe("new-skill-id");
  });

  it("defaults icon to null when omitted", async () => {
    supabase.single.mockResolvedValue({ data: { id: "id-2" }, error: null });

    await createSkill(supabase as any, {
      name: "CSS",
      category: "frontend",
      proficiency: 90,
      sort_order: 1,
      is_visible: true,
    });

    const insertArg = supabase.insert.mock.calls[0][0];
    expect(insertArg.icon).toBeNull();
  });

  it("throws on insert error", async () => {
    supabase.single.mockResolvedValue({
      data: null,
      error: new Error("duplicate"),
    });

    await expect(
      createSkill(supabase as any, {
        name: "X",
        category: "y",
        proficiency: 50,
        sort_order: 0,
        is_visible: true,
      }),
    ).rejects.toThrow("duplicate");
  });
});

describe("updateSkill", () => {
  it("updates the skill with updated_at timestamp", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await updateSkill(supabase as any, "skill-1", { name: "TS++" });

    expect(supabase.from).toHaveBeenCalledWith("skills");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "TS++", updated_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "skill-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("not found") });

    await expect(
      updateSkill(supabase as any, "bad-id", { name: "x" }),
    ).rejects.toThrow("not found");
  });
});

describe("deleteSkill", () => {
  it("soft-deletes by setting deleted_at", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await deleteSkill(supabase as any, "skill-1");

    expect(supabase.from).toHaveBeenCalledWith("skills");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "skill-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("fail") });

    await expect(deleteSkill(supabase as any, "x")).rejects.toThrow("fail");
  });
});
