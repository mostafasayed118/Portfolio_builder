// ============================================================================
// Layer 3 — Field + Form level validation
// ============================================================================

import type { RuleFn } from "./rules";

/** Validate a single field against multiple rules — returns first error */
export function validateField(value: unknown, ...ruleFns: RuleFn[]): string | null {
  for (const rule of ruleFns) {
    const error = rule(value);
    if (error) return error;
  }
  return null;
}

/** Form errors shape — partial record keyed by field name */
export type FormErrors<T> = Partial<Record<keyof T, string>>;

/** Schema definition — maps each field to an array of rule functions */
export type ValidationSchema<T> = { [K in keyof T]?: RuleFn[] };

/** Validate all fields in a form against their schema */
export function validateForm<T extends Record<string, unknown>>(
  values: T,
  schema: ValidationSchema<T>,
): FormErrors<T> {
  const errors: FormErrors<T> = {};
  for (const key in schema) {
    const ruleFns = schema[key] ?? [];
    const error = validateField(values[key], ...ruleFns);
    if (error) errors[key] = error;
  }
  return errors;
}

/** Quick check if a form has any validation errors */
export function isFormValid<T>(errors: FormErrors<T>): boolean {
  return Object.keys(errors).length === 0;
}
