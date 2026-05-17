import { Router, type IRouter } from "express";
import { createClient } from "@supabase/supabase-js";
import { doubleCsrfProtection } from "../../middleware/csrf";
import { adminAuth, type AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";

const router: IRouter = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

router.get("/", adminAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("section_settings").select("*").order("sort_order");
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/:id", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("section_settings").update(req.body).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.post("/reorder", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const items = req.body as Array<{ id: string; sort_order: number }>;
  const updates = items.map((item) =>
    supabase.from("section_settings").update({ sort_order: item.sort_order }).eq("id", item.id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return res.status(500).json({ success: false, message: failed.error.message });
  return res.json({ success: true });
});

export default router;
