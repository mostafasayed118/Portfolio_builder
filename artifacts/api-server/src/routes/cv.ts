import { Router, type IRouter, type Request, type Response } from "express";
import { generateCvPdf } from "../utils/cv-generator";
import { getAnonSupabaseClient } from "../lib/supabase-client";
import { env } from "../lib/env";

const router: IRouter = Router();
const inflight = new Map<string, Promise<Uint8Array>>();

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

function getCvPdf(
  supabase: ReturnType<typeof getAnonSupabaseClient>,
  portfolioUrl: string,
  portfolioId: string,
): Promise<Uint8Array> {
  const pending = inflight.get(portfolioId);
  if (pending) return pending;
  const generated = generateCvPdf(supabase, portfolioUrl, portfolioId)
    .finally(() => { inflight.delete(portfolioId); });
  inflight.set(portfolioId, generated);
  return generated;
}

router.get("/cv", async (req: Request, res: Response) => {
  res.setHeader("Cache-Control", "private, no-store");
  const supabase = getAnonSupabaseClient();
  const portfolioUrl = env.VITE_SITE_URL ?? "https://mustafa-sayed-portfolio.vercel.app";
  try {
    const { data: portfolio, error: portfolioError } = await supabase
      .from("public_portfolios").select("id").eq("is_published", true)
      .order("created_at", { ascending: true }).limit(1).maybeSingle();
    if (portfolioError) {
      res.status(500).json({ success: false, message: "Failed to resolve portfolio." });
      return;
    }
    if (!portfolio?.id) {
      res.status(404).json({ success: false, message: "No published portfolio available." });
      return;
    }
    let bytes: Buffer;
    let fileName = "Mustafa_Sayed_CV.pdf";
    try {
      bytes = Buffer.from(await getCvPdf(supabase, portfolioUrl, portfolio.id));
    } catch (err: unknown) {
      req.log.warn({ err }, "Dynamic CV generation failed, falling back to uploaded file");
      const { data: settings, error } = await supabase.from("cv_settings")
        .select("object_path, file_name").eq("portfolio_id", portfolio.id)
        .order("updated_at", { ascending: false }).limit(1).maybeSingle();
      if (error) {
        res.status(500).json({ success: false, message: "Failed to fetch CV settings." });
        return;
      }
      if (!settings?.object_path) {
        res.status(404).json({ success: false, message: "No CV has been uploaded yet." });
        return;
      }
      if (!settings.object_path.startsWith(`${portfolio.id}/`)) {
        res.status(404).json({ success: false, message: "No CV has been uploaded yet." });
        return;
      }
      const { data, error: downloadError } = await supabase.storage.from("cv").download(settings.object_path);
      if (downloadError || !data) {
        res.status(404).json({ success: false, message: "CV file unavailable." });
        return;
      }
      bytes = Buffer.from(await data.arrayBuffer());
      fileName = sanitizeFileName(settings.file_name ?? "Resume.pdf");
    }
    const { data: stillPublished, error: publicationError } = await supabase.from("public_portfolios")
      .select("id").eq("id", portfolio.id).eq("is_published", true).limit(1).maybeSingle();
    if (publicationError || !stillPublished) {
      res.status(404).json({ success: false, message: "No published portfolio available." });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", bytes.length.toString());
    res.status(200).end(bytes);
  } catch (err: unknown) {
    req.log.error({ err }, "Error serving CV");
    res.status(500).json({ success: false, message: "Failed to serve CV." });
  }
});
export default router;
