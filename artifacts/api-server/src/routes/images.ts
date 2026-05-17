import { Router, type IRouter, type Request, type Response } from "express";
import { createClient } from "@supabase/supabase-js";
import multer from "multer";
import { createHash } from "crypto";
import { doubleCsrfProtection } from "../middleware/csrf";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const supabaseUrl: string | undefined = process.env.SUPABASE_URL;
const supabaseServiceRoleKey: string | undefined = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getServerSupabase() {
  if (!supabaseUrl) throw new Error("SUPABASE_URL is not set");
  if (!supabaseServiceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const router: IRouter = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_ENTITY_TYPES = [
  "projects",
  "about",
  "hero",
  "avatar",
  "certifications",
  "skills",
  "experience",
  "branding",
  "content",
];
const VARIANTS: { suffix: string; width: number; height?: number; fit?: string }[] = [
  { suffix: "thumbnail", width: 150, height: 150, fit: "cover" },
  { suffix: "small", width: 400, fit: "inside" },
  { suffix: "medium", width: 800, fit: "inside" },
  { suffix: "large", width: 1200, fit: "inside" },
  { suffix: "social", width: 1200, height: 630, fit: "cover" },
];

// POST /api/images/upload — upload an image
router.post("/images/upload", doubleCsrfProtection, upload.single("file"), async (req: Request, res: Response) => {
  try {
    const supabase = getServerSupabase();
    const entityType = req.body.entityType as string;
    const entityId = req.body.entityId as string | undefined;
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      res.status(400).json({ error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}` });
      return;
    }

    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      res.status(400).json({ error: `Invalid entity type. Allowed: ${ALLOWED_ENTITY_TYPES.join(", ")}` });
      return;
    }

    if (entityId && typeof entityId !== "string") {
      res.status(400).json({ error: "Invalid entityId" });
      return;
    }

    const imageId = createHash("sha256").update(file.buffer).digest("hex").slice(0, 16);
    const ext = file.originalname.split(".").pop() || "jpg";
    const storagePath = `${entityType}/${imageId}/original.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("project_images")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Save metadata
    const { data: meta, error: metaError } = await supabase
      .from("image_metadata")
      .insert({
        storage_path: storagePath,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        entity_type: entityType,
        entity_id: entityId ?? null,
      })
      .select("id")
      .single();

    if (metaError) throw new Error(`Metadata insert failed: ${metaError.message}`);

    // Use Supabase's built-in image transformation via URL params
    const publicUrl = `${supabaseUrl!}/storage/v1/object/public/project_images/${storagePath}`;

    res.json({
      id: meta.id,
      url: publicUrl,
      variants: VARIANTS.map((v) => ({
        type: v.suffix,
        url: `${publicUrl}?width=${v.width}${v.height ? `&height=${v.height}` : ""}&resize=${v.fit ?? "inside"}`,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Image upload failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Upload failed" });
  }
});

// GET /api/images/:id/metadata — get image metadata
router.get("/images/:id/metadata", async (req: Request, res: Response) => {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("image_metadata")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Image not found" });
    return;
  }

  res.json(data);
});

// DELETE /api/images/:id — delete image
router.delete("/images/:id", doubleCsrfProtection, async (req: Request, res: Response) => {
  try {
    const supabase = getServerSupabase();
    const { data: meta, error: metaError } = await supabase
      .from("image_metadata")
      .select("storage_path, id")
      .eq("id", req.params.id)
      .single();

    if (metaError || !meta) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    await supabase.storage.from("project_images").remove([meta.storage_path]);
    await supabase.from("image_metadata").delete().eq("id", meta.id);

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Image delete failed");
    res.status(500).json({ error: "Failed to delete image" });
  }
});

export default router;
