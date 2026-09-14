import { useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { AuditEntryCard } from "./AuditEntryCard";

const AUDIT_PAGE_LIMIT = 25;

export default function AuditLogPage() {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const query = useInfiniteQuery({
    queryKey: ["audit", entityFilter],
    queryFn: async ({ pageParam }) => {
      const res = await api.audit.list({
        entityType: entityFilter === "all" ? undefined : entityFilter,
        limit: AUDIT_PAGE_LIMIT,
        offset: pageParam,
      });
      if (!res.success) throw new Error(res.message);
      if (!res.data) throw new Error("Audit response is missing data");
      return res.data;
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.pagination?.hasMore) return undefined;
      const fetchedRows = allPages.reduce(
        (sum, page) => sum + (page.data?.length ?? 0),
        0,
      );
      return fetchedRows;
    },
  });

  const rows = query.data?.pages.flatMap((page) => page.data ?? []) ?? [];
  const total = query.data?.pages[0]?.pagination?.total ?? 0;

  if (query.isLoading) return <AdminLoadingState variant="audit" />;

  if (query.isError) {
    return (
      <AdminErrorState
        title="Failed to load audit log"
        message={query.error?.message}
        onRetry={() => query.refetch()}
        iconClassName="h-10 w-10 text-destructive"
      />
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

      {rows.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No audit log entries found.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((entry) => (
            <AuditEntryCard key={entry.id} entry={entry} />
          ))}
        </div>
      )}

      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void query.fetchNextPage()}
            disabled={query.isFetchingNextPage}
          >
            {query.isFetchingNextPage ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
