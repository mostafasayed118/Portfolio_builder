/**
 * Single source of truth for admin-side date formatting. Previously
 * re-implemented (with drift) in PostsManager, MessagesManager, CvManager,
 * and the analytics dashboard.
 */

const DATE_ONLY = { month: "short", day: "numeric", year: "numeric" } as const;
const DATE_TIME = { ...DATE_ONLY, hour: "2-digit", minute: "2-digit" } as const;

/** Format an ISO timestamp as a short date ("Feb 1, 2024"). Null/undefined → em dash. */
export function formatDate(ts?: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", DATE_ONLY);
}

/** Format an ISO timestamp as a short date + time ("Feb 1, 2024, 03:24 PM"). */
export function formatDateTime(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", DATE_TIME);
}

/**
 * Format a bare `YYYY-MM-DD` aggregation key (as produced by the analytics
 * GROUP-BY-day responses) as a chart-axis label ("Feb 1"). The `T00:00:00`
 * suffix anchors the parse to local midnight so a UTC date key never shifts
 * to the previous day.
 */
export function formatDateKey(day: string): string {
  return new Date(day + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
