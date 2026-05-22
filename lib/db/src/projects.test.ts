import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  listProjects,
  listPublishedProjects,
  createProject,
  updateProject,
  deleteProject,
  toggleProjectFeatured,
  fetchProjectBySlug,
} from "./projects";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

describe("listProjects", () => {
  it("selects non-deleted projects ordered by sort_order", async () => {
    const rows = [
      { id: "1", title: "A", slug: "a", sort_order: 1 },
      { id: "2", title: "B", slug: "b", sort_order: 2 },
    ];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listProjects(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.order).toHaveBeenCalledWith("sort_order", { ascending: true });
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("db error") });

    await expect(listProjects(supabase as any)).rejects.toThrow("db error");
  });
});

describe("listPublishedProjects", () => {
  it("filters to published and non-deleted projects", async () => {
    const rows = [{ id: "1", title: "Published", is_published: true }];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listPublishedProjects(supabase as any);

    expect(supabase.eq).toHaveBeenCalledWith("is_published", true);
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("fail") });

    await expect(listPublishedProjects(supabase as any)).rejects.toThrow("fail");
  });
});

describe("createProject", () => {
  it("inserts project with sanitized URLs and returns id", async () => {
    supabase.single.mockResolvedValue({
      data: { id: "proj-1" },
      error: null,
    });

    const id = await createProject(supabase as any, {
      title: "My Project",
      slug: "my-project",
      description: "A project",
      category: "web",
      featured: true,
      github_url: "https://github.com/example",
      live_url: "https://example.com",
      image_url: "https://img.example.com/pic.png",
    });

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "My Project",
        slug: "my-project",
        description: "A project",
        category: "web",
        featured: true,
        github_url: "https://github.com/example",
        live_url: "https://example.com",
        image_url: "https://img.example.com/pic.png",
      }),
    );
    expect(supabase.select).toHaveBeenCalledWith("id");
    expect(id).toBe("proj-1");
  });

  it("applies defaults for optional array fields", async () => {
    supabase.single.mockResolvedValue({ data: { id: "p2" }, error: null });

    await createProject(supabase as any, {
      title: "T",
      slug: "t",
      description: "D",
      category: "web",
      featured: false,
    });

    const insertArg = supabase.insert.mock.calls[0][0];
    expect(insertArg.tech_stack).toEqual([]);
    expect(insertArg.tags).toEqual([]);
    expect(insertArg.metrics).toEqual([]);
    expect(insertArg.is_published).toBe(false);
    expect(insertArg.sort_order).toBe(0);
  });

  it("sanitizes empty/null URLs to null", async () => {
    supabase.single.mockResolvedValue({ data: { id: "p3" }, error: null });

    await createProject(supabase as any, {
      title: "T",
      slug: "t",
      description: "D",
      category: "web",
      featured: false,
      github_url: "#",
      live_url: "",
      image_url: undefined,
    });

    const insertArg = supabase.insert.mock.calls[0][0];
    expect(insertArg.github_url).toBeNull();
    expect(insertArg.live_url).toBeNull();
    expect(insertArg.image_url).toBeNull();
  });

  it("throws on insert error", async () => {
    supabase.single.mockResolvedValue({
      data: null,
      error: new Error("slug conflict"),
    });

    await expect(
      createProject(supabase as any, {
        title: "T",
        slug: "dup",
        description: "D",
        category: "web",
        featured: false,
      }),
    ).rejects.toThrow("slug conflict");
  });
});

describe("updateProject", () => {
  it("updates project with updated_at timestamp", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await updateProject(supabase as any, "proj-1", { title: "Updated" });

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Updated", updated_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "proj-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("not found") });

    await expect(
      updateProject(supabase as any, "bad", { title: "x" }),
    ).rejects.toThrow("not found");
  });
});

describe("deleteProject", () => {
  it("soft-deletes by setting deleted_at", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await deleteProject(supabase as any, "proj-1");

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "proj-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("fail") });

    await expect(deleteProject(supabase as any, "x")).rejects.toThrow("fail");
  });
});

describe("toggleProjectFeatured", () => {
  it("updates featured flag and updated_at", async () => {
    supabase.eq.mockResolvedValue({ error: null });

    await toggleProjectFeatured(supabase as any, "proj-1", true);

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ featured: true, updated_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "proj-1");
  });

  it("throws on error", async () => {
    supabase.eq.mockResolvedValue({ error: new Error("fail") });

    await expect(toggleProjectFeatured(supabase as any, "x", true)).rejects.toThrow("fail");
  });
});

describe("fetchProjectBySlug", () => {
  it("queries by slug, published, and non-deleted, returns maybeSingle result", async () => {
    const project = { id: "1", slug: "my-app", is_published: true };
    supabase.maybeSingle.mockResolvedValue({ data: project, error: null });

    const result = await fetchProjectBySlug(supabase as any, "my-app");

    expect(supabase.from).toHaveBeenCalledWith("projects");
    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.eq).toHaveBeenCalledWith("slug", "my-app");
    expect(supabase.eq).toHaveBeenCalledWith("is_published", true);
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.maybeSingle).toHaveBeenCalled();
    expect(result).toEqual(project);
  });

  it("returns null when no project matches", async () => {
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await fetchProjectBySlug(supabase as any, "nonexistent");

    expect(result).toBeNull();
  });

  it("throws on error", async () => {
    supabase.maybeSingle.mockResolvedValue({
      data: null,
      error: new Error("query failed"),
    });

    await expect(fetchProjectBySlug(supabase as any, "x")).rejects.toThrow("query failed");
  });
});
