import { Router, type IRouter } from "express";
import type { Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest } from "../../lib/api-response";
import { fetchEventStats, fetchMessageStats } from "@workspace/db/analytics";

const router: IRouter = Router();

const daysSchema = z.coerce.number().int().min(1).max(365).default(30);

/**
 * GET /api/v1/admin/analytics — aggregate visitor + message stats.
 *
 * Auth is enforced by the shared `adminAuth` middleware mounted on the
 * /admin router in v1/index.ts. The `days` query param controls the
 * lookback window (default 30, max 365).
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  const parsed = daysSchema.safeParse(req.query.days ?? 30);
  if (!parsed.success) {
    return badRequest(res, { days: ["days must be an integer between 1 and 365"] });
  }
  const days = parsed.data;

  const supabase = getSupabaseClient();
  const [events, messages] = await Promise.all([
    fetchEventStats(supabase, days),
    fetchMessageStats(supabase, days),
  ]);

  return ok(res, { days, ...events, messages });
});

export default router;
