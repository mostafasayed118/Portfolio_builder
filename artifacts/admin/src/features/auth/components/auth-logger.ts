import { createLogger } from "@workspace/logging";

/**
 * Shared logger for the admin auth layer.
 *
 * The auth flow was the last place using raw `console` calls (with eslint
 * no-console exemptions). Routing them through `createLogger` keeps
 * `@workspace/logging` the single sanctioned console boundary, so no file
 * needs an allowlist entry anymore.
 *
 * `defaultContext: "auth-guard"` reproduces the previous `[auth-guard]`
 * prefix on every line, and `devOnly: true` preserves the old "silent in
 * production builds" behavior of the diagnostics it replaced.
 */
export const authLogger = createLogger({
  env: () => ({ dev: import.meta.env.DEV }),
  defaultContext: "auth-guard",
  devOnly: true,
});
