import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { validateQueryUserId, validateParamId } from "../../middleware/validateUuid";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, created, notFound, badRequest, serverError } from "../../lib/api-response";
import { runCollectionQuery } from "../../lib/route-helpers";

const router: IRouter = Router();

const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID required"),
});

router.get("/", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  return runCollectionQuery(req, res, "messages", {
    softDelete: true,
    orderBy: "created_at",
    orderAsc: false,
  });
});

router.get("/unread-count", validateQueryUserId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const userId = req.user?.id;
  const isSuperadmin = req.user?.role === "superadmin";
  const targetUserId = isSuperadmin && req.query.userId ? req.query.userId as string : userId;

  let query = supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread")
    .is("deleted_at", null);

  if (targetUserId) {
    query = query.eq("user_id", targetUserId);
  }

  const { count, error } = await query;
  if (error) return serverError(res, error.message);
  return ok(res, count ?? 0);
});

router.patch("/:id/read", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ status: "read" }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Message not found");
  return ok(res, undefined);
});

router.patch("/:id/unread", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ status: "unread" }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Message not found");
  return ok(res, undefined);
});

router.delete("/:id", doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error, count } = await query.select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Message not found");
  return ok(res, undefined);
});

router.post("/bulk-delete", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = bulkDeleteSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const { ids } = result.data;
  const isSuperadmin = req.user?.role === "superadmin";
  let query = supabase.from("messages").update({ deleted_at: new Date().toISOString() }).in("id", ids);
  if (!isSuperadmin) {
    query = query.eq("user_id", req.user?.id ?? "");
  }
  const { error } = await query;
  if (error) return serverError(res, error.message);
  return ok(res, undefined);
});

export default router;
