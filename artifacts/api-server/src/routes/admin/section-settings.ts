import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";

const router: IRouter = Router();

const supabase = getSupabaseClient();

const sectionSettingSchema = z.object({
  key: z.string().max(50).optional(),
  label: z.string().max(50).optional(),
  is_visible: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
});

const reorderItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

const reorderSchema = z.array(reorderItemSchema).min(1).max(50);

router.get("/", async (_req: AuthenticatedRequest, res: Response) => {
  const { data, error } = await supabase.from("section_settings").select("*").order("sort_order");
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true, data });
});

router.put("/:id", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = sectionSettingSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const { error } = await supabase.from("section_settings").update(result.data).eq("id", req.params.id as string);
  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

router.post("/reorder", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = reorderSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ success: false, errors: result.error.flatten().fieldErrors });
  }
  const items = result.data;
  const sectionIds = items.map((item) => item.id);
  const sortOrders = items.map((item) => item.sort_order);

  const { error } = await supabase.rpc("reorder_sections", {
    section_ids: sectionIds,
    sort_orders: sortOrders,
  });

  if (error) return res.status(500).json({ success: false, message: error.message });
  return res.json({ success: true });
});

export default router;
