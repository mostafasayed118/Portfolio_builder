import { z } from "zod";

/**
 * Shared request-body schemas for admin routes. Imported by both the
 * api-server (for validation) and the admin frontend (for typed fetch
 * helpers). All optional `string | null` URL fields use the same
 * pattern: empty string or null from the form, parsed as null on the
 * server.
 */

const nullableUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(""))
  .or(z.null());

export const heroSchema = z.object({
  heading: z.string().max(200).optional(),
  heading_ar: z.string().max(200).optional(),
  name: z.string().max(100).optional(),
  name_ar: z.string().max(100).optional(),
  roles: z.array(z.string()).max(20).optional(),
  description: z.string().max(1000).optional(),
  description_ar: z.string().max(1000).optional(),
  github_url: nullableUrl,
  linkedin_url: nullableUrl,
  twitter_url: nullableUrl,
  youtube_url: nullableUrl,
  facebook_url: nullableUrl,
  email: z.string().email().optional().or(z.literal("")).or(z.null()),
  avatar_url: nullableUrl,
  cv_url: nullableUrl,
  site_name: z.string().max(100).optional(),
  logo_url: nullableUrl,
  favicon_url: nullableUrl,
  tagline: z.string().max(200).optional(),
  available: z.boolean().optional(),
  is_published: z.boolean().optional(),
  stats: z
    .array(z.object({ label: z.string(), value: z.string() }))
    .max(10)
    .optional(),
});

export const aboutSchema = z.object({
  bio1: z.string().max(2000).optional(),
  bio2: z.string().max(2000).optional(),
  bio: z.string().max(2000).optional(),
  bio1_ar: z.string().max(2000).optional(),
  bio2_ar: z.string().max(2000).optional(),
  bio_ar: z.string().max(2000).optional(),
  location: z.string().max(200).optional(),
  years_of_experience: z.coerce.number().int().min(0).optional(),
  degree: z.string().max(200).optional(),
  school: z.string().max(200).optional(),
  grade: z.string().max(100).optional(),
  education_years: z.string().max(50).optional(),
  education: z
    .array(
      z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string(),
        description: z.string().optional(),
      }),
    )
    .max(20)
    .optional(),
  languages: z
    .array(
      z.object({
        name: z.string(),
        level: z.coerce.number().int().min(0).max(100),
      }),
    )
    .max(30)
    .optional(),
  languages_ar: z
    .array(
      z.object({
        name: z.string(),
        level: z.coerce.number().int().min(0).max(100),
      }),
    )
    .max(30)
    .optional(),
  interests: z.array(z.string()).max(20).optional(),
  interests_ar: z.array(z.string()).max(20).optional(),
  is_published: z.boolean().optional(),
});

export const skillSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be under 100 characters"),
  category: z.string().min(1, "Category is required"),
  category_ar: z.string().optional().or(z.null()),
  proficiency: z.coerce
    .number()
    .int()
    .min(0, "Proficiency must be at least 0")
    .max(100, "Proficiency must be at most 100"),
  icon: z.string().optional().or(z.null()),
  sort_order: z.coerce.number().int().optional(),
  is_visible: z.boolean().optional(),
});

export const projectSchema = z.object({
  title: z.string().min(1, "Title is required").max(150, "Title must be under 150 characters"),
  slug: z.string().max(150).optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be under 2000 characters"),
  full_description: z.string().optional(),
  challenges: z.string().optional(),
  outcome: z.string().optional(),
  category: z.string().optional(),
  tech_stack: z.array(z.string()).max(30).optional(),
  tags: z.array(z.string()).max(20).optional(),
  featured: z.boolean().optional(),
  github_url: nullableUrl,
  live_url: nullableUrl,
  image_url: nullableUrl,
  metrics: z.array(z.string()).max(20).optional(),
  sort_order: z.coerce.number().int().optional(),
  is_published: z.boolean().optional(),
});

export const experienceSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  company: z.string().min(1, "Company is required").max(150),
  location: z.string().min(1, "Location is required").max(150),
  period: z.string().min(1, "Period is required").max(50),
  description: z.array(z.string()).max(50).optional(),
  technologies: z.array(z.string()).max(30).optional(),
  type: z.enum(["internship", "certification", "volunteer"]),
  sort_order: z.coerce.number().int().optional(),
  is_published: z.boolean().optional(),
  current: z.boolean().optional(),
});

export const sectionSettingSchema = z.object({
  key: z.string().max(50).optional(),
  label: z.string().max(50).optional(),
  is_visible: z.boolean().optional(),
  sort_order: z.coerce.number().int().min(0).max(999).optional(),
});

export const sectionReorderItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.coerce.number().int().min(0).max(999),
});

export const sectionReorderSchema = z.array(sectionReorderItemSchema).min(1).max(50);

export const updateRoleSchema = z.object({
  role: z.enum(["user", "superadmin"]),
});

export const contactSubmissionSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters")
    .trim()
    // eslint-disable-next-line no-control-regex -- intentional: strip control characters for storage/display safety
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254) // RFC 5321 max email length
    .pipe(z.string().email("Valid email is required")),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message must be under 2000 characters")
    .trim()
    // eslint-disable-next-line no-control-regex -- intentional: strip control characters for storage/display safety
    .transform((s) => s.replace(/[\u0000-\u001f\u007f]/g, "")),
  website: z.string().optional(),
  _formLoadedAt: z.number().int().nonnegative().optional(),
});

export const bulkDeleteMessagesSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "At least one ID required"),
});

/**
 * Body for bulk archive/unarchive: exactly one of an explicit `ids` batch or
 * a `filter` describing the view to act on (status/preset — the same
 * server-side predicates the list endpoint applies). A filter-based action
 * touches every matching row in ONE statement, so "archive/restore all
 * matching" scales past any id-list payload.
 */
export const bulkActionMessagesSchema = z
  .object({
    ids: z.array(z.string().uuid()).min(1, "At least one ID required").optional(),
    filter: z
      .object({
        status: z.enum(["unread", "read", "archived"]).optional(),
        preset: z.enum(["unread_today", "unread_or_archived", "needs_reply"]).optional(),
      })
      .optional(),
  })
  .refine((b) => !(b.ids && b.filter), "Provide either ids or a filter, not both")
  .refine(
    (b) => (b.ids?.length ?? 0) > 0 || !!b.filter?.status || !!b.filter?.preset,
    "Provide at least one id or a status/preset filter",
  );

/** Bulk-archive accepts `{ ids }` or `{ filter }` (see `bulkActionMessagesSchema`). */
export const bulkArchiveMessagesSchema = bulkActionMessagesSchema;

/** Bulk-unarchive accepts `{ ids }` or `{ filter }` (see `bulkActionMessagesSchema`). */
export const bulkUnarchiveMessagesSchema = bulkActionMessagesSchema;

export const postSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(180, "Title must be under 180 characters"),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(180, "Slug must be under 180 characters")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be kebab-case (lowercase letters, numbers, hyphens)"),
  excerpt: z.string().trim().max(500, "Excerpt must be under 500 characters").optional().nullable(),
  content: z.string().trim().min(1, "Content is required").max(200_000, "Content is too long"),
  cover_image_url: nullableUrl,
  tags: z.array(z.string().trim().min(1)).max(20).optional(),
  is_published: z.boolean().optional(),
});

export const aiGenerateDescriptionSchema = z.object({
  techStack: z.array(z.string()).min(1),
  title: z.string().optional(),
});

export const aiSuggestTagsSchema = z.object({
  techStack: z.array(z.string()).min(1),
  category: z.string().optional(),
});

export const aiAnalyzeContentSchema = z.object({
  content: z.string().min(1),
  contentType: z.enum(["hero", "about", "project"]),
});

export const aiSuggestCategoriesSchema = z.object({
  skillName: z.string().min(1),
});

export type HeroInput = z.infer<typeof heroSchema>;
export type AboutInput = z.infer<typeof aboutSchema>;
export type SkillInput = z.infer<typeof skillSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type PostInput = z.infer<typeof postSchema>;
export type ExperienceInput = z.infer<typeof experienceSchema>;
export type SectionSettingInput = z.infer<typeof sectionSettingSchema>;
export type ContactSubmissionInput = z.infer<typeof contactSubmissionSchema>;
