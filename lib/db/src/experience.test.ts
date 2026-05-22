import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  listExperience,
  createExperience,
  updateExperience,
  deleteExperience,
} from "./experience";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("listExperience", () => {
  it("selects non-deleted experience ordered by sort_order", async () => {
    const rows = [
      { id: "1", title: "Dev", company: "Acme", sort_order: 1 },
      { id: "2", title: "Lead", company: "Beta", sort_order: 2 },
    ];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listExperience(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("experience");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("db error") });

    await expect(listExperience(supabase as any)).rejects.toThrow("db error");
  });
});

describe("createExperience", () => {
  it("inserts experience with provided values and returns id", async () => {
    supabase.single.mockResolvedValue({
      data: { id: "exp-1" },
      error: null,
    });

    const id = await createExperience(supabase as any, {
      title: "Software Engineer",
      company: "Acme Corp",
      location: "Remote",
      period: "2023 - 2024",
      description: ["Built things"],
      technologies: ["TypeScript", "React"],
      type: "internship",
      sort_order: 1,
      is_published: true,
      current: false,
    });

    expect(supabase.from).toHaveBeenCalledWith("experience");
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Software Engineer",
        company: "Acme Corp",
        location: "Remote",
        period: "2023 - 2024",
        description: ["Built things"],
        technologies: ["TypeScript", "React"],
        type: "internship",
        sort_order: 1,
        is_published: true,
        current: false,
      }),
    );
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(id).toBe("exp-1");
  });

  it("applies defaults for optional fields", async () => {
    supabase.single.mockResolvedValue({ data: { id: "exp-2" }, error: null });

    await createExperience(supabase as any, {
      title: "Dev",
      company: "Acme",
    });

    const insertArg = supabase.insert.mock.calls[0][0];
    expect(insertArg.location).toBe("");
    expect(insertArg.period).toBe("");
    expect(insertArg.description).toEqual([]);
    expect(insertArg.technologies).toEqual([]);
    expect(insertArg.type).toBe("internship");
    expect(insertArg.sort_order).toBe(0);
    expect(insertArg.is_published).toBe(true);
    expect(insertArg.current).toBe(false);
  });

  it("throws on insert error", async () => {
    supabase.single.mockResolvedValue({
      data: null,
      error: new Error("constraint violation"),
    });

    await expect(
      createExperience(supabase as any, { title: "T", company: "C" }),
    ).rejects.toThrow("constraint violation");
  });
});

describe("updateExperience", () => {
  it("updates experience with updated_at timestamp", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await updateExperience(supabase as any, "exp-1", { title: "Senior Dev" });

    expect(supabase.from).toHaveBeenCalledWith("experience");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Senior Dev", updated_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "exp-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("not found") });

    await expect(
      updateExperience(supabase as any, "bad-id", { title: "x" }),
    ).rejects.toThrow("not found");
  });
});

describe("deleteExperience", () => {
  it("soft-deletes by setting deleted_at", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await deleteExperience(supabase as any, "exp-1");

    expect(supabase.from).toHaveBeenCalledWith("experience");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "exp-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("fail") });

    await expect(deleteExperience(supabase as any, "x")).rejects.toThrow("fail");
  });
});
