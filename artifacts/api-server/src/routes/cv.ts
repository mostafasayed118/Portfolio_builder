import { Router, type IRouter, type Request, type Response } from "express";
import { generateCvPdf } from "../utils/cv-generator";
import { getSupabaseClient } from "../lib/supabase-client";
import { env } from "../lib/env";

const router: IRouter = Router();

/** Sanitize a filename for safe use in Content-Disposition headers. */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128);
}

/**
 * GET /api/v1/cv
 * Public endpoint — intentionally unauthenticated.
 * CV is meant to be publicly downloadable by portfolio visitors.
 * If CV contains sensitive info, add auth middleware here.
 */
router.get("/cv", async (req: Request, res: Response) => {
  const portfolioUrl = env.VITE_SITE_URL ?? "https://mustafa-sayed-portfolio.vercel.app";

  try {
    const supabase = getSupabaseClient();
    const pdfBytes = await generateCvPdf(supabase, portfolioUrl);
    const fileName = "Mustafa_Sayed_CV.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBytes.length.toString());
    res.status(200);
    res.end(Buffer.from(pdfBytes));
    return;
  } catch (err) {
    req.log.warn({ err }, "Dynamic CV generation failed, falling back to uploaded file");
  }

  // Fallback: serve uploaded PDF from storage
  try {
    const supabase = getSupabaseClient();
    const { data: settings, error } = await supabase
      .from("cv_settings")
      .select("object_path, file_name")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      req.log.error({ err: error }, "Error fetching CV settings");
      res.status(500).json({ success: false, message: "Failed to fetch CV settings." });
      return;
    }

    if (!settings?.object_path) {
      res.status(404).json({ success: false, message: "No CV has been uploaded yet." });
      return;
    }

    const fileName = sanitizeFileName(settings.file_name ?? "Mustafa_Sayed_Resume.pdf");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cv")
      .download(settings.object_path);

    if (downloadError || !fileData) {
      req.log.error({ err: downloadError }, "Error downloading CV from storage");
      res.status(500).json({ success: false, message: "Failed to download CV file." });
      return;
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", buffer.length.toString());
    res.status(200);
    res.end(buffer);
  } catch (err) {
    req.log.error({ err }, "Error serving CV");
    res.status(500).json({ success: false, message: "Failed to serve CV." });
  }
});
export default router;
