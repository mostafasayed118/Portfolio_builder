import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { updateRoleSchema } from "@workspace/api-zod";
import { listUsers, updateUserRole } from "@workspace/db/users";
import { getSupabaseClient } from "../../lib/supabase-client";
import { parsePagination } from "../../lib/route-helpers";
import { validateParamId } from "../../middleware/validateUuid";
import { ok, badRequest, serverError, unauthorized, paginated, notFound } from "../../lib/api-response";
import { safeErrorMessage } from "../../lib/safe-error";

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
  const { limit, offset } = parsePagination(req);
  try {
    const { rows, count } = await listUsers(getSupabaseClient(), { limit, offset });
    return paginated(res, rows, count, limit, offset);
  } catch (err) {
    return serverError(res, safeErrorMessage(err));
  }
});

// PATCH /api/v1/admin/users/:id/role — change user role (superadmin only)
router.patch("/:id/role", requireSuperadmin, doubleCsrfProtection, validateParamId, async (req: AuthenticatedRequest, res: Response) => {
  // Express 5's ParamsDictionary types param values as string | string[];
  // validateParamId has already guaranteed a (UUID) string at runtime.
  const id = req.params.id as string;

  const result = updateRoleSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }

  // Prevent superadmin from demoting themselves
  if (id === req.user?.id && result.data.role !== "superadmin") {
    return badRequest(res, { role: ["Cannot demote yourself"] });
  }

  try {
    const rows = await updateUserRole(getSupabaseClient(), id, result.data.role);
    // Supabase leaves `count` null on update+select, so a missing user shows
    // up as an empty result array — respond 404, not success-on-nothing.
    if (!rows || rows.length === 0) {
      return notFound(res, "User not found");
    }
    return ok(res, rows[0]);
  } catch (err) {
    return serverError(res, safeErrorMessage(err));
  }
});

export default router;
