import type { Request, Response, NextFunction } from "express";

// ============================================================================
// Layer 2 — API Server Validation Middleware
// Vanilla TypeScript — no external validation libraries
// ============================================================================

// --- Core types ---
export type ValidationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

type Validator<T> = (value: unknown) => ValidationResult & { value: T };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaShape<T> = { [K in keyof T]: Validator<T[K]> };

// --- Primitive validators ---
export const v = {
  string(opts?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    trim?: boolean;
    label?: string;
  }): Validator<string> {
    return (value: unknown) => {
      if (typeof value !== "string") {
        return { ok: false, error: `${opts?.label ?? "Field"} must be a string`, value: "" };
      }
      const val = opts?.trim !== false ? value.trim() : value;
      if (opts?.min !== undefined && val.length < opts.min) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be at least ${opts.min} characters`, value: "" };
      }
      if (opts?.max !== undefined && val.length > opts.max) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be at most ${opts.max} characters`, value: "" };
      }
      if (opts?.pattern && !opts.pattern.test(val)) {
        return { ok: false, error: `${opts?.label ?? "Field"} format is invalid`, value: "" };
      }
      return { ok: true, value: val };
    };
  },

  number(opts?: {
    min?: number;
    max?: number;
    integer?: boolean;
    label?: string;
  }): Validator<number> {
    return (value: unknown) => {
      if (typeof value !== "number" || isNaN(value)) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be a number`, value: 0 };
      }
      if (opts?.integer && !Number.isInteger(value)) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be an integer`, value: 0 };
      }
      if (opts?.min !== undefined && value < opts.min) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be at least ${opts.min}`, value: 0 };
      }
      if (opts?.max !== undefined && value > opts.max) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be at most ${opts.max}`, value: 0 };
      }
      return { ok: true, value };
    };
  },

  boolean(): Validator<boolean> {
    return (value: unknown) => {
      if (typeof value !== "boolean") {
        return { ok: false, error: "Field must be a boolean", value: false };
      }
      return { ok: true, value };
    };
  },

  email(opts?: { label?: string }): Validator<string> {
    const emailRE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
    return (value: unknown) => {
      if (typeof value !== "string") {
        return { ok: false, error: `${opts?.label ?? "Email"} must be a string`, value: "" };
      }
      if (!emailRE.test(value.trim())) {
        return { ok: false, error: `${opts?.label ?? "Email"} is not a valid email address`, value: "" };
      }
      return { ok: true, value: value.trim() };
    };
  },

  url(opts?: { requireHttps?: boolean; label?: string }): Validator<string> {
    return (value: unknown) => {
      if (typeof value !== "string") {
        return { ok: false, error: `${opts?.label ?? "URL"} must be a string`, value: "" };
      }
      try {
        const url = new URL(value.trim());
        if (opts?.requireHttps && url.protocol !== "https:") {
          return { ok: false, error: `${opts?.label ?? "URL"} must use HTTPS`, value: "" };
        }
        return { ok: true, value: value.trim() };
      } catch {
        return { ok: false, error: `${opts?.label ?? "URL"} is not a valid URL`, value: "" };
      }
    };
  },

  enum<T extends string>(...values: T[]): Validator<T> {
    return (value: unknown) => {
      if (!values.includes(value as T)) {
        return {
          ok: false,
          error: `Field must be one of: ${values.join(", ")}`,
          value: values[0],
        };
      }
      return { ok: true, value: value as T };
    };
  },

  optional<T>(inner: Validator<T>): Validator<T | undefined> {
    return (value: unknown) => {
      if (value === undefined) {
        return { ok: true, value: undefined as T | undefined };
      }
      return inner(value) as ValidationResult & { value: T | undefined };
    };
  },

  nullable<T>(inner: Validator<T>): Validator<T | null> {
    return (value: unknown) => {
      if (value === null || value === undefined) {
        return { ok: true, value: null };
      }
      return inner(value) as ValidationResult & { value: T | null };
    };
  },

  array<T>(inner: Validator<T>, opts?: { minLength?: number; maxLength?: number; label?: string }): Validator<T[]> {
    return (value: unknown) => {
      if (!Array.isArray(value)) {
        return { ok: false, error: `${opts?.label ?? "Field"} must be an array`, value: [] };
      }
      if (opts?.minLength !== undefined && value.length < opts.minLength) {
        return { ok: false, error: `${opts?.label ?? "Field"} must have at least ${opts.minLength} items`, value: [] };
      }
      if (opts?.maxLength !== undefined && value.length > opts.maxLength) {
        return { ok: false, error: `${opts?.label ?? "Field"} must have at most ${opts.maxLength} items`, value: [] };
      }
      const results: T[] = [];
      for (let i = 0; i < value.length; i++) {
        const result = inner(value[i]);
        if (!result.ok) {
          return { ok: false, error: `${opts?.label ?? "Field"}[${i}]: ${result.error}`, value: [] };
        }
        results.push(result.value as T);
      }
      return { ok: true, value: results };
    };
  },
};

// --- Schema validator ---
export function schema<T extends Record<string, unknown>>(shape: SchemaShape<T>) {
  return (body: unknown):
    | { ok: true; data: T }
    | { ok: false; errors: Record<string, string> } => {

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      return { ok: false, errors: { _root: "Request body must be an object" } };
    }

    const errors: Record<string, string> = {};
    const data: Partial<T> = {};

    for (const [key, validator] of Object.entries(shape)) {
      const result = validator((body as Record<string, unknown>)[key]);
      if (!result.ok) {
        errors[key] = result.error;
      } else {
        data[key as keyof T] = result.value as T[keyof T];
      }
    }

    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }

    return { ok: true, data: data as T };
  };
}

// --- Express middleware ---
export function validateBody<T>(
  schemaValidator: (body: unknown) =>
    | { ok: true; data: T }
    | { ok: false; errors: Record<string, string> }
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schemaValidator(req.body);
    if (!result.ok) {
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: result.errors,
      });
      return;
    }
    (req as Request & { validatedBody: T }).validatedBody = result.data;
    next();
  };
}

// --- Pre-built schemas for API routes ---
export const cvUploadSchema = schema({
  fileName: v.string({ min: 1, max: 255, pattern: /\.pdf$/i, label: "File name" }),
  objectPath: v.string({ min: 1, max: 500, label: "Object path" }),
});

export const cvSettingsUpdateSchema = schema({
  objectPath: v.string({ min: 1, max: 500, label: "Object path" }),
  fileName: v.string({ min: 1, max: 255, pattern: /\.pdf$/i, label: "File name" }),
});
