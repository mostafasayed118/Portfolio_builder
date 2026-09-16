/**
 * App-level logger entry point.
 *
 * One-line shim over the shared implementation in
 * `@workspace/app-infra/logger` (byte-identical in admin and portfolio
 * before the extraction; now maintained in one place). Apps keep importing
 * `@/lib/logger` — downstream imports never change.
 */
export { logError, logInfo, logWarn } from "@workspace/app-infra/logger";
