// Type declarations for @sentry/react — only loaded when VITE_SENTRY_DSN is set.
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
