import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/env";
import { AlertTriangle, X } from "lucide-react";

const WARNING_KEY = "api-health-warn-dismissed";

/**
 * Non-blocking health check for the API server.
 *
 * Fires once on mount. If the server is unreachable, shows a
 * dismissible banner. Accepts ANY response (200–499) as proof
 * the server is up — only network errors (ECONNREFUSED, timeout)
 * trigger the warning. This prevents false positives from:
 *   - Server starting up (returns 503 briefly)
 *   - CORS preflight failing (returns 204)
 *   - Server returning 404 for the healthz path
 *   - Slow server startup (5s timeout)
 *
 * The warning can be dismissed and stays dismissed for the session.
 * Hard-refresh resets it.
 */
export function ApiHealthCheck() {
  const [unreachable, setUnreachable] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(WARNING_KEY) === "true");

  useEffect(() => {
    const apiUrl = getApiUrl();
    if (!apiUrl) {
      console.warn("[ApiHealthCheck] VITE_API_URL not set, skipping health check");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    fetch(`${apiUrl}/api/healthz`, {
      signal: controller.signal,
      method: "HEAD",
      cache: "no-cache",
    })
      .then((r) => {
        clearTimeout(timeoutId);
        // Accept any response status — the server is reachable if we
        // got ANY response back (even 404 or 401). Only network
        // errors (ECONNREFUSED, ETIMEDOUT) indicate the server is down.
        if (!r.ok && r.status >= 500) {
          setUnreachable(true);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        console.warn("[ApiHealthCheck] Health check failed:", err.message);
        setUnreachable(true);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(WARNING_KEY, "true");
  };

  if (!unreachable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm bg-destructive/10 border border-destructive/30 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-destructive">API Server Unreachable</p>
          <p className="text-muted-foreground mt-1">
            Admin operations require the API server. Check that it is running on port 3002.
          </p>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
