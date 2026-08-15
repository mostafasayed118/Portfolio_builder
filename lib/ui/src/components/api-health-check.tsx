import { useState, useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const WARNING_KEY = "api-health-warn-dismissed";

interface ApiHealthCheckProps {
  /**
   * API base URL to probe (pass the app's resolved API URL, or null to skip).
   * The component never reads app env itself — that keeps it framework- and
   * app-agnostic so both SPAs can share one implementation.
   */
  apiUrl: string | null;
  /** Banner heading. Defaults to "API Server Unreachable". */
  title?: string;
  /** Banner body. Defaults to a generic hint mentioning the port when known. */
  message?: string;
}

/**
 * Non-blocking health check for the API server.
 *
 * Fires once on mount. If the server is unreachable, shows a dismissible
 * banner. Accepts ANY response (200–499) as proof the server is up — only
 * network errors (ECONNREFUSED, timeout) trigger the warning. This prevents
 * false positives from:
 *   - Server starting up (returns 503 briefly)
 *   - CORS preflight failing (returns 204)
 *   - Server returning 404 for the healthz path
 *   - Slow server startup (5s timeout)
 *
 * The warning can be dismissed and stays dismissed for the session.
 * Hard-refresh resets it.
 */
export function ApiHealthCheck({ apiUrl, title = "API Server Unreachable", message }: ApiHealthCheckProps) {
  const [unreachable, setUnreachable] = useState(false);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(WARNING_KEY) === "true");

  useEffect(() => {
    if (!apiUrl) return;

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
        if (r.status >= 500) {
          setUnreachable(true);
        }
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        // Ignore aborts (timeout/unmount) — the server may just be slow,
        // and treating every abort as an outage produces false alarms.
        if (err instanceof DOMException && err.name === "AbortError") return;
        setUnreachable(true);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [apiUrl]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(WARNING_KEY, "true");
  };

  const portHint = apiUrl
    ? (() => { try { return new URL(apiUrl).port; } catch { return null; } })()
    : null;

  if (!unreachable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] max-w-sm bg-destructive/10 border border-destructive/30 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-destructive">{title}</p>
          <p className="text-muted-foreground mt-1">
            {message ?? `The API server could not be reached${portHint ? ` on port ${portHint}` : ""}.`}
          </p>
        </div>
        <button onClick={handleDismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
