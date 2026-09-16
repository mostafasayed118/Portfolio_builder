import { z } from "zod";

/**
 * Single source of truth for the entity types an image may attach to.
 * Consumed by the api-server upload route (writer of image_metadata rows)
 * and the admin ImageUploader (props union) — no local copies anywhere.
 */
export const IMAGE_ENTITY_TYPES = [
  "projects",
  "about",
  "hero",
  "avatar",
  "certifications",
  "skills",
  "experience",
  "branding",
  "content",
] as const;

export const imageEntityTypeSchema = z.enum(IMAGE_ENTITY_TYPES);

export const adminListImagesQuerySchema = z.object({
  entity_type: imageEntityTypeSchema,
  entity_id: z.string().uuid("entity_id must be a valid UUID"),
});

export type AdminListImagesQuery = z.infer<typeof adminListImagesQuerySchema>;
