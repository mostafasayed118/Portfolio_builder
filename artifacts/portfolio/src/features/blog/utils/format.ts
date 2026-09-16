/**
 * Blog date formatting, shared by BlogPostCard and the blog pages.
 * Extracted from types.ts (which keeps only the `BlogPost` type) so
 * presentation helpers don't ride along with type imports. Date formatting
 * itself delegates to the shared portfolio helper in `@/lib/format-date`.
 *
 * Reading time is no longer computed here: it comes from the
 * `reading_minutes` stored generated column (migration 063) and is
 * consistent between list and detail views.
 */

import { formatDate } from "@/lib/format-date";

export function formatPostDate(date: string | null | undefined): string {
  return formatDate(date);
}
