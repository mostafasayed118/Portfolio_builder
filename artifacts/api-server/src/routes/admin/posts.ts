import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { postSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { created, badRequest, serverError } from "../../lib/api-response";
import { runCollectionQuery, updateByIdAndUser, softDeleteByIdAndUser, parseBody } from "../../lib/route-helpers";

const router: IRouter = Router();

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  return runCollectionQuery(req, res, "blog_posts", {
    softDelete: true,
    orderBy: "updated_at",
    orderAsc: false,
  });
});

router.post("/", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = postSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }

  const now = new Date().toISOString();
  const body = result.data;
  const insertData = {
    title: body.title,
    slug: body.slug,
    excerpt: body.excerpt ?? null,
    content: body.content,
    cover_image_url: body.cover_image_url ?? null,
    tags: body.tags ?? [],
    is_published: body.is_published ?? false,
    published_at: body.is_published ? now : null,
    user_id: req.user?.id,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("blog_posts").insert(insertData);
  if (error) {
    if (error.code === "23505") {
      return badRequest(res, { slug: ["Slug already in use"] });
    }
    return serverError(res, error.message);
  }
  return created(res);
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const patch = parseBody(res, postSchema.partial(), req.body);
  if (!patch) return;

  const updateData: Record<string, unknown> = { ...patch };

  // Toggle publish → stamp published_at on first publish.
  if (patch.is_published === true) {
    const userId = req.user?.role === "superadmin" && req.query.userId
      ? (req.query.userId as string)
      : req.user?.id;
    let query = supabase
      .from("blog_posts")
      .select("id, is_published, published_at")
      .eq("id", req.params.id as string);
    if (userId) query = query.eq("user_id", userId);
    const { data, error } = await query.maybeSingle();
    if (error) return serverError(res, error.message);
    if (data && data.is_published !== true && !data.published_at) {
      updateData.published_at = new Date().toISOString();
    }
  }

  return updateByIdAndUser(
    req,
    res,
    "blog_posts",
    req.params.id as string,
    updateData as Parameters<typeof updateByIdAndUser>[4],
    "Post",
  );
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  return softDeleteByIdAndUser(req, res, "blog_posts", req.params.id as string, "Post");
});

export default router;
