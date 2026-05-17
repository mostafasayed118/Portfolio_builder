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
  const { data, error } = await supabase.from("experience").select("*").order("sort_order");
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.post("/", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("experience").insert(req.body);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.status(201).json({ success: true });
});

router.put("/:id", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("experience").update(req.body).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.delete("/:id", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("experience").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
