import { useQuery, type UseQueryOptions } from "@tanstack/react-query";
import { useViewingUser } from "./viewing-user-context";
import { api } from "./api-client";
import { logWarn } from "@/lib/logger";
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
    queryFn: async (): Promise<T> => {
      const res = await fetcher(viewingUserId);
      if (!res.success) throw new Error(res.message);
      // Collection endpoints return { data: [...], pagination } inside
      // `res.data`. Unwrap the array so managers receive a real list —
      // otherwise `projects?.filter(...)` etc. crash with
      // "X.filter is not a function".
      const payload = res.data;
      if (payload && Array.isArray(payload.data)) {
        return payload.data;
      }
      // Tolerate responses that hand back the rows array directly (no
      // pagination envelope) — test doubles and older endpoints do this.
      // The unknown detour plus cast is the only way to return a runtime
      // array as the hook's array-typed T without leaking `any` upstream.
      const raw: unknown = payload;
      if (Array.isArray(raw)) {
        return raw as T;
      }
      throw new Error(
        `Unexpected ${entity} response — expected a paginated list envelope`,
      );
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

/**
 * Status filter for the messages list endpoint. "unread"/"read"/"archived"
 * map to the DB `status` column; "spam" filters `is_spam = true` and never
 * maps to the DB status column; "all" means "no status filter".
 */
export type MessageStatusFilter = "unread" | "read" | "archived" | "spam" | "all";

export type MessagePreset = "unread_today" | "unread_or_archived" | "needs_reply";

/**
 * Hard ceiling on the pagination walk in `fetchAllMessages` — a runaway
 * filter set can no longer fetch forever. At the 200-row batch size this
 * caps a single hook run at 2,000 rows; the already-loaded rows stay usable
 * and one warning is logged.
 */
export const MAX_MESSAGE_PAGES = 10;

/**
 * Fetch EVERY message matching a status filter or saved preset, in batches
 * of the server's max page size, so the Unread/Read/Archived chips and the
 * preset views page over the complete set instead of stopping at the first
 * 50 rows.
 *
 * Page one is fetched on its own to learn the filtered set's `total` from
 * the envelope's pagination block; the remaining pages (bounded by
 * {@link MAX_MESSAGE_PAGES}) then load concurrently. Rows stay in offset
 * order because Promise.all preserves result order. Extracted from
 * `useAllMessages` so the pagination cap is unit-testable without a React
 * Query harness.
 */
export async function fetchAllMessages(
  viewingUserId: string | null | undefined,
  status?: MessageStatusFilter,
  preset?: MessagePreset,
): Promise<Message[]> {
  const first = await api.messages.list(
    viewingUserId ?? undefined,
    status,
    MESSAGE_BATCH_SIZE,
    0,
    preset,
  );
  if (!first.success) throw new Error(first.message);
  const firstBatch = first.data?.data ?? [];
  // A page smaller than the batch size means the filtered set is
  // exhausted — range() past the end yields an empty page, so the
  // server can never hand back a full page forever.
  if (firstBatch.length < MESSAGE_BATCH_SIZE) return [...firstBatch];

  const total = first.data?.pagination?.total;
  const knownPages =
    typeof total === "number" && total > 0
      ? Math.ceil(total / MESSAGE_BATCH_SIZE)
      : MAX_MESSAGE_PAGES;
  const pageCount = Math.min(knownPages, MAX_MESSAGE_PAGES);

  const rest = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, i) =>
      api.messages.list(
        viewingUserId ?? undefined,
        status,
        MESSAGE_BATCH_SIZE,
        (i + 1) * MESSAGE_BATCH_SIZE,
        preset,
      ),
    ),
  );

  const rows = [...firstBatch];
  for (const res of rest) {
    if (!res.success) throw new Error(res.message);
    rows.push(...(res.data?.data ?? []));
  }

  // Warn when the cap truncated the set: either the envelope carried no
  // total (unknown size) or the total exceeds what the capped pages hold.
  if (total === undefined || total > pageCount * MESSAGE_BATCH_SIZE) {
    logWarn(
      `useAllMessages: hit the ${MAX_MESSAGE_PAGES}-page cap ` +
        `(${MAX_MESSAGE_PAGES * MESSAGE_BATCH_SIZE} rows) — further pages not fetched`,
    );
  }
  return rows;
}

/**
 * React Query wrapper around {@link fetchAllMessages} — walks the whole
 * filtered set (capped at {@link MAX_MESSAGE_PAGES} pages) so client-side
 * pagination and select-all see every row.
 */
export function useAllMessages(
  status?: MessageStatusFilter,
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
    queryFn: () => fetchAllMessages(viewingUserId, status, preset),
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
      return res.data ?? 0;
    },
  });
}

export type { Project, Skill, Experience, Certification, Message };
