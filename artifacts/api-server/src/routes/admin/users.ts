import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { validateParamId } from "../../middleware/validateUuid";
import { ok, notFound, badRequest, serverError } from "../../lib/api-response";

const router: IRouter = Router();

const updateRoleSchema = z.object({
  role: z.enum(["user", "superadmin"]),
});

// GET /api/v1/admin/users/me — get current authenticated user (any admin)
router.get("/me", async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  return ok(res, {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
  });
});

// GET /api/v1/admin/users — list all users (superadmin only)
router.get("/", requireSuperadmin, async (_req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_id, email, name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return serverError(res, error.message);
  return ok(res, data);
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

  const { error, count } = await supabase
    .from("users")
    .update({ role: result.data.role })
    .eq("id", id)
    .select("id");

  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "User not found");
  return ok(res, null);
});

export default router;
