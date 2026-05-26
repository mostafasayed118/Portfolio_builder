import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Code2, FolderKanban, TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, Button, Skeleton } from "@workspace/ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { useViewingUser } from "@/lib/viewing-user-context";
import { StatsCard } from "./StatsCard";

export function StatsBar() {
  const { viewingUserId } = useViewingUser();

  const queries = {
    unread: useQuery({
      queryKey: ["unreadCount", viewingUserId],
      queryFn: async () => {
        const res = await api.messages.unreadCount(viewingUserId ?? undefined);
        if (!res.success) throw new Error(res.message);
        return res.data;
      },
      enabled: isSupabaseConfigured,
      retry: 2,
      retryDelay: 1000,
    }),
    skills: useQuery({
      queryKey: ["skills", viewingUserId],
      queryFn: async () => {
        const res = await api.skills.list(viewingUserId ?? undefined);
        if (!res.success) throw new Error(res.message);
        return res.data;
      },
      enabled: isSupabaseConfigured,
      retry: 2,
      retryDelay: 1000,
    }),
    projects: useQuery({
      queryKey: ["projects", viewingUserId],
      queryFn: async () => {
        const res = await api.projects.list(viewingUserId ?? undefined);
        if (!res.success) throw new Error(res.message);
        return res.data;
      },
      enabled: isSupabaseConfigured,
      retry: 2,
      retryDelay: 1000,
    }),
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
      <div className="mb-8 flex flex-col items-center justify-center min-h-32 gap-3 p-6">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <p className="text-destructive font-medium">Failed to load dashboard stats</p>
        <p className="text-muted-foreground text-sm">{errorObj?.message}</p>
        <Button onClick={handleRetry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
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
