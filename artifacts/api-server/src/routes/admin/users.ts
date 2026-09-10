import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { updateRoleSchema } from "@workspace/api-zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { parsePagination } from "../../lib/route-helpers";
import { validateParamId } from "../../middleware/validateUuid";
import { ok, notFound, badRequest, serverError, unauthorized, paginated } from "../../lib/api-response";

const router: IRouter = Router();

// GET /api/v1/admin/users/me — get current authenticated user (any admin)
router.get("/me", async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return unauthorized(res, "Not authenticated");
  }
  return ok(res, {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
});

// GET /api/v1/admin/users — list all users (superadmin only)
router.get("/", requireSuperadmin, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const { limit, offset } = parsePagination(req);
  const { data, error, count } = await supabase
    .from("users")
    .select("id, clerk_id, email, name, role, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return serverError(res, error.message);
  return paginated(res, data ?? [], count ?? 0, limit, offset);
});

// PATCH /api/v1/admin/users/:id/role — change user role (superadmin only)
router.patch("/:id/role", requireSuperadmin, doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const id = req.params.id as string;

  const result = updateRoleSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }

  // Prevent superadmin from demoting themselves
  if (id === req.user?.id && result.data.role !== "superadmin") {
    return badRequest(res, { role: ["Cannot demote yourself"] });
  }

  const { data, error } = await supabase
    .from("users")
    .update({ role: result.data.role })
    .eq("id", id)
    .select("id, clerk_id, email, name, role, created_at")
    .single();

  if (error) return serverError(res, error.message);
  if (!data) return notFound(res, "User not found");
  return ok(res, data);
});

export default router;
