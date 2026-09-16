// Type declarations for @sentry/react — only loaded when VITE_SENTRY_DSN is set.
// @sentry/react is an optional devDependency that may not be installed in
// every environment (e.g. CI); these ambient declarations let the dynamic
// import() resolve at typecheck time.

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
