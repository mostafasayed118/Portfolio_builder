import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { listEntityImages, listCoversByEntity } from "./images";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("listEntityImages", () => {
  it("queries image_metadata by entity and returns rows ordered by sort_order", async () => {
    const rows = [
      { id: "img-1", storage_path: "projects/abc/original.jpg", sort_order: 0 },
      { id: "img-2", storage_path: "projects/abc/original2.jpg", sort_order: 1 },
    ];
    // First .order() (sort_order) keeps the chain; second (created_at) is terminal.
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockResolvedValueOnce({ data: rows, error: null });

    const result = await listEntityImages(supabase as any, "projects", "proj-1");

    expect(supabase.from).toHaveBeenCalledWith("image_metadata");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.eq).toHaveBeenCalledWith("entity_type", "projects");
    expect(supabase.eq).toHaveBeenCalledWith("entity_id", "proj-1");
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(supabase.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(
      listEntityImages(supabase as any, "projects", "proj-1"),
    ).rejects.toThrow("db down");
  });
});

describe("listCoversByEntity", () => {
  it("returns the first image (lowest sort_order) per entity in one query", async () => {
    const rows = [
      { id: "a1", entity_id: "proj-a", storage_path: "projects/x/a-cover.jpg", sort_order: 0 },
      { id: "a2", entity_id: "proj-a", storage_path: "projects/x/a-second.jpg", sort_order: 1 },
      { id: "b1", entity_id: "proj-b", storage_path: "projects/x/b-cover.jpg", sort_order: 0 },
    ];
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockResolvedValueOnce({ data: rows, error: null });

    const result = await listCoversByEntity(supabase as any, "projects", ["proj-a", "proj-b"]);

    expect(supabase.from).toHaveBeenCalledWith("image_metadata");
    expect(supabase.eq).toHaveBeenCalledWith("entity_type", "projects");
    expect(supabase.in).toHaveBeenCalledWith("entity_id", ["proj-a", "proj-b"]);
    // Exactly one cover per entity, and it's the lowest sort_order one.
    expect(result).toEqual([
      { id: "a1", entity_id: "proj-a", storage_path: "projects/x/a-cover.jpg", sort_order: 0 },
      { id: "b1", entity_id: "proj-b", storage_path: "projects/x/b-cover.jpg", sort_order: 0 },
    ]);
  });

  it("returns [] without querying when no entity ids are given", async () => {
    const result = await listCoversByEntity(supabase as any, "projects", []);
    expect(result).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("throws on error", async () => {
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(
      listCoversByEntity(supabase as any, "projects", ["proj-a"]),
    ).rejects.toThrow("db down");
  });
});
