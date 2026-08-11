import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useViewingUser } from "./viewing-user-context";
import { api } from "./api-client";
import type { Certification, Experience, Project, Skill, Message } from "@workspace/supabase/types";

/**
 * Hook factory that produces a React Query for a given admin entity,
 * properly keyed by `viewingUserId` so superadmin user-switching
 * refetches the data instead of returning stale data.
 *
 * Without this, every manager used `["projects"]` (or similar) as
 * queryKey, so switching the active user only refreshed the stats
 * bar — the entity lists kept showing the original user's data.
 *
 * Usage:
 *
 *   const { data, isLoading, isError, error, refetch } = useEntityQuery(
 *     "projects",
 *     (uid) => api.projects.list(uid ?? undefined),
 *   );
 */
export function useEntityQuery<T>(
  entity: "projects" | "skills" | "experience" | "certifications" | "messages",
  fetcher: (userId: string | null) => Promise<{ success: true; data?: T } | { success: false; message: string }>,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">,
) {
  const { viewingUserId } = useViewingUser();
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: [entity, viewingUserId] as readonly unknown[],
    queryFn: async () => {
      const res = await fetcher(viewingUserId);
      if (!res.success) throw new Error(res.message);
      return res.data as T;
    },
    ...options,
  });
}

/**
 * Reactive unread-count query keyed by viewingUserId.
 * Lives next to useEntityQuery so the key strategy stays consistent.
 */
export function useUnreadCountQuery() {
  const { viewingUserId } = useViewingUser();
  return useQuery<number, Error, number, readonly unknown[]>({
    queryKey: ["unreadCount", viewingUserId] as readonly unknown[],
    queryFn: async () => {
      const res = await api.messages.unreadCount(viewingUserId ?? undefined);
      if (!res.success) throw new Error(res.message);
      return (res.data ?? 0) as number;
    },
  });
}

export type { Project, Skill, Experience, Certification, Message };
