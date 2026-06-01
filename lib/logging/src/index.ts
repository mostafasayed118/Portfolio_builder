type LogLevel = "error" | "warn" | "info";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: string;
  error?: unknown;
  timestamp: string;
}

type EnvProvider = () => { dev: boolean };

let envProvider: EnvProvider = () => ({ dev: true });

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

export function logError(message: string, error: unknown, context?: string): void {
  const entry: LogEntry = {
    level: "error",
    message,
    context,
    error: serializeError(error),
    timestamp: new Date().toISOString(),
  };

  if (isDev()) {
    console.error(`[${context ?? "App"}] ${message}`, error);
  } else {
    console.error(JSON.stringify(entry));
  }
}

export function logWarn(message: string, context?: string): void {
  const entry: LogEntry = {
    level: "warn",
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (isDev()) {
    console.warn(`[${context ?? "App"}] ${message}`);
  } else {
    console.warn(JSON.stringify(entry));
  }
}

export function logInfo(message: string, context?: string): void {
  const entry: LogEntry = {
    level: "info",
    message,
    context,
    timestamp: new Date().toISOString(),
  };

  if (isDev()) {
    console.info(`[${context ?? "App"}] ${message}`);
  } else {
    console.info(JSON.stringify(entry));
  }
}
