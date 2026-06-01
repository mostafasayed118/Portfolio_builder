export function logError(message: string, error: unknown, context?: string): void {
  if (import.meta.env.DEV) {
    console.error(`[${context ?? "App"}] ${message}`, error);
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
}
