import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import {
  listPublishedPosts,
  listAllPosts,
  getPublishedPostBySlug,
  createPost,
  updatePost,
  deletePost,
} from "./posts";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

/** listPublishedPosts chains two .order() calls — first must return the builder. */
function resolveOnSecondOrder(rows: unknown, error: unknown = null) {
  let calls = 0;
  supabase.order.mockImplementation(() => {
    calls += 1;
    if (calls < 2) return supabase;
    return Promise.resolve({ data: rows, error });
  });
}

const LIST_COLUMNS =
  "id,slug,title,excerpt,cover_image_url,tags,is_published,published_at";

describe("listPublishedPosts", () => {
  it("selects card columns without the heavy content field", async () => {
    const rows = [
      { id: "1", slug: "a", title: "A", excerpt: "x", content: "SHOULD NOT LOAD" },
    ];
    resolveOnSecondOrder(rows);

    const result = await listPublishedPosts(supabase as never);

    expect(supabase.from).toHaveBeenCalledWith("blog_posts");
    expect(supabase.select).toHaveBeenCalledWith(LIST_COLUMNS);
    expect(supabase.eq).toHaveBeenCalledWith("is_published", true);
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toEqual(rows);
  });

  it("orders by published_at desc then created_at desc", async () => {
    resolveOnSecondOrder([]);

    await listPublishedPosts(supabase as never);

    expect(supabase.order).toHaveBeenNthCalledWith(1, "published_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(supabase.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
  });

  it("throws on error", async () => {
    resolveOnSecondOrder(null, new Error("db error"));

    await expect(listPublishedPosts(supabase as never)).rejects.toThrow("db error");
  });
});

describe("listAllPosts", () => {
  it("selects card columns for admin list (content only on detail)", async () => {
    const rows = [{ id: "1", title: "Draft", is_published: false }];
    supabase.order.mockResolvedValue({ data: rows, error: null });

    const result = await listAllPosts(supabase as never);

    expect(supabase.select).toHaveBeenCalledWith(LIST_COLUMNS);
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    supabase.order.mockResolvedValue({ data: null, error: new Error("fail") });

    await expect(listAllPosts(supabase as never)).rejects.toThrow("fail");
  });
});

describe("getPublishedPostBySlug", () => {
  it("keeps full row (content) for the detail view", async () => {
    const row = { id: "1", slug: "a", content: "full markdown" };
    supabase.maybeSingle.mockResolvedValue({ data: row, error: null });

    const result = await getPublishedPostBySlug(supabase as never, "a");

    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.eq).toHaveBeenCalledWith("slug", "a");
    expect(result).toEqual(row);
  });
});

describe("createPost", () => {
  it("inserts with defaults and stamps published_at when published", async () => {
    supabase.single.mockResolvedValue({ data: { id: "p1" }, error: null });

    const id = await createPost(supabase as never, {
      slug: "hello",
      title: "Hello",
      is_published: true,
    });

    expect(supabase.from).toHaveBeenCalledWith("blog_posts");
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: "hello",
        title: "Hello",
        excerpt: null,
        content: "",
        tags: [],
        is_published: true,
        published_at: expect.any(String),
      }),
    );
    expect(id).toBe("p1");
  });

  it("leaves published_at null for drafts", async () => {
    supabase.single.mockResolvedValue({ data: { id: "p2" }, error: null });

    await createPost(supabase as never, { slug: "draft", title: "Draft" });

    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_published: false, published_at: null }),
    );
  });
});

describe("updatePost", () => {
  it("stamps published_at on first publish", async () => {
    supabase.maybeSingle.mockResolvedValue({
      data: { id: "1", is_published: false, published_at: null },
      error: null,
    });

    await updatePost(supabase as never, "1", { is_published: true });

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        is_published: true,
        published_at: expect.any(String),
        updated_at: expect.any(String),
      }),
    );
  });

  it("does not overwrite an existing published_at", async () => {
    supabase.maybeSingle.mockResolvedValue({
      data: { id: "1", is_published: true, published_at: "2026-01-01T00:00:00Z" },
      error: null,
    });

    await updatePost(supabase as never, "1", { is_published: true });

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_published: true, updated_at: expect.any(String) }),
    );
    const call = supabase.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.published_at).toBeUndefined();
  });
});

describe("deletePost", () => {
  it("soft-deletes by stamping deleted_at", async () => {
    await deletePost(supabase as never, "1");

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "1");
  });
});
