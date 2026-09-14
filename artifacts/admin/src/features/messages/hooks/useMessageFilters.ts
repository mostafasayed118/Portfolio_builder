import { useCallback, useMemo, useState } from "react";
import { useAllMessages, useUnreadCountQuery, type MessagePreset } from "@/lib/use-entity-query";
import { type Message as Msg, isArchived, isUnread } from "@/features/messages/components/MessageCard";

export type MessageFilter = "all" | "unread" | "read" | "archived" | "spam";

/** Either a status chip or a saved compound preset. */
export type MessageView = MessageFilter | MessagePreset;

/** Type guard: is the active view one of the saved compound presets? */
export function isPresetView(view: MessageView): view is MessagePreset {
  return view === "unread_today" || view === "unread_or_archived" || view === "needs_reply";
}

interface UseMessageFiltersInput {
  /** The always-fetched All view — drives the header/chip counts. */
  allMessages: Msg[] | undefined;
  allLoading: boolean;
}

/**
 * Filter/preset/pagination state for the messages screen. The active chip or
 * preset drives a server-side filter on the collection endpoint: status chips
 * page over exactly those rows (not a client-side slice of the first 50
 * fetched) and presets apply a compound view the chips can't express. Every
 * fetch walks the ENTIRE filtered set in batches of 200 — the server's
 * default 50-row page would otherwise truncate each view once more than 50
 * messages exist. `enabled` keeps the filtered fetch off on All.
 */
export function useMessageFilters({ allMessages, allLoading }: UseMessageFiltersInput) {
  const [view, setView] = useState<MessageView>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const isPreset = isPresetView(view);
  const statusParam = !isPresetView(view) && view !== "all" ? view : undefined;
  const presetParam = isPresetView(view) ? view : undefined;
  const { data: filteredMessages, isLoading: filteredLoading } = useAllMessages(
    statusParam,
    presetParam,
    { enabled: view !== "all" },
  );

  const msgs = (view === "all" ? allMessages : filteredMessages) as Msg[] | undefined;
  const isLoading = view === "all" ? allLoading : filteredLoading;
  const activePreset = isPresetView(view) ? view : null;

  // The unread chip and Unread-tab count must match the sidebar badge and the
  // API's unread-count endpoint (status='unread' only). Computing them from
  // the fetched list is wrong: the collection endpoint paginates at 50 rows,
  // so once more than 50 messages exist the local count silently truncates
  // and disagrees with the sidebar. Use the API-backed count instead.
  const { data: unread } = useUnreadCountQuery();
  // Read/archived counts come from the All fetch (always available), never
  // from the filtered page — on the Unread chip the fetched rows are all
  // unread, so counting them would under-report the others.
  const readCount = useMemo(() => allMessages?.filter((m) => !isUnread(m) && !isArchived(m)).length ?? 0, [allMessages]);
  const archivedCount = useMemo(() => allMessages?.filter(isArchived).length ?? 0, [allMessages]);
  const spamCount = useMemo(() => allMessages?.filter((m) => m.is_spam).length ?? 0, [allMessages]);

  const totalMatching = msgs?.length ?? 0;
  const allMatchingIds = useMemo(
    () => (msgs ?? []).map((m) => m.id).filter((id): id is string => !!id),
    [msgs],
  );

  // Server-side filtering makes a client-side `filtered` memo redundant —
  // `msgs` already is the filtered set, so pagination pages over exactly
  // the rows the active chip asked for.
  const paginatedMessages = useMemo(() => {
    const list = msgs ?? [];
    return list.slice((page - 1) * pageSize, page * pageSize);
  }, [msgs, page, pageSize]);

  const changeView = useCallback((v: MessageView) => {
    setView(v);
    setPage(1);
  }, []);

  return {
    view,
    isPreset,
    activePreset,
    msgs,
    isLoading,
    unread,
    readCount,
    archivedCount,
    spamCount,
    totalMatching,
    allMatchingIds,
    page,
    setPage,
    pageSize,
    setPageSize,
    paginatedMessages,
    changeView,
  };
}
