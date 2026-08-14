import { MessageSquare, Code2, FolderKanban, TrendingUp, AlertCircle } from "lucide-react";
import { Card, CardContent, Skeleton } from "@workspace/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { useEntityQuery, useUnreadCountQuery } from "@/lib/use-entity-query";
import { StatsCard } from "./StatsCard";
import { AdminErrorState } from "./AdminErrorState";

export function StatsBar() {
  const queries = {
    unread: useUnreadCountQuery(),
    skills: useEntityQuery<unknown[]>("skills", (uid) => api.skills.list(uid ?? undefined) as unknown as Promise<{ success: true; data?: unknown[] } | { success: false; message: string }>, { enabled: isSupabaseConfigured }),
    projects: useEntityQuery<unknown[]>("projects", (uid) => api.projects.list(uid ?? undefined) as unknown as Promise<{ success: true; data?: unknown[] } | { success: false; message: string }>, { enabled: isSupabaseConfigured }),
  };

  const { unread, skills, projects } = queries;
  const isLoading = unread.isLoading || skills.isLoading || projects.isLoading;
  const errorObj = unread.error || skills.error || projects.error;

  const handleRetry = () => {
    unread.refetch();
    skills.refetch();
    projects.refetch();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (unread.isError || skills.isError || projects.isError) {
    return (
      <AdminErrorState
        title="Failed to load dashboard stats"
        error={errorObj}
        onRetry={handleRetry}
        wrapperClassName="mb-8 flex flex-col items-center justify-center min-h-32 gap-3 p-6"
        iconClassName="h-10 w-10 text-destructive"
      />
    );
  }

  const showSeedWarning = (projects.data ?? []).length === 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
      <StatsCard
        label="Unread Messages"
        value={unread.data ?? "–"}
        icon={MessageSquare}
        color="text-blue-500"
      />
      <StatsCard
        label="Skills"
        value={skills.data?.length ?? "–"}
        icon={Code2}
        color="text-emerald-500"
      />
      <StatsCard
        label="Projects"
        value={projects.data?.length ?? "–"}
        icon={FolderKanban}
        color="text-violet-500"
      />
      <StatsCard
        label="Status"
        value="Live"
        icon={TrendingUp}
        color="text-green-500"
      />
      {showSeedWarning && (
        <Card className="col-span-full border-amber-500/30 bg-amber-500/5">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                No portfolio data found. Click "Import Static Data" to populate content.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
