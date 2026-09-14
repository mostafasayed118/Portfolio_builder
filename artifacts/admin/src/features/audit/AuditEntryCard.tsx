import { Clock } from "lucide-react";
import { Badge, Card, CardContent } from "@workspace/ui";
import type { AuditEntry } from "@workspace/api-client-react";

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface AuditEntryCardProps {
  entry: AuditEntry;
}

export function AuditEntryCard({ entry }: AuditEntryCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {entry.entity_type}
              </Badge>
              <span className="text-xs text-muted-foreground">
                v{entry.version}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground truncate">
              {entry.entity_id}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
            {entry.changed_by && (
              <span className="truncate max-w-[120px]">
                {entry.changed_by}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(entry.created_at)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
