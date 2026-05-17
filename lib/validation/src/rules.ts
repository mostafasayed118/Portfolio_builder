// ============================================================================
// Layer 3 — Frontend Validation Rules
// Each rule: (value: unknown) => string | null
//   string = error message
//   null   = valid
// ============================================================================

export type RuleFn = (value: unknown) => string | null;

export const rules = {
  required: (label = "Field"): RuleFn =>
    (v) => (!v || (typeof v === "string" && !v.trim()))
      ? `${label} is required`
      : null,

  minLength: (min: number, label = "Field"): RuleFn =>
    (v) => (typeof v === "string" && v.trim().length < min)
      ? `${label} must be at least ${min} characters`
      : null,

  maxLength: (max: number, label = "Field"): RuleFn =>
    (v) => (typeof v === "string" && v.trim().length > max)
      ? `${label} must be at most ${max} characters`
      : null,

  email: (label = "Email"): RuleFn =>
    (v) => {
      if (typeof v !== "string") return `${label} must be a string`;
      const re = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
      return re.test(v.trim()) ? null : `${label} is not a valid email address`;
    },

  url: (label = "URL", requireHttps = false): RuleFn =>
    (v) => {
      if (!v) return null;
      if (typeof v !== "string") return `${label} must be a string`;
      try {
        const url = new URL(v.trim());
        if (requireHttps && url.protocol !== "https:") {
          return `${label} must use HTTPS`;
        }
        return null;
      } catch {
        return `${label} is not a valid URL`;
      }
    },

  range: (min: number, max: number, label = "Value"): RuleFn =>
    (v) => (typeof v === "number" && (v < min || v > max))
      ? `${label} must be between ${min} and ${max}`
      : null,

  pattern: (regex: RegExp, message: string): RuleFn =>
    (v) => (typeof v === "string" && !regex.test(v)) ? message : null,

  fileType: (allowed: string[], label = "File"): RuleFn =>
    (v) => {
      if (!(v instanceof File)) return `${label} is required`;
      const ext = v.name.split(".").pop()?.toLowerCase() ?? "";
      return allowed.includes(ext) ? null : `${label} must be: ${allowed.join(", ")}`;
    },

  fileSize: (maxMB: number, label = "File"): RuleFn =>
    (v) => v instanceof File && v.size > maxMB * 1024 * 1024
      ? `${label} must be under ${maxMB}MB`
      : null,
};
