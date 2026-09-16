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
 *
 * The generated PDF is cached in memory for CV_PDF_CACHE_TTL_MS (default
 * 5 min): generation is fully synchronous CPU work (jsPDF + QR code) that
 * would otherwise block the event loop on every download. A TTL — rather
 * than content-versioned invalidation — trades up to TTL minutes of
 * staleness for zero coupling to the content tables; the fallback storage
 * path below is unaffected.
 */
let cvPdfCache: { bytes: Uint8Array; at: number } | null = null;
let cvPdfInflight: Promise<Uint8Array> | null = null;

/**
 * Cache-read with in-flight coalescing: while a generation is underway,
 * concurrent callers await the same promise instead of starting their own.
 * A rejected generation clears the in-flight slot and propagates to every
 * waiter, so each falls back to storage independently.
 */
async function getCvPdf(
  supabase: ReturnType<typeof getSupabaseClient>,
  portfolioUrl: string,
): Promise<Uint8Array> {
  const now = Date.now();
  if (cvPdfCache && now - cvPdfCache.at < env.CV_PDF_CACHE_TTL_MS) {
    return cvPdfCache.bytes;
  }
  if (!cvPdfInflight) {
    cvPdfInflight = generateCvPdf(supabase, portfolioUrl)
      .then((bytes) => {
        cvPdfCache = { bytes, at: Date.now() };
        return bytes;
      })
      .finally(() => {
        cvPdfInflight = null;
      });
  }
  return cvPdfInflight;
}

router.get("/cv", async (req: Request, res: Response) => {
  const portfolioUrl = env.VITE_SITE_URL ?? "https://mustafa-sayed-portfolio.vercel.app";

  try {
    const now = Date.now();
    let pdfBytes = cvPdfCache && now - cvPdfCache.at < env.CV_PDF_CACHE_TTL_MS ? cvPdfCache.bytes : null;
    if (!pdfBytes) {
      pdfBytes = await getCvPdf(getSupabaseClient(), portfolioUrl);
    }
    const fileName = "Mustafa_Sayed_CV.pdf";
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBytes.length.toString());
    // Public content with server-side PDF caching — let the CDN take a 5-min
    // slice of the load and revalidate in the background afterwards.
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
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
