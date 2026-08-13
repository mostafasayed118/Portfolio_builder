import type { BlogPost as DbBlogPost } from "@workspace/supabase/types";

export type BlogPost = Pick<
  DbBlogPost,
  "id" | "title" | "slug" | "excerpt" | "content" | "cover_image_url" | "tags" | "published_at" | "created_at"
>;

export function formatPostDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
