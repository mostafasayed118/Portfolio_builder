import { RotateCw } from "lucide-react";
import { Badge } from "@workspace/ui";

/**
 * Small inline badge shown next to a tool result when Gemini needed more
 * than one attempt to answer (the API returns `attempts` on every success).
 * Visible only when retries actually happened — a first-try call stays quiet.
 */
export function RetryNotice({ attempts }: { attempts?: number }) {
  if (!attempts || attempts <= 1) return null;
  return (
    <Badge
      variant="outline"
      data-testid="retry-notice"
      title={`Gemini answered on attempt ${attempts} of ${attempts} (${attempts - 1} retr${attempts === 2 ? "y" : "ies"})`}
      className="gap-1 text-muted-foreground"
    >
      <RotateCw className="h-3 w-3" />
      retried {attempts - 1}×
    </Badge>
  );
}
