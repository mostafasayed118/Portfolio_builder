import type { SupabaseClient } from "@supabase/supabase-js";
import type { BlogPost, InsertBlogPost } from "@workspace/supabase/types";
import { MAX_LIST_ROWS, queryOrThrow } from "./query";

export type Post = BlogPost;

const TABLE = "blog_posts" as const;

export interface NewPostInput {
  slug: string;
  title: string;
  excerpt?: string | null;
  content?: string;
  cover_image_url?: string | null;
  tags?: string[];
  is_published?: boolean;
}

/**
 * List-view columns. `content` is excluded: reading time comes from the
 * `reading_minutes` stored generated column (migration 063 computes
 * max(1, ceil(words/200)) on every write), so cards never need the full
 * body. Detail views keep select("*").
 */
const LIST_COLUMNS =
  "id,slug,title,excerpt,reading_minutes,cover_image_url,tags,is_published,published_at,created_at,updated_at";

export type PostListItem = Pick<
  Post,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "reading_minutes"
  | "cover_image_url"
  | "tags"
  | "is_published"
  | "published_at"
  | "created_at"
  | "updated_at"
>;

/** Public: list published posts, newest first. */
export async function listPublishedPosts(supabase: SupabaseClient): Promise<PostListItem[]> {
  return queryOrThrow<PostListItem[]>(
    supabase
      .from(TABLE)
      .select(LIST_COLUMNS)
      .eq("is_published", true)
      .is("deleted_at", null)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false })
      .limit(MAX_LIST_ROWS),
    { table: TABLE, operation: "listPublishedPosts" },
  );
}

/** Admin: list all non-deleted posts regardless of publish state. */
export async function listAllPosts(supabase: SupabaseClient): Promise<PostListItem[]> {
  return queryOrThrow<PostListItem[]>(
    supabase
      .from(TABLE)
      .select(LIST_COLUMNS)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(MAX_LIST_ROWS),
    { table: TABLE, operation: "listAllPosts" },
  );
}

/** Public: fetch a single published post by slug. */
export async function getPublishedPostBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Post | null> {
  return queryOrThrow<Post | null>(
    supabase
      .from(TABLE)
      .select("*")
      .eq("slug", slug)
      .eq("is_published", true)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle(),
    { table: TABLE, operation: "getPublishedPostBySlug" },
  );
}

/** Admin: fetch a post by id regardless of publish state. */
export async function getPostById(supabase: SupabaseClient, id: string): Promise<Post | null> {
  return queryOrThrow<Post | null>(
    supabase.from(TABLE).select("*").eq("id", id).is("deleted_at", null).maybeSingle(),
    { table: TABLE, operation: "getPostById" },
  );
}

export interface PostPublishState {
  is_published: boolean | null;
  published_at: string | null;
}

export async function getPostPublishState(
  supabase: SupabaseClient,
  id: string,
  _userId?: string | null,
): Promise<PostPublishState | null> {
  const query = supabase.from(TABLE).select("is_published, published_at").eq("id", id);
  return queryOrThrow<PostPublishState | null>(
    query.limit(1).maybeSingle(),
    { table: TABLE, operation: "getPostPublishState" },
  );
}

export async function createPost(
  supabase: SupabaseClient,
  input: InsertBlogPost,
): Promise<string> {
  const now = new Date().toISOString();
  const publishedAt = input.is_published ? (input.published_at ?? now) : null;
  const row = await queryOrThrow<{ id: string }>(
    supabase
      .from(TABLE)
      .insert({
        ...input,
        excerpt: input.excerpt ?? null,
        content: input.content ?? "",
        cover_image_url: input.cover_image_url ?? null,
        tags: input.tags ?? [],
        is_published: input.is_published ?? false,
        published_at: publishedAt,
        created_at: now,
        updated_at: now,
      } satisfies InsertBlogPost)
      .select("id")
      .single(),
    { table: TABLE, operation: "createPost" },
  );
  return row.id;
}

export async function updatePost(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<InsertBlogPost>,
): Promise<void> {
  const data: Record<string, unknown> = { ...patch };

  // When toggling to published for the first time, stamp published_at.
  if (patch.is_published) {
    const existing = await getPostById(supabase, id);
    if (existing && existing.is_published !== true && !existing.published_at) {
      data.published_at = new Date().toISOString();
    }
  }

  await queryOrThrow(
    supabase.from(TABLE).update({ ...data, updated_at: new Date().toISOString() }).eq("id", id),
    { table: TABLE, operation: "updatePost" },
  );
}

export async function deletePost(supabase: SupabaseClient, id: string): Promise<void> {
  await queryOrThrow(
    supabase.from(TABLE).update({ deleted_at: new Date().toISOString() }).eq("id", id),
    { table: TABLE, operation: "deletePost" },
  );
}
