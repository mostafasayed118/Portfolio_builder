import { Router, type IRouter, type Response } from "express";
import multer from "multer";
import { createHash } from "crypto";
import { z } from "zod";
import { IMAGE_ENTITY_TYPES, imageEntityTypeSchema } from "@workspace/api-zod";
import { doubleCsrfProtection } from "../middleware/csrf";
import { adminAuth, type AuthenticatedRequest } from "../middleware/adminAuth";
import { attachRequestSupabase } from "../middleware/requestClient";
import { imageMetadataLimiter, imageUploadLimiter } from "../middleware/rateLimiter";
import { asUntypedClient } from "../lib/untyped-client";
import { resolveActivePortfolioId, NoActivePortfolioError } from "../lib/active-portfolio";

import {
  listImageOwnership,
  setImageSortOrder,
  getImageMetadataById,
  getImageDeleteTarget,
  deleteImageMetadata,
} from "@workspace/db/images";
import { env } from "../lib/env";
import { ok, badRequest, notFound, serverError } from "../lib/api-response";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router: IRouter = Router();

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Storage extension derived from the magic-byte-verified MIME type. */
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * The original filename is client input persisted into metadata and rendered
 * in the admin UI — strip control characters (log/XSS injection via \n, \r,
 * control bytes) and cap the length before storing.
 */
function sanitizeOriginalFilename(name: string): string {
  // Stripping control characters is the entire purpose here, so the
  // no-control-regex warning is a false positive.
  // eslint-disable-next-line no-control-regex -- intentional control-character strip
  return name.replace(/[\x00-\x1f\x7f]/g, "").slice(0, 255);
}

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
  attachRequestSupabase,
  imageUploadLimiter,
  doubleCsrfProtection,
  upload.single("file"),
  async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsedEntityType = imageEntityTypeSchema.safeParse(req.body.entityType);
    const entityId = typeof req.body.entityId === "string" ? req.body.entityId : undefined;
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

    if (!parsedEntityType.success) {
      return badRequest(res, { entityType: [`Invalid entity type. Allowed: ${IMAGE_ENTITY_TYPES.join(", ")}`] });
    }
    const entityType = parsedEntityType.data;

    if (entityId && !z.string().uuid().safeParse(entityId).success) {
      return badRequest(res, { entityId: ["entityId must be a valid UUID"] });
    }

    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    // Tenant scope: storage objects live under <portfolioId>/… and the
    // metadata row carries portfolio_id (RLS enforces the boundary on JWT
    // clients). Without an active portfolio the upload has no home.
    let activePortfolioId: string;
    try {
      activePortfolioId = await resolveActivePortfolioId(req);
    } catch (error) {
      if (error instanceof NoActivePortfolioError) {
        return badRequest(res, { portfolioId: ["Create a portfolio first"] });
      }
      throw error;
    }

    const imageId = createHash("sha256").update(file.buffer).digest("hex").slice(0, 16);
    // Derive the storage extension from the VERIFIED MIME type (magic bytes
    // passed above), never from the client-controlled filename — a payload
    // named "invoice.html" must not end up stored with a .html path.
    const ext = MIME_EXTENSIONS[file.mimetype] ?? "bin";
    const storagePath = `${activePortfolioId}/${entityType}/${imageId}/original.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("project_images")
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

    // Save metadata (tenant-stamped; user_id is kept for the service-role
    // path where RLS is bypassed, so cross-admin deletes stay fail-closed).
    const { data: meta, error: metaError } = await asUntypedClient(supabase)
      .from("image_metadata")
      .insert({
        storage_path: storagePath,
        original_filename: sanitizeOriginalFilename(file.originalname),
        mime_type: file.mimetype,
        file_size_bytes: file.size,
        entity_type: entityType,
        entity_id: entityId ?? null,
        user_id: req.user?.id ?? null,
        portfolio_id: activePortfolioId,
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

const imageReorderSchema = z.object({
  ordered_ids: z.array(z.string().uuid()).min(1).max(30),
});

// POST /api/images/reorder — persist gallery image order (admin only)
router.post("/images/reorder", adminAuth, attachRequestSupabase, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const result = imageReorderSchema.safeParse(req.body);
  if (!result.success) {
    return badRequest(res, result.error.flatten().fieldErrors as Record<string, string[]>);
  }
  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    // Ownership pre-check mirroring the DELETE route: non-superadmins may
    // only reorder their own uploads. Rows that predate user_id ownership
    // (user_id IS NULL) are fail-closed to authenticated non-superadmins;
    // identity-less API-key requests keep the historical allow behavior.
    // Answered 404 (not 403) to avoid an existence oracle.
    const ownershipRows = await listImageOwnership(supabase, result.data.ordered_ids);
    const ownership = new Map(
      ownershipRows.map((row) => [String(row.id), row.user_id === null ? null : String(row.user_id)]),
    );
    const foreignOrMissing = result.data.ordered_ids.some((id) => {
      if (!ownership.has(id)) return true;
      if (!req.user || req.user.role === "superadmin") return false;
      return ownership.get(id) !== req.user.id;
    });
    if (foreignOrMissing) {
      return notFound(res, "Image not found");
    }
    // sort_order is 0-based and matches the array position of each id.
    await Promise.all(
      result.data.ordered_ids.map((id, index) =>
        setImageSortOrder(supabase, id, index),
      ),
    );
    return ok(res, undefined);
  } catch (err) {
    req.log.error({ err }, "Image reorder failed");
    return serverError(res, "Failed to reorder images");
  }
});

// GET /api/images/:id/metadata — get image metadata (admin only: the
// response exposes the original filename and acts as an ID existence oracle)
router.get("/images/:id/metadata", adminAuth, attachRequestSupabase, imageMetadataLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const imageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!z.string().uuid().safeParse(imageId).success) {
    return badRequest(res, { id: ["Invalid image ID"] });
  }

  const supabase = req.supabase;
  if (!supabase) {
    return serverError(res, "Request client not initialized");
  }
  try {
    const data = await getImageMetadataById(supabase, imageId);
    if (!data) {
      return notFound(res, "Image not found");
    }
    return ok(res, data);
  } catch {
    // Mirrors the previous behavior: any lookup failure (missing row or DB
    // error) answers 404 to avoid an existence oracle.
    return notFound(res, "Image not found");
  }
});

// DELETE /api/images/:id — delete image (admin only, scoped by owner)
router.delete("/images/:id", adminAuth, attachRequestSupabase, doubleCsrfProtection, async (req: AuthenticatedRequest, res: Response) => {
  const imageId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!z.string().uuid().safeParse(imageId).success) {
    return badRequest(res, { id: ["Invalid image ID"] });
  }

  try {
    const supabase = req.supabase;
    if (!supabase) {
      return serverError(res, "Request client not initialized");
    }
    let meta: Awaited<ReturnType<typeof getImageDeleteTarget>>;
    try {
      meta = await getImageDeleteTarget(supabase, imageId);
    } catch {
      // Mirrors the previous behavior: any lookup failure answers 404 to
      // avoid an existence oracle.
      return notFound(res, "Image not found");
    }
    if (!meta) {
      return notFound(res, "Image not found");
    }

    // Per-user scoping: non-superadmins may only delete their own uploads.
    // Rows that predate user_id ownership (user_id IS NULL) are fail-closed
    // to non-superadmins. Identity-less requests (API-key auth where the
    // default admin user could not be resolved) keep the historical allow
    // behavior — the API key itself is the admin credential. Answered 404
    // (not 403) to avoid an existence oracle.
    if (req.user && req.user.role !== "superadmin" && meta.user_id !== req.user.id) {
      return notFound(res, "Image not found");
    }

    await supabase.storage.from("project_images").remove([meta.storage_path]);
    await deleteImageMetadata(supabase, meta.id);

    return ok(res, undefined);
  } catch (err) {
    req.log.error({ err }, "Image delete failed");
    return serverError(res, "Failed to delete image");
  }
});

export default router;
