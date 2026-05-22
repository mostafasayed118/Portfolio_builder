type LogLevel = "error" | "warn" | "info";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
  timestamp: string;
}

export function logError(message: string, error: unknown, context?: string): void {
  const entry: LogEntry = {
    level: "error",
    message,
    context,
    error: error instanceof Error
      ? { name: error.name, message: error.message, stack: error.stack }
      : error,
    timestamp: new Date().toISOString(),
  };

  if (import.meta.env.DEV) {
    console.error(`[${context ?? "App"}] ${message}`, error);
  }

  if (import.meta.env.PROD) {
    console.error(JSON.stringify(entry));
  }
}

export function logWarn(message: string, context?: string): void {
  if (import.meta.env.DEV) {
    console.warn(`[${context ?? "App"}] ${message}`);
  }
}

export function logInfo(message: string, context?: string): void {
  if (import.meta.env.DEV) {
    console.info(`[${context ?? "App"}] ${message}`);
  }
  if (import.meta.env.PROD) {
    console.info(JSON.stringify({ level: "info", message, context, timestamp: new Date().toISOString() }));
  }
}
