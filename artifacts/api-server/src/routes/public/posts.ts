import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, serverError, notFound } from "../../lib/api-response";
import { safeErrorMessage } from "../../lib/safe-error";

/**
 * @public blog routes
 * Serves published blog posts. Drafts and unpublished posts are never exposed
 * here — the query filters on `is_published = true` and `deleted_at IS NULL`
 * (mirrored by the RLS policy so unauthenticated readers cannot bypass it).
 */

const router: IRouter = Router();

// Public, cache-safe content: CDN may serve for 5 min and refresh in the
// background for 10 min after. Never set on admin/authed routes.
const PUBLIC_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=600";

router.get("/", async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, reading_minutes, cover_image_url, tags, published_at, created_at")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return serverError(res, safeErrorMessage(error));
  res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  return ok(res, { data, total: data?.length ?? 0 });
});

router.get("/:slug", async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const slug = Array.isArray(req.params.slug) ? req.params.slug[0] : req.params.slug;
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return serverError(res, safeErrorMessage(error));
  if (!data) return notFound(res, "Post not found");
  res.set("Cache-Control", PUBLIC_CACHE_CONTROL);
  return ok(res, data);
});

export default router;
