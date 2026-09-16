import { Router, type IRouter, type Response } from "express";
import { cvSettingsUpdateSchema } from "@workspace/api-zod";
import { doubleCsrfProtection } from "../../middleware/csrf";
import type { AuthenticatedRequest } from "../../middleware/adminAuth";
import { ok, badRequest, serverError } from "../../lib/api-response";
import { resolveActivePortfolioOr400 } from "../../lib/active-portfolio";

const router: IRouter = Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveCvPortfolio(req: AuthenticatedRequest, res: Response): Promise<string | null> {
  if (req.adminEmail === "api-key-admin" && !req.clerkToken) {
    return resolveActivePortfolioOr400(req, res);
  }
  if (!req.supabase || !req.clerkSub || !req.clerkToken) {
    badRequest(res, { portfolioId: ["Verified portfolio ownership is required"] });
    return null;
  }
  const requested: unknown = req.query.portfolioId ?? req.body?.portfolioId;
  if (requested !== undefined && (typeof requested !== "string" || !UUID_RE.test(requested))) {
    badRequest(res, { portfolioId: ["Invalid portfolio ID"] });
    return null;
  }
  let query = req.supabase.from("portfolios").select("id").eq("owner_user_id", req.clerkSub);
  if (typeof requested === "string") query = query.eq("id", requested);
  const { data, error } = await query.order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (error || !data || !UUID_RE.test(data.id)) {
    badRequest(res, { portfolioId: ["Create an owned portfolio first"] });
    return null;
  }
  return data.id;
}

router.get("/settings", async (req: AuthenticatedRequest, res: Response) => {
  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  const activePortfolioId = await resolveCvPortfolio(req, res);
  if (activePortfolioId === null) return res;
  const { data: settings, error } = await supabase
    .from("cv_settings")
    .select("object_path, file_name, updated_at")
    .eq("portfolio_id", activePortfolioId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return serverError(res, "Failed to fetch CV settings.");
  }

  return ok(res, {
    portfolioId: activePortfolioId,
    objectPath: settings?.object_path ?? null,
    fileName: settings?.file_name ?? null,
    updatedAt: settings?.updated_at ?? new Date().toISOString(),
  });
});

router.put("/settings", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = cvSettingsUpdateSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors);
  }
  const { objectPath, fileName } = result.data;
  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  const activePortfolioId = await resolveCvPortfolio(req, res);
  if (activePortfolioId === null) return res;
  const tenantObjectPath = `${activePortfolioId}/${objectPath}`;

  const { data: existing } = await supabase
    .from("cv_settings")
    .select("id, object_path")
    .eq("portfolio_id", activePortfolioId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from("cv_settings")
      .update({
        object_path: tenantObjectPath,
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
        object_path: tenantObjectPath,
        file_name: fileName,
        portfolio_id: activePortfolioId,
      })
      .select("id")
      .single();

    if (error) {
      return serverError(res, "Failed to save CV settings.");
    }
    return ok(res, { id: data?.id });
  }
});

router.delete("/settings", doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  const activePortfolioId = await resolveCvPortfolio(req, res);
  if (activePortfolioId === null) return res;

  const { data: existing } = await supabase
    .from("cv_settings")
    .select("id, object_path")
    .eq("portfolio_id", activePortfolioId)
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
