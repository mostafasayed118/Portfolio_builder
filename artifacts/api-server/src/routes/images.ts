import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { z } from "zod";
import { doubleCsrfProtection } from "../middleware/csrf";
import { adminAuth } from "../middleware/adminAuth";
import { imageMetadataLimiter, imageUploadLimiter } from "../middleware/rateLimiter";
import { getSupabaseClient } from "../lib/supabase-client";
import { env } from "../lib/env";
import { ok, badRequest, notFound, serverError } from "../lib/api-response";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

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

/**
 * Magic-byte signatures for the formats we accept. The HTTP `Content-Type`
 * header is supplied by the client and trivially spoofable; we must
 * inspect the actual file bytes to be sure the payload matches the
 * declared format. Without this check, an attacker could upload a
 * `.exe` renamed to `.jpg` and have it served as `image/jpeg` from
 * the public `project_images` bucket (XSS / drive-by download risk).
 */
const MAGIC_BYTES: { mime: string; signatures: { bytes: Uint8Array; offset: number }[] }[] = [
  {
    mime: "image/jpeg",
    signatures: [
      { bytes: new Uint8Array([0xff, 0xd8, 0xff]), offset: 0 }, // JPEG (SOI + first APP0 marker byte)
    ],
  },
  {
    mime: "image/png",
    signatures: [
      { bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), offset: 0 }, // PNG
    ],
  },
  {
    mime: "image/webp",
    signatures: [
      { bytes: new Uint8Array([0x52, 0x49, 0x46, 0x46]), offset: 0 }, // 'RIFF' container
      { bytes: new Uint8Array([0x57, 0x45, 0x42, 0x50]), offset: 8 }, // 'WEBP' chunk at bytes 8-11
    ],
  },
];

function verifyMagicBytes(buf: Buffer, declaredMime: string): boolean {
  const expected = MAGIC_BYTES.find((m) => m.mime === declaredMime);
  if (!expected) return false;
  return expected.signatures.every(({ bytes, offset }) => {
    if (buf.length < offset + bytes.length) return false;
    for (let i = 0; i < bytes.length; i++) {
      if (buf[offset + i] !== bytes[i]) return false;
    }
    return true;
  });
}
const VARIANTS: { suffix: string; width: number; height?: number; fit?: string }[] = [
  { suffix: "thumbnail", width: 150, height: 150, fit: "cover" },
  // Supabase's transform API supports only cover/contain ("inside" returns 400).
  { suffix: "small", width: 400, fit: "contain" },
  { suffix: "medium", width: 800, fit: "contain" },
  { suffix: "large", width: 1200, fit: "contain" },
  { suffix: "social", width: 1200, height: 630, fit: "cover" },
];

// POST /api/images/upload — upload an image (admin only)
router.post(
  "/images/upload",
  adminAuth,
  imageUploadLimiter,
  doubleCsrfProtection,
  upload.single("file"),
  async (req: Request, res: Response) => {
  try {
    const supabase = getSupabaseClient();
    const entityType = req.body.entityType as string;
    const entityId = req.body.entityId as string | undefined;
    const file = req.file as Express.Multer.File | undefined;

    if (!file) {
      return badRequest(res, { file: ["No file provided"] });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return badRequest(res, { file: [`Invalid file type. Allowed: ${ALLOWED_TYPES.join(", ")}`] });
    }

    // Defense in depth: verify the bytes actually match the declared
    // MIME type. The Content-Type header is supplied by the client and
    // can be anything; an attacker could otherwise upload an executable
    // renamed to .jpg and have it served from the public bucket.
    if (!verifyMagicBytes(file.buffer, file.mimetype)) {
      return badRequest(res, { file: [`File contents do not match declared type "${file.mimetype}". Upload rejected as a safety check.`] });
    }

    if (!ALLOWED_ENTITY_TYPES.includes(entityType)) {
      return badRequest(res, { entityType: [`Invalid entity type. Allowed: ${ALLOWED_ENTITY_TYPES.join(", ")}`] });
    }

    if (entityId && typeof entityId !== "string") {
      return badRequest(res, { entityId: ["Invalid entityId"] });
    }

    if (entityId && !z.string().uuid().safeParse(entityId).success) {
      return badRequest(res, { entityId: ["entityId must be a valid UUID"] });
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
    const supabaseUrl = env.SUPABASE_URL;
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/project_images/${storagePath}`;

    return ok(res, {
      id: meta.id,
      url: publicUrl,
      variants: VARIANTS.map((v) => ({
        type: v.suffix,
        url: `${publicUrl}?width=${v.width}${v.height ? `&height=${v.height}` : ""}&resize=${v.fit ?? "inside"}`,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "Image upload failed");
    return serverError(res, "Image upload failed. Please try again.");
  }
},
);

// GET /api/images/:id/metadata — get image metadata
router.get("/images/:id/metadata", imageMetadataLimiter, async (req: Request, res: Response) => {
  const imageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!z.string().uuid().safeParse(imageId).success) {
    return badRequest(res, { id: ["Invalid image ID"] });
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("image_metadata")
    .select("id, original_filename, mime_type, file_size_bytes, entity_type, entity_id, created_at")
    .eq("id", imageId)
    .single();

  if (error || !data) {
    return notFound(res, "Image not found");
  }

  return ok(res, data);
});

// DELETE /api/images/:id — delete image (admin only)
router.delete("/images/:id", adminAuth, doubleCsrfProtection, async (req: Request, res: Response) => {
  const imageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!z.string().uuid().safeParse(imageId).success) {
    return badRequest(res, { id: ["Invalid image ID"] });
  }

  try {
    const supabase = getSupabaseClient();
    const { data: meta, error: metaError } = await supabase
      .from("image_metadata")
      .select("storage_path, id")
      .eq("id", imageId)
      .single();

    if (metaError || !meta) {
      return notFound(res, "Image not found");
    }

    await supabase.storage.from("project_images").remove([meta.storage_path]);
    await supabase.from("image_metadata").delete().eq("id", meta.id);

    return ok(res, undefined);
  } catch (err) {
    req.log.error({ err }, "Image delete failed");
    return serverError(res, "Failed to delete image");
  }
});

export default router;
