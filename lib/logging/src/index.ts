/* eslint-disable no-console -- this module IS the sanctioned console boundary;
   every other module should route logging through these functions instead. */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

type EnvProvider = () => { dev: boolean };

let envProvider: EnvProvider = () => ({ dev: true });

/**
 * Optional error capture callback. Apps wire this up to forward
 * `logError` calls to Sentry (or any other error monitor) behind
 * an env var gate.
 *
 * Usage in admin/src/main.tsx:
 *   import { setCaptureError } from "@workspace/logging";
 *   if (import.meta.env.VITE_SENTRY_DSN) {
 *     import("@sentry/react").then(({ init, captureException }) => {
 *       init({ dsn: import.meta.env.VITE_SENTRY_DSN });
 *       setCaptureError(captureException);
 *     });
 *   }
 */
let captureError: ((error: unknown, extra?: Record<string, unknown>) => void) | null = null;

export function setCaptureError(fn: ((error: unknown, extra?: Record<string, unknown>) => void) | null): void {
  captureError = fn;
}

export function configureLogger(provider: EnvProvider) {
  envProvider = provider;
}

function isDev(): boolean {
  try {
    return envProvider().dev;
  } catch {
    return true;
  }
}

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return error;
}

function log(level: LogLevel, message: string, extra?: { error?: unknown; context?: string; metadata?: Record<string, unknown> }): void {
  const entry: LogEntry = {
    level,
    message,
    context: extra?.context,
    error: extra?.error ? serializeError(extra.error) : undefined,
    metadata: extra?.metadata,
    timestamp: new Date().toISOString(),
  };

  // Forward errors to Sentry when the adapter is wired up
  if (level === "error" && captureError && extra?.error) {
    captureError(extra.error, {
      message,
      context: extra.context,
      ...extra.metadata,
    });
  }

  if (isDev()) {
    const prefix = `[${extra?.context ?? "App"}]`;
    const meta = extra?.metadata ? ` ${JSON.stringify(extra.metadata)}` : "";
    const devMsg = `${prefix} ${message}${meta}`;
    if (level === "error") console.error(devMsg, extra?.error ?? "");
    else if (level === "warn") console.warn(devMsg);
    else console.log(devMsg);
  } else {
    const msg = JSON.stringify(entry);
    if (level === "warn" || level === "error") {
      console.error(msg);
    } else {
      console.log(msg);
    }
  }
}

export function logError(message: string, error: unknown, context?: string, metadata?: Record<string, unknown>): void {
  log("error", message, { error, context, metadata });
}

export function logWarn(message: string, context?: string, metadata?: Record<string, unknown>): void {
  log("warn", message, { context, metadata });
}

export function logInfo(message: string, context?: string, metadata?: Record<string, unknown>): void {
  log("info", message, { context, metadata });
}

export function logDebug(message: string, context?: string, metadata?: Record<string, unknown>): void {
  log("debug", message, { context, metadata });
}
