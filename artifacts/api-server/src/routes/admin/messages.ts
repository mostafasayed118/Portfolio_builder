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
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.get("/unread-count", adminAuth, async (_req: AuthenticatedRequest, res: Response) => {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("status", "unread");
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, count });
});

router.patch("/:id/read", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("messages").update({ status: "read" }).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.patch("/:id/unread", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("messages").update({ status: "unread" }).eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.delete("/:id", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { error } = await supabase.from("messages").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.post("/bulk-delete", adminAuth, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: "ids must be a non-empty array" });
  }
  const { error } = await supabase.from("messages").delete().in("id", ids);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
