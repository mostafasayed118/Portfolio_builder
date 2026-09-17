import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { postSchema } from "@workspace/api-zod";
import { createPost, getPostPublishState } from "@workspace/db/posts";
import { isUniqueViolationError } from "@workspace/db/singleton-upsert";
import { created, badRequest, serverError } from "../../lib/api-response";
import { respondDbError } from "../../lib/safe-error";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";
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
  const body = parseBody(res, postSchema, req.body);
  if (!body) return;

  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    const portfolioId = await resolveActivePortfolioOr400(req, res);
    if (portfolioId === null) return;
    await createPost(supabase, {
      ...body,
      portfolio_id: portfolioId,
    });
    return created(res);
  } catch (err: unknown) {
    if (isUniqueViolationError(err)) {
      return badRequest(res, { slug: ["Slug already in use"] });
    }
    return respondDbError(res, err);
  }
});

router.put("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const patch = parseBody(res, postSchema.partial(), req.body);
  if (!patch) return;

  const updateData: Record<string, unknown> = { ...patch };

  // Toggle publish → stamp published_at on first publish.
  if (patch.is_published === true) {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    try {
      const supabase = req.supabase;
      if (!supabase) {
        return serverError(res, "Request client not initialized");
      }
      const state = await getPostPublishState(supabase, id);
      if (state && state.is_published !== true && !state.published_at) {
        updateData.published_at = new Date().toISOString();
      }
    } catch (err: unknown) {
      return respondDbError(res, err);
    }
  }

  return updateByIdAndUser(
    req,
    res,
    "blog_posts",
    Array.isArray(req.params.id) ? req.params.id[0] : req.params.id,
    updateData,
    "Post",
  );
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  return softDeleteByIdAndUser(req, res, "blog_posts", id, "Post");
});

export default router;
