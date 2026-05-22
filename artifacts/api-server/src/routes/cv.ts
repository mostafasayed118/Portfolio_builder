import { Router, type IRouter, type Request, type Response } from "express";
import { validateBody, cvSettingsUpdateSchema } from "../middleware/validate";
import { adminAuth } from "../middleware/adminAuth";
import { doubleCsrfProtection } from "../middleware/csrf";
import { generateCvPdf } from "../utils/cv-generator";
import { getSupabaseClient } from "../lib/supabase-client";

const router: IRouter = Router();

/**
 * GET /api/v1/cv
 * Public endpoint — intentionally unauthenticated.
 * CV is meant to be publicly downloadable by portfolio visitors.
 * If CV contains sensitive info, add auth middleware here.
 */
router.get("/cv", async (req: Request, res: Response) => {
  const portfolioUrl = process.env.VITE_SITE_URL ?? "https://mustafasayed.replit.app";

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
      res.status(500).json({ error: "Failed to fetch CV settings." });
      return;
    }

    if (!settings?.object_path) {
      res.status(404).json({ error: "No CV has been uploaded yet." });
      return;
    }

    const fileName = settings.file_name ?? "Mustafa_Sayed_Resume.pdf";
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("cv")
      .download(settings.object_path);

    if (downloadError || !fileData) {
      req.log.error({ err: downloadError }, "Error downloading CV from storage");
      res.status(500).json({ error: "Failed to download CV file." });
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
    res.status(500).json({ error: "Failed to serve CV." });
  }
});

router.get("/cv/settings", async (_req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { data: settings, error } = await supabase
    .from("cv_settings")
    .select("object_path, file_name, updated_at")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    res.status(500).json({ error: "Failed to fetch CV settings." });
    return;
  }

  res.json({
    objectPath: settings?.object_path ?? null,
    fileName: settings?.file_name ?? null,
    updatedAt: settings?.updated_at ?? new Date().toISOString(),
  });
});

router.put("/cv/settings", adminAuth, doubleCsrfProtection, validateBody(cvSettingsUpdateSchema), async (req: Request, res: Response) => {
  const supabase = getSupabaseClient();
  const { objectPath, fileName } = (req as Request & { validatedBody: { objectPath: string; fileName: string } }).validatedBody;

  const { data: existing } = await supabase
    .from("cv_settings")
    .select("id")
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
      res.status(500).json({ error: "Failed to update CV settings." });
      return;
    }
    res.json({ id: existing.id });
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
      res.status(500).json({ error: "Failed to save CV settings." });
      return;
    }
    res.json({ id: data?.id });
  }
});

export default router;
