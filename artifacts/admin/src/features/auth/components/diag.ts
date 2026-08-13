/**
 * Diagnostic logging helper for the auth module.
 *
 * Prefixes all logs with `[auth-guard]` so the user can filter the
 * DevTools console by this tag alone. All output is gated on
 * `import.meta.env.DEV` so production builds stay quiet.
 */
const TAG_AUTH = "[auth-guard]";

export function diag(...args: unknown[]): void {
  if (!import.meta.env.DEV) return;
  // eslint-disable-next-line no-console
  console.log(TAG_AUTH, ...args);
}
