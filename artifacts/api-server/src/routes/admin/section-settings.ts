import { Router, type IRouter } from "express";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import type { Response } from "express";
import { z } from "zod";
import { getSupabaseClient } from "../../lib/supabase-client";
import { validateParamId } from "../../middleware/validateUuid";
import { ok, badRequest, serverError, notFound } from "../../lib/api-response";

const router: IRouter = Router();

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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("section_settings").select("*").order("sort_order");
  if (error) return serverError(res, error.message);
  return ok(res, data);
});

router.put("/:id", validateParamId, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = sectionSettingSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const { error, count } = await supabase
    .from("section_settings")
    .update(result.data)
    .eq("id", req.params.id as string)
    .select("id");
  if (error) return serverError(res, error.message);
  if (!count || count === 0) return notFound(res, "Section setting not found");
  return ok(res, undefined);
});

router.post("/reorder", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = getSupabaseClient();
  const result = reorderSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  const items = result.data;
  const sectionIds = items.map((item) => item.id);
  const sortOrders = items.map((item) => item.sort_order);

  const { error } = await supabase.rpc("reorder_sections", {
    section_ids: sectionIds,
    sort_orders: sortOrders,
  });

  if (error) return serverError(res, error.message);
  return ok(res, undefined);
});

export default router;
