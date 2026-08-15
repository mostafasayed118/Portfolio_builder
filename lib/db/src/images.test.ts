import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { listEntityImages } from "./images";

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
