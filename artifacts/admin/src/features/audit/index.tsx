import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { AlertCircle, RefreshCw, Clock } from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui";

interface AuditEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  version: number;
  data: unknown;
  changed_by: string | null;
  created_at: string;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const limit = 25;

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit", entityFilter],
    queryFn: async () => {
      const res = await api.audit.list({
        entityType: entityFilter === "all" ? undefined : entityFilter,
        limit,
        offset: 0,
      });
      if (!res.success) throw new Error(res.message);
      return res.data!;
    },
  });

  useEffect(() => {
    setItems([]);
    setTotal(0);
    setHasMore(false);
  }, [entityFilter]);

  useEffect(() => {
    if (!data) return;
    const next = (data.data ?? []) as AuditEntry[];
    const pag = data.pagination;
    setItems(next);
    setTotal(pag?.total ?? 0);
    setHasMore((pag?.hasMore ?? false) && next.length === limit);
  }, [data, limit]);

  const loadMore = async () => {
    if (isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await api.audit.list({
        entityType: entityFilter === "all" ? undefined : entityFilter,
        limit,
        offset: items.length,
      });
      if (!res.success) throw new Error(res.message);
      const next = (res.data?.data ?? []) as AuditEntry[];
      setItems(prev => [...prev, ...next]);
      setTotal(res.data?.pagination?.total ?? total);
      setHasMore((res.data?.pagination?.hasMore ?? false) && next.length === limit);
    } catch {
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">Failed to load audit log</p>
        <p className="text-sm text-muted-foreground">{error?.message}</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track content changes across the portfolio.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v)}>
          <SelectTrigger className="w-48 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="hero_content">Hero</SelectItem>
            <SelectItem value="about_content">About</SelectItem>
            <SelectItem value="skills">Skills</SelectItem>
            <SelectItem value="projects">Projects</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="certifications">Certifications</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-muted-foreground">
          {total} changes
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No audit log entries found.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((entry) => (
            <Card key={entry.id}>
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
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={isLoadingMore}>
            {isLoadingMore ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}