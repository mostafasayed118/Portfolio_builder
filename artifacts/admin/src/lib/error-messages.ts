export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Match on a lowercased copy so casing doesn't affect detection (e.g.
    // "Network error" must map the same as "network error"), while still
    // returning the original message when nothing matches.
    const msg = error.message.toLowerCase();
    if (msg.includes("network") || msg.includes("fetch")) {
      return "Connection error — check your internet connection";
    }
    if (msg.includes("401") || msg.includes("unauthorized")) {
      return "Session expired — please log in again";
    }
    if (msg.includes("403") || msg.includes("forbidden")) {
      return "You do not have permission to access this";
    }
    if (msg.includes("404")) {
      return "This content no longer exists";
    }
    return error.message;
  }
  return "Something went wrong on our end. Please try again.";
}

export type ErrorCategory = "network" | "auth" | "forbidden" | "not_found" | "timeout" | "unknown";

export function categorizeError(error: unknown): { category: ErrorCategory; message: string } {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("network") || msg.includes("fetch")) return { category: "network", message: getErrorMessage(error) };
    if (msg.includes("401") || msg.includes("unauthorized")) return { category: "auth", message: getErrorMessage(error) };
    if (msg.includes("403") || msg.includes("forbidden")) return { category: "forbidden", message: getErrorMessage(error) };
    if (msg.includes("404")) return { category: "not_found", message: getErrorMessage(error) };
    if (msg.includes("timeout") || msg.includes("aborted")) return { category: "timeout", message: "Request timed out" };
    return { category: "unknown", message: error.message };
  }
  return { category: "unknown", message: "Something went wrong on our end. Please try again." };
}
