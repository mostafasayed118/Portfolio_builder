// ============================================================================
// Layer 3 — Frontend validation rules, backed by Zod.
// Each factory builds a Zod schema and returns a thin safeParse adapter:
//   (value: unknown) => string | null   (string = error, null = valid)
// Error messages are pinned by rules.test.ts and the drift-guard suites.
// ============================================================================

import { z } from "zod";
import type { RuleFn } from "./validate";

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** First Zod issue message, or `fallback` when the issue list is empty. */
function firstIssue(error: z.ZodError, fallback: string): string {
  return error.issues[0]?.message ?? fallback;
}

export const rules = {
  required: (label = "Field"): RuleFn => {
    const message = `${label} is required`;
    const schema = z
      .string()
      .trim()
      .min(1, message)
      .or(z.custom<unknown>((v) => v !== undefined && v !== null && typeof v !== "string"));
    return (v) => (schema.safeParse(v).success ? null : message);
  },

  minLength: (min: number, label = "Field"): RuleFn => {
    const message = `${label} must be at least ${min} characters`;
    const schema = z.string().trim().min(min, message);
    return (v) => {
      if (typeof v !== "string") return null;
      return schema.safeParse(v).success ? null : message;
    };
  },

  maxLength: (max: number, label = "Field"): RuleFn => {
    const message = `${label} must be at most ${max} characters`;
    const schema = z.string().trim().max(max, message);
    return (v) => {
      if (typeof v !== "string") return null;
      return schema.safeParse(v).success ? null : message;
    };
  },

  email: (label = "Email"): RuleFn => {
    const invalid = `${label} is not a valid email address`;
    const schema = z.string().trim().regex(EMAIL_RE, invalid);
    return (v) => {
      const result = schema.safeParse(v);
      if (result.success) return null;
      return result.error.issues[0]?.code === "invalid_type"
        ? `${label} must be a string`
        : invalid;
    };
  },

  url: (label = "URL", requireHttps = false): RuleFn => {
    const invalid = `${label} is not a valid URL`;
    const schema = z
      .string()
      .trim()
      .url(invalid)
      .refine(
        (s) => {
          try {
            return !requireHttps || new URL(s).protocol === "https:";
          } catch {
            return false;
          }
        },
        { message: `${label} must use HTTPS` },
      );
    return (v) => {
      if (!v) return null;
      if (typeof v !== "string") return `${label} must be a string`;
      const result = schema.safeParse(v);
      return result.success ? null : firstIssue(result.error, invalid);
    };
  },

  range: (min: number, max: number, label = "Value"): RuleFn => {
    const message = `${label} must be between ${min} and ${max}`;
    const schema = z.number().min(min, message).max(max, message);
    return (v) => {
      if (typeof v !== "number") return null;
      return schema.safeParse(v).success ? null : message;
    };
  },

  fileType: (allowed: string[], label = "File"): RuleFn => {
    const message = `${label} must be: ${allowed.join(", ")}`;
    const schema = z
      .instanceof(File, { message: `${label} is required` })
      .refine(
        (f) => allowed.includes(f.name.split(".").pop()?.toLowerCase() ?? ""),
        { message },
      );
    return (v) => {
      const result = schema.safeParse(v);
      return result.success ? null : firstIssue(result.error, message);
    };
  },

  fileSize: (maxMB: number, label = "File"): RuleFn => {
    const message = `${label} must be under ${maxMB}MB`;
    const schema = z
      .instanceof(File)
      .refine((f) => f.size <= maxMB * 1024 * 1024, { message });
    return (v) => {
      if (!(v instanceof File)) return null;
      return schema.safeParse(v).success ? null : message;
    };
  },
};
