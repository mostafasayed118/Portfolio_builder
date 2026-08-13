/**
 * App-level logger entry point.
 *
 * Internally re-exports `@workspace/logging` after wiring up the
 * Vite-specific `import.meta.env.DEV` check. This lets the shared
 * lib stay framework-agnostic while the app gets a simple
 * `import { logError } from "@/lib/logger"` API that just works.
 *
 * Usage in routes / components:
 *   import { logError, logWarn, logInfo } from "@/lib/logger";
 *   logError("Failed to fetch skills", err, "SkillsManager");
 *
 * In DEV (`pnpm dev`), the output is pretty and coloured.
 * In PROD (`pnpm build`), the output is single-line JSON for log
 * aggregation (Loki, CloudWatch, etc.).
 */
import { configureLogger, logError, logInfo, logWarn } from "@workspace/logging";

configureLogger(() => ({ dev: import.meta.env.DEV }));

export { logError, logInfo, logWarn };
