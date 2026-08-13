import { Router, type IRouter } from "express";
import type { Request, Response } from "express";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, serverError, notFound } from "../../lib/api-response";

/**
 * @public blog routes
 * Serves published blog posts. Drafts and unpublished posts are never exposed
 * here — the query filters on `is_published = true` and `deleted_at IS NULL`
 * (mirrored by the RLS policy so unauthenticated readers cannot bypass it).
 */

const router: IRouter = Router();

router.get("/", async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("id, title, slug, excerpt, cover_image_url, tags, published_at, created_at")
    .eq("is_published", true)
    .is("deleted_at", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) return serverError(res, error.message);
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

  if (error) return serverError(res, error.message);
  if (!data) return notFound(res, "Post not found");
  return ok(res, data);
});

export default router;
