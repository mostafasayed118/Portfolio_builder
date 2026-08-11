import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/env";
import { AlertTriangle, X } from "lucide-react";

export function ApiHealthCheck() {
  const [unreachable, setUnreachable] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("apihc-dismissed") === "1",
  );

  useEffect(() => {
    const apiUrl = getApiUrl();
    if (!apiUrl) return;
    const controller = new AbortController();
    fetch(`${apiUrl}/api/healthz`, { signal: controller.signal, method: "HEAD" })
      .then((r) => { if (!r.ok) setUnreachable(true); })
      .catch(() => setUnreachable(true));
    return () => controller.abort();
  }, []);

  if (!unreachable || dismissed) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm bg-destructive/10 border border-destructive/30 rounded-xl p-4 shadow-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-destructive">API Unreachable</p>
          <p className="text-muted-foreground mt-1">Some features like CV download and contact form may not work.</p>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            sessionStorage.setItem("apihc-dismissed", "1");
          }}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}