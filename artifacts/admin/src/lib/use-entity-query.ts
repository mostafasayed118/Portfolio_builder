import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useViewingUser } from "./viewing-user-context";
import { api } from "./api-client";
import type { Certification, Experience, Project, Skill, Message } from "@workspace/supabase/types";

/** The `{ success, data }` envelope the API returns on success. */
type ApiResult<T> = { success: true; data?: T } | { success: false; message: string };

/** The paginated wrapper collection endpoints nest inside `data`. */
type Paginated<T> = {
  data?: T;
  pagination?: { total: number; limit: number; offset: number; hasMore: boolean };
};

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
  entity: "projects" | "skills" | "experience" | "certifications" | "messages" | "posts",
  fetcher: (userId: string | null) => Promise<ApiResult<Paginated<T>>>,
  options?: Omit<UseQueryOptions<T, Error, T, readonly unknown[]>, "queryKey" | "queryFn">,
  /** Extra query-key parts so filtered variants cache separately and refetch on change. */
  keyParts: readonly unknown[] = [],
) {
  const { viewingUserId } = useViewingUser();
  return useQuery<T, Error, T, readonly unknown[]>({
    queryKey: [entity, viewingUserId, ...keyParts] as readonly unknown[],
    queryFn: async () => {
      const res = await fetcher(viewingUserId);
      if (!res.success) throw new Error(res.message);
      // Collection endpoints return { data: [...], pagination } inside
      // `res.data`. Unwrap the array so managers receive a real list —
      // otherwise `projects?.filter(...)` etc. crash with
      // "X.filter is not a function".
      const payload = res.data;
      if (payload && Array.isArray(payload.data)) {
        return payload.data as T;
      }
      return payload as unknown as T;
    },
    ...options,
  });
}

/**
 * Batch size for the messages list fetch. The server clamps `limit` to its
 * MAX_LIMIT (200), so one request per full batch; the loop stops on a short
 * page, which the server guarantees once range() passes the end of the set.
 */
export const MESSAGE_BATCH_SIZE = 200;

export type MessageStatus = "unread" | "read" | "archived" | "spam" | "all";

export type MessagePreset = "unread_today" | "unread_or_archived" | "needs_reply";

/**
 * Fetch EVERY message matching a status filter or saved preset, in batches
 * of the server's max page size, so the Unread/Read/Archived chips and the
 * preset views page over the complete set instead of stopping at the first
 * 50 rows.
 *
 * The collection endpoint paginates at 50 by default — a single fetch would
 * silently truncate every view once more than 50 messages exist. This hook
 * walks the whole filtered set with `limit=200&offset=N` until a short page
 * and returns the concatenated rows; the caller's client-side pagination
 * then pages over the true total (and select-all / counts see every row).
 */
export function useAllMessages(
  status?: MessageStatus,
  preset?: MessagePreset,
  options?: Omit<UseQueryOptions<Message[], Error, Message[], readonly unknown[]>, "queryKey" | "queryFn">,
) {
  const { viewingUserId } = useViewingUser();
  return useQuery<Message[], Error, Message[], readonly unknown[]>({
    queryKey: [
      "messages",
      viewingUserId,
      status ?? "all",
      preset ?? "default",
    ] as readonly unknown[],
    queryFn: async () => {
      const rows: Message[] = [];
      let offset = 0;
      for (;;) {
        const res = await api.messages.list(
          viewingUserId ?? undefined,
          status,
          MESSAGE_BATCH_SIZE,
          offset,
          preset,
        );
        if (!res.success) throw new Error(res.message);
        const batch = res.data?.data ?? [];
        rows.push(...batch);
        // A page smaller than the batch size means the filtered set is
        // exhausted — range() past the end yields an empty page, so the
        // server can never hand back a full page forever.
        if (batch.length < MESSAGE_BATCH_SIZE) break;
        offset += MESSAGE_BATCH_SIZE;
      }
      return rows;
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
