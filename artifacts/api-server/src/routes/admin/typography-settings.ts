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
  const { data, error } = await supabase.from("typography_settings").select("*").limit(1).maybeSingle();
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const existing = await supabase.from("typography_settings").select("id").limit(1).maybeSingle();
  const payload = { ...req.body, updated_at: new Date().toISOString() };

  let result;
  if (existing.data) {
    result = await supabase.from("typography_settings").update(payload).eq("id", existing.data.id);
  } else {
    result = await supabase.from("typography_settings").insert({ ...payload, is_published: true }).select("id").single();
  }

  if (result.error) return res.status(500).json({ success: false, message: result.error.message });
  return res.json({ success: true });
});

export default router;
