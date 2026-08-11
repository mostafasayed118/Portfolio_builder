// Type declarations for @sentry/react — only loaded when VITE_SENTRY_DSN is set.
// The package is a devDependency that may not be installed in CI; these
// ambient declarations let the dynamic import() resolve at typecheck time.
//
// Remove this file once `@sentry/react` is installed as a regular dependency.

declare module "@sentry/react" {
  interface BrowserOptions {
    dsn?: string;
    environment?: string;
    [key: string]: unknown;
  }
  export function init(options: BrowserOptions): void;
  export function captureException(
    error: unknown,
    captureContext?: { extra?: Record<string, unknown> },
  ): string;
}
