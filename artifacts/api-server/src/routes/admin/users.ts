import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { requireSuperadmin } from "../../middleware/requireSuperadmin";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const updateRoleSchema = z.object({
  role: z.enum(["user", "superadmin"]),
});

// GET /api/v1/admin/users — list all users (superadmin only)
router.get("/", requireSuperadmin, async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, clerk_id, email, name, role, created_at")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

// PATCH /api/v1/admin/users/:id/role — change user role (superadmin only)
router.patch("/:id/role", requireSuperadmin, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const id = req.params.id as string;
  if (!id || id.length < 1) {
    return res.status(400).json({ success: false, message: "Invalid ID" });
  }

  const result = updateRoleSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }

  // Prevent superadmin from demoting themselves
  if (id === req.user?.id && result.data.role !== "superadmin") {
    return res.status(400).json({ success: false, message: "Cannot demote yourself" });
  }

  const { error } = await supabase
    .from("users")
    .update({ role: result.data.role })
    .eq("id", id);

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
