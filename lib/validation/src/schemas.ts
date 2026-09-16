// ============================================================================
// Layer 3 — Pre-built validation schemas for every form in the project.
//
// Two shapes live side by side:
//  1. RuleFn maps (field → validators) consumed by lib/ui's useFormValidation.
//     Contact validators are thin safeParse adapters over the Zod field
//     schemas; the remaining forms use the Zod-backed rule factories.
//  2. Real Zod object schemas — contactZodSchema mirrors
//     @workspace/api-zod's contactSubmissionSchema; contact-drift.test.ts
//     enforces that both accept/reject identical inputs.
// ============================================================================

import { z } from "zod";
import { rules } from "./rules";
import { CV_EXT, CV_MAX_MB } from "./constants";
import type { RuleFn } from "./validate";

/** Thin safeParse adapter: a Zod field schema as a string-error RuleFn. */
function zodRule(schema: z.ZodTypeAny): RuleFn {
  return (v) => {
    const result = schema.safeParse(v);
    return result.success ? null : (result.error.issues[0]?.message ?? null);
  };
}

// ─── Contact — shape-aligned with api-zod's contactSubmissionSchema ─────────

const contactFields = {
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
};

/**
 * Full contact submission payload — the client-side mirror of the API
 * layer's `contactSubmissionSchema` (honeypot + form-mount timestamp
 * included so both layers accept/reject identical inputs).
 */
export const contactZodSchema = z.object({
  ...contactFields,
  website: z.string().optional(),
  _formLoadedAt: z.number().int().nonnegative().optional(),
});

/** RuleFn map for the contact form, derived from the same Zod fields. */
export const contactFormSchema = {
  name: [zodRule(contactFields.name)],
  email: [zodRule(contactFields.email)],
  message: [zodRule(contactFields.message)],
};

// ─── Remaining form schemas (Zod-backed rule factories) ─────────────────────

export const skillSchema = {
  name:        [rules.required("Name"),        rules.maxLength(100, "Name")],
  category:    [rules.required("Category")],
  proficiency: [rules.required("Proficiency"), rules.range(1, 100, "Proficiency")],
  sort_order:  [rules.range(0, 9999, "Sort order")],
};

export const projectSchema = {
  title:       [rules.required("Title"),       rules.maxLength(150, "Title")],
  description: [rules.required("Description"), rules.minLength(10, "Description"), rules.maxLength(2000, "Description")],
  github_url:  [rules.url("GitHub URL")],
  live_url:    [rules.url("Live URL", true)],
};

export const experienceSchema = {
  title:   [rules.required("Title"),   rules.maxLength(150, "Title")],
  company: [rules.required("Company"), rules.maxLength(150, "Company")],
  period:  [rules.required("Period")],
  location: [rules.required("Location")],
  type:    [rules.required("Type")],
};

export const certificationSchema = {
  title:          [rules.required("Title"), rules.maxLength(200, "Title")],
  issuer:         [rules.required("Issuer")],
  date:           [rules.required("Date")],
  credential_url: [rules.url("Credential URL", true)],
};

export const heroSchema = {
  heading: [rules.required("Heading"), rules.maxLength(200, "Heading")],
  name:    [rules.required("Name"),    rules.maxLength(100, "Name")],
};

export const cvUploadSchema = {
  file: [
    rules.required("CV file"),
    rules.fileType([CV_EXT.slice(1)], "CV"),
    rules.fileSize(CV_MAX_MB, "CV"),
  ],
};

export const contactInfoSchema = {
  email:    [rules.email("Contact email")],
  linkedin: [rules.url("LinkedIn URL", true)],
  github:   [rules.url("GitHub URL")],
};

export const siteSettingsSchema = {
  site_name:    [rules.required("Site name"),    rules.maxLength(100, "Site name")],
  site_tagline: [rules.maxLength(200, "Tagline")],
};

export const seoSchema = {
  title:       [rules.required("SEO title"),       rules.maxLength(100, "SEO title")],
  description: [rules.required("SEO description"), rules.maxLength(300, "SEO description")],
};
