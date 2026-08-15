import { authLogger } from "./auth-logger";

/**
 * Diagnostic logging helper for the auth module.
 *
 * Prefixes all logs with `[auth-guard]` (the shared auth logger's default
 * context) so the user can filter the DevTools console by this tag alone.
 * The logger is dev-only, so production builds stay quiet — same behavior
 * as the raw `console.log` it replaced.
 */
function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function diag(...args: unknown[]): void {
  authLogger.logDebug(args.map(stringifyArg).join(" "));
}
