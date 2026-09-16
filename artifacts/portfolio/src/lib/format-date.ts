/**
 * Single source of truth for portfolio-side date formatting. Mirrors the
 * admin app's `src/lib/format-date.ts` so section components and the blog
 * utilities don't re-implement (and drift on) the same Intl options.
 */

const DATE_ONLY = { month: "long", day: "numeric", year: "numeric" } as const;
const MONTH_YEAR = { month: "long", year: "numeric" } as const;

/** Format an ISO date as a long-form date ("January 5, 2024"). Null/undefined/empty → "". */
export function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", DATE_ONLY);
}

/**
 * Format a `YYYY-MM` grouping key ("2026-04") as a month heading
 * ("April 2026", or the Arabic month name for `lang="ar"`). Keys that
 * don't start with a YYYY-MM date pass through unchanged.
 */
export function formatMonthYear(key: string, lang: "en" | "ar" = "en"): string {
  if (/^\d{4}-\d{2}/.test(key)) {
    const [year, month] = key.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", MONTH_YEAR);
    }
  }
  return key;
}
