/**
 * App-level logger entry point, shared by the admin and portfolio SPAs.
 *
 * Internally re-exports `@workspace/logging` after wiring up the
 * Vite-specific `import.meta.env.DEV` check. This lets the shared
 * lib stay framework-agnostic while the apps get a simple
 * `import { logError } from "@/lib/logger"` API that just works.
 *
 * Both apps expose this through a one-line re-export shim
 * (`artifacts/{admin,portfolio}/src/lib/logger.ts`), so downstream
 * imports never change.
 *
 * In DEV (`pnpm dev`), the output is pretty and coloured.
 * In PROD (`pnpm build`), the output is single-line JSON for log
 * aggregation (Loki, CloudWatch, etc.).
 */
import { configureLogger, logError, logInfo, logWarn } from "@workspace/logging";

configureLogger(() => ({ dev: import.meta.env.DEV }));

export { logError, logInfo, logWarn };
