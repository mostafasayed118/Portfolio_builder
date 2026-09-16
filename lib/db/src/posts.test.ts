import { describe, it, expect, beforeEach } from "vitest";
import { createMockSupabase } from "./test-utils";
import { MAX_LIST_ROWS } from "./query";
import {
  listPublishedPosts,
  listAllPosts,
  getPublishedPostBySlug,
  getPostPublishState,
  createPost,
  updatePost,
  deletePost,
} from "./posts";

let supabase: ReturnType<typeof createMockSupabase>;
beforeEach(() => {
  supabase = createMockSupabase();
});

/**
 * listPublishedPosts chains two .order() calls then .limit() as the terminal —
 * resolve on the limit.
 */
function resolveOnLimit(rows: unknown, error: unknown = null) {
  supabase.limit.mockResolvedValue({ data: rows, error });
}

const LIST_COLUMNS =
  "id,slug,title,excerpt,reading_minutes,cover_image_url,tags,is_published,published_at,created_at,updated_at";

describe("listPublishedPosts", () => {
  it("selects list columns (content excluded, DB-generated reading_minutes included)", async () => {
    const rows = [
      { id: "1", slug: "a", title: "A", excerpt: "x", reading_minutes: 4 },
    ];
    resolveOnLimit(rows);

    const result = await listPublishedPosts(supabase as any);

    expect(supabase.from).toHaveBeenCalledWith("blog_posts");
    expect(supabase.select).toHaveBeenCalledWith(LIST_COLUMNS);
    expect(LIST_COLUMNS).not.toContain("content");
    expect(supabase.eq).toHaveBeenCalledWith("is_published", true);
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(result).toEqual(rows);
  });

  it("orders by published_at desc then created_at desc, capped at MAX_LIST_ROWS", async () => {
    resolveOnLimit([]);

    await listPublishedPosts(supabase as any);

    expect(supabase.order).toHaveBeenNthCalledWith(1, "published_at", {
      ascending: false,
      nullsFirst: false,
    });
    expect(supabase.order).toHaveBeenNthCalledWith(2, "created_at", {
      ascending: false,
    });
    expect(supabase.limit).toHaveBeenCalledWith(MAX_LIST_ROWS);
  });

  it("throws on error", async () => {
    resolveOnLimit(null, new Error("db error"));

    await expect(listPublishedPosts(supabase as any)).rejects.toThrow("db error");
  });
});

describe("listAllPosts", () => {
  it("selects card columns for admin list (content only on detail), capped at MAX_LIST_ROWS", async () => {
    const rows = [{ id: "1", title: "Draft", is_published: false }];
    resolveOnLimit(rows);

    const result = await listAllPosts(supabase as any);

    expect(supabase.select).toHaveBeenCalledWith(LIST_COLUMNS);
    expect(LIST_COLUMNS).not.toContain("content");
    expect(supabase.is).toHaveBeenCalledWith("deleted_at", null);
    expect(supabase.limit).toHaveBeenCalledWith(MAX_LIST_ROWS);
    expect(result).toEqual(rows);
  });

  it("throws on error", async () => {
    resolveOnLimit(null, new Error("fail"));

    await expect(listAllPosts(supabase as any)).rejects.toThrow("fail");
  });
});

describe("getPublishedPostBySlug", () => {
  it("keeps full row (content) for the detail view", async () => {
    const row = { id: "1", slug: "a", content: "full markdown" };
    supabase.maybeSingle.mockResolvedValue({ data: row, error: null });

    const result = await getPublishedPostBySlug(supabase as any, "a");

    expect(supabase.select).toHaveBeenCalledWith("*");
    expect(supabase.eq).toHaveBeenCalledWith("slug", "a");
    expect(result).toEqual(row);
  });
});

describe("getPostPublishState", () => {
  it("selects only the publish stamps, scoped to the given user", async () => {
    supabase.maybeSingle.mockResolvedValue({
      data: { is_published: false, published_at: null },
      error: null,
    });

    const state = await getPostPublishState(supabase as any, "p1", "user-9");

    expect(supabase.from).toHaveBeenCalledWith("blog_posts");
    expect(supabase.select).toHaveBeenCalledWith("is_published, published_at");
    expect(supabase.eq).toHaveBeenNthCalledWith(1, "id", "p1");
    expect(supabase.eq).toHaveBeenNthCalledWith(2, "user_id", "user-9");
    expect(state).toEqual({ is_published: false, published_at: null });
  });

  it("does not scope by user when userId is absent", async () => {
    supabase.maybeSingle.mockResolvedValue({
      data: { is_published: true, published_at: "2026-01-01T00:00:00Z" },
      error: null,
    });

    const state = await getPostPublishState(supabase as any, "p2");

    expect(supabase.eq).toHaveBeenCalledTimes(1);
    expect(supabase.eq).toHaveBeenCalledWith("id", "p2");
    expect(state).toEqual({ is_published: true, published_at: "2026-01-01T00:00:00Z" });
  });

  it("returns null when the post does not exist", async () => {
    supabase.maybeSingle.mockResolvedValue({ data: null, error: null });

    const state = await getPostPublishState(supabase as any, "missing");

    expect(state).toBeNull();
  });

  it("throws on error", async () => {
    supabase.maybeSingle.mockResolvedValue({ data: null, error: new Error("db down") });

    await expect(getPostPublishState(supabase as any, "p3")).rejects.toThrow("db down");
  });
});

describe("createPost", () => {  it("inserts with defaults and stamps published_at when published", async () => {
    supabase.single.mockResolvedValue({ data: { id: "p1" }, error: null });

    const id = await createPost(supabase as any, {
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

    await createPost(supabase as any, { slug: "draft", title: "Draft" });

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

    await updatePost(supabase as any, "1", { is_published: true });

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

    await updatePost(supabase as any, "1", { is_published: true });

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_published: true, updated_at: expect.any(String) }),
    );
    const call = supabase.update.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(call.published_at).toBeUndefined();
  });
});

describe("deletePost", () => {
  it("soft-deletes by stamping deleted_at", async () => {
    await deletePost(supabase as any, "1");

    expect(supabase.update).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(String) }),
    );
    expect(supabase.eq).toHaveBeenCalledWith("id", "1");
  });
});
