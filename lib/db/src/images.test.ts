import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { MAX_LIST_ROWS } from "./query";
import { listEntityImages, listCoversByEntity, listImageOwnership, setImageSortOrder, getImageMetadataById, getImageDeleteTarget, deleteImageMetadata } from "./images";

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
    // Chain: .order("sort_order") → .order("created_at") → .limit (terminal).
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockImplementationOnce(() => supabase);
    supabase.limit.mockResolvedValueOnce({ data: rows, error: null });

    const result = await listEntityImages(supabase as any, "projects", "proj-1");

    expect(supabase.from).toHaveBeenCalledWith("image_metadata");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.eq).toHaveBeenCalledWith("entity_type", "projects");
    expect(supabase.eq).toHaveBeenCalledWith("entity_id", "proj-1");
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(supabase.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(supabase.limit).toHaveBeenCalledWith(MAX_LIST_ROWS);
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockImplementationOnce(() => supabase);
    supabase.limit.mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(
      listEntityImages(supabase as any, "projects", "proj-1"),
    ).rejects.toThrow("db down");
  });
});

describe("listCoversByEntity", () => {
  it("returns the first image (lowest sort_order) per entity in one query, capped at MAX_LIST_ROWS", async () => {
    const rows = [
      { id: "a1", entity_id: "proj-a", storage_path: "projects/x/a-cover.jpg", sort_order: 0 },
      { id: "a2", entity_id: "proj-a", storage_path: "projects/x/a-second.jpg", sort_order: 1 },
      { id: "b1", entity_id: "proj-b", storage_path: "projects/x/b-cover.jpg", sort_order: 0 },
    ];
    // Chain: .order("sort_order") → .order("created_at") → .limit (terminal).
    supabase.order
      .mockImplementationOnce(() => supabase)
      .mockImplementationOnce(() => supabase);
    supabase.limit.mockResolvedValueOnce({ data: rows, error: null });

    const result = await listCoversByEntity(supabase as any, "projects", ["proj-a", "proj-b"]);

    expect(supabase.from).toHaveBeenCalledWith("image_metadata");
    expect(supabase.eq).toHaveBeenCalledWith("entity_type", "projects");
    expect(supabase.in).toHaveBeenCalledWith("entity_id", ["proj-a", "proj-b"]);
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(supabase.order).toHaveBeenCalledWith("created_at", { ascending: true });
    expect(supabase.limit).toHaveBeenCalledWith(MAX_LIST_ROWS);
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
      .mockImplementationOnce(() => supabase);
    supabase.limit.mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(
      listCoversByEntity(supabase as any, "projects", ["proj-a"]),
    ).rejects.toThrow("db down");
  });
});

describe("listImageOwnership", () => {
  it("selects id + user_id for the given ids", async () => {
    const rows = [
      { id: "img-1", user_id: "user-1" },
      { id: "img-2", user_id: null },
    ];
    supabase.in.mockResolvedValueOnce({ data: rows, error: null });

    const result = await listImageOwnership(supabase as any, ["img-1", "img-2"]);

    expect(supabase.from).toHaveBeenCalledWith("image_metadata");
    expect(supabase.select).toHaveBeenCalledWith("id, user_id");
    expect(supabase.in).toHaveBeenCalledWith("id", ["img-1", "img-2"]);
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.in.mockResolvedValueOnce({ data: null, error: new Error("db down") });

    await expect(listImageOwnership(supabase as any, ["img-1"])).rejects.toThrow("db down");
  });
});

describe("setImageSortOrder", () => {
  it("updates sort_order scoped to the id", async () => {
    supabase.eq.mockResolvedValueOnce({ data: null, error: null });

    await setImageSortOrder(supabase as any, "img-1", 3);

    expect(supabase.update).toHaveBeenCalledWith({ sort_order: 3 });
    expect(supabase.eq).toHaveBeenCalledWith("id", "img-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValueOnce({ data: null, error: new Error("write failed") });

    await expect(setImageSortOrder(supabase as any, "img-1", 0)).rejects.toThrow("write failed");
  });
});

describe("getImageMetadataById", () => {
  it("selects the public metadata columns and returns the single row", async () => {
    const row = {
      id: "img-1",
      original_filename: "a.png",
      mime_type: "image/png",
      file_size_bytes: 12,
      entity_type: "project",
      entity_id: "p1",
      created_at: "2026-01-01T00:00:00Z",
    };
    supabase.single.mockResolvedValueOnce({ data: row, error: null });

    const result = await getImageMetadataById(supabase as any, "img-1");

    expect(supabase.select).toHaveBeenCalledWith(
      "id, original_filename, mime_type, file_size_bytes, entity_type, entity_id, created_at",
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "img-1");
    expect(result).toEqual(row);
  });

  it("propagates the single() error when the row is missing", async () => {
    supabase.single.mockResolvedValueOnce({
      data: null,
      error: { message: "JSON object requested, multiple (or no) rows returned" },
    });

    await expect(getImageMetadataById(supabase as any, "missing")).rejects.toThrow();
  });
});

describe("getImageDeleteTarget", () => {
  it("selects storage_path, id, user_id", async () => {
    const row = { storage_path: "p/x.png", id: "img-1", user_id: "user-1" };
    supabase.single.mockResolvedValueOnce({ data: row, error: null });

    const result = await getImageDeleteTarget(supabase as any, "img-1");

    expect(supabase.select).toHaveBeenCalledWith("storage_path, id, user_id");
    expect(result).toEqual(row);
  });
});

describe("deleteImageMetadata", () => {
  it("deletes the row scoped to the id", async () => {
    supabase.eq.mockResolvedValueOnce({ data: null, error: null });

    await deleteImageMetadata(supabase as any, "img-1");

    expect(supabase.delete).toHaveBeenCalled();
    expect(supabase.eq).toHaveBeenCalledWith("id", "img-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValueOnce({ data: null, error: new Error("fk violation") });

    await expect(deleteImageMetadata(supabase as any, "img-1")).rejects.toThrow("fk violation");
  });
});
