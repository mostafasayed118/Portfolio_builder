import { Router, type IRouter, type Request, type Response } from "express";
import { cvSettingsUpdateSchema } from "@workspace/api-zod";
import { doubleCsrfProtection } from "../../middleware/csrf";
import { getSupabaseClient } from "../../lib/supabase-client";
import { ok, badRequest, serverError } from "../../lib/api-response";

const router: IRouter = Router();

router.get("/settings", async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data: settings, error } = await supabase
    .from("cv_settings")
    .select("object_path, file_name, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return serverError(res, "Failed to fetch CV settings.");
  }

  return ok(res, {
    objectPath: settings?.object_path ?? null,
    fileName: settings?.file_name ?? null,
    updatedAt: settings?.updated_at ?? new Date().toISOString(),
  });
});

router.put("/settings", doubleCsrfProtection, async (req: Request, res: Response) => {
  const result = cvSettingsUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const { objectPath, fileName } = result.data;
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("cv_settings")
    .select("id, object_path")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("cv_settings")
      .update({
        object_path: objectPath,
        file_name: fileName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) {
      return serverError(res, "Failed to update CV settings.");
    }
    return ok(res, { id: existing.id });
  } else {
    const { data, error } = await supabase
      .from("cv_settings")
      .insert({
        object_path: objectPath,
        file_name: fileName,
      })
      .select("id")
      .single();

    if (error) {
      return serverError(res, "Failed to save CV settings.");
    }
    return ok(res, { id: data?.id });
  }
});

router.delete("/settings", doubleCsrfProtection, async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("cv_settings")
    .select("id, object_path")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!existing?.id) {
    return ok(res, { message: "No CV settings found to delete." });
  }

  // Delete from storage if object_path exists
  if (existing.object_path) {
    await supabase.storage.from("cv").remove([existing.object_path]).catch((err) => {
      req.log.warn({ err }, "Failed to delete CV file from storage (continuing with DB delete)");
    });
  }

  // Delete DB row
  const { error } = await supabase
    .from("cv_settings")
    .delete()
    .eq("id", existing.id);

  if (error) {
    return serverError(res, "Failed to delete CV settings.");
  }

  return ok(res, { message: "CV settings deleted." });
});

export default router;
