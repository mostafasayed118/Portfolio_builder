// ============================================================================
// Shared CV upload bounds — single canonical definition for every CV schema.
// The api-zod cv schema mirrors these values (see lib/api-zod/src/cv.ts);
// cross-test tripwires in both drift-guard suites pin them equal.
// ============================================================================

export const CV_MAX_MB = 5;
export const CV_EXT = ".pdf";
