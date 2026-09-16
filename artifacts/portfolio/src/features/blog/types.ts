import type { BlogPost as DbBlogPost } from "@workspace/supabase/types";

/**
 * Card/list shape. `content` is intentionally excluded — list queries
 * return the DB-generated `reading_minutes` instead (migration 063), and
 * the detail page works with the full row from select("*").
 */
export type BlogPost = Pick<
  DbBlogPost,
  "id" | "title" | "slug" | "excerpt" | "reading_minutes" | "cover_image_url" | "tags" | "published_at" | "created_at" | "updated_at"
>;
