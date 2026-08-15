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

type CaptureFn = (error: unknown, extra?: Record<string, unknown>) => void;

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
let captureError: CaptureFn | null = null;

export function setCaptureError(fn: CaptureFn | null): void {
  captureError = fn;
}

export function configureLogger(provider: EnvProvider): void {
  envProvider = provider;
}

function isDev(getEnv: EnvProvider): boolean {
  try {
    return getEnv().dev;
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

/** Per-logger state captured by createLogger and read on every write. */
interface WriteState {
  getEnv: EnvProvider;
  /** Undefined → fall back to the module-level setCaptureError sink. */
  captureError?: CaptureFn | null;
  /** Context used when a call doesn't pass one explicitly. */
  defaultContext?: string;
  /** When true, drop messages entirely outside dev (diagnostics). */
  devOnly?: boolean;
}

function write(
  level: LogLevel,
  message: string,
  extra: { error?: unknown; context?: string; metadata?: Record<string, unknown> },
  state: WriteState,
): void {
  const dev = isDev(state.getEnv);
  if (state.devOnly && !dev) return;

  const context = extra?.context ?? state.defaultContext;

  const entry: LogEntry = {
    level,
    message,
    context,
    error: extra?.error ? serializeError(extra.error) : undefined,
    metadata: extra?.metadata,
    timestamp: new Date().toISOString(),
  };

  // Forward errors to the capture sink (Sentry or similar). A logger-level
  // captureError option wins; otherwise the module-level sink is used.
  const sink = state.captureError !== undefined ? state.captureError : captureError;
  if (level === "error" && sink && extra?.error) {
    sink(extra.error, {
      message,
      context,
      ...extra.metadata,
    });
  }

  if (dev) {
    const prefix = `[${context ?? "App"}]`;
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

export interface LoggerOptions {
  /** Resolves whether the logger runs in dev (pretty) or prod (JSON) mode. */
  env?: EnvProvider;
  /** Optional error capture sink; omitted → the module-level setCaptureError. */
  captureError?: CaptureFn | null;
  /** Context used when a call doesn't pass one explicitly. */
  defaultContext?: string;
  /** When true, drop messages entirely outside dev (e.g. diagnostics). */
  devOnly?: boolean;
}

export interface Logger {
  logError(message: string, error: unknown, context?: string, metadata?: Record<string, unknown>): void;
  logWarn(message: string, context?: string, metadata?: Record<string, unknown>): void;
  logInfo(message: string, context?: string, metadata?: Record<string, unknown>): void;
  logDebug(message: string, context?: string, metadata?: Record<string, unknown>): void;
}

/**
 * Shared logger bootstrap. Creates an isolated logger with its own env
 * provider, capture sink, default context, and dev-only gate, so entry
 * points (apps, feature modules, diagnostics) never touch console directly.
 *
 * The module-level `logError/logWarn/logInfo/logDebug` exports are a
 * default instance of this — `configureLogger`/`setCaptureError` keep
 * wiring that default instance's shared state.
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const getEnv = options.env ?? (() => ({ dev: true }));
  const state: WriteState = {
    getEnv,
    captureError: options.captureError,
    defaultContext: options.defaultContext,
    devOnly: options.devOnly,
  };
  return {
    logError: (message, error, context, metadata) =>
      write("error", message, { error, context, metadata }, state),
    logWarn: (message, context, metadata) =>
      write("warn", message, { context, metadata }, state),
    logInfo: (message, context, metadata) =>
      write("info", message, { context, metadata }, state),
    logDebug: (message, context, metadata) =>
      write("debug", message, { context, metadata }, state),
  };
}

// Default instance backing the module-level exports. Its env reads the live
// `envProvider` (configureLogger) and its capture sink falls back to the live
// module-level `captureError` (setCaptureError), so both keep working.
const defaultLogger = createLogger({ env: () => envProvider() });

export const logError = defaultLogger.logError;
export const logWarn = defaultLogger.logWarn;
export const logInfo = defaultLogger.logInfo;
export const logDebug = defaultLogger.logDebug;
