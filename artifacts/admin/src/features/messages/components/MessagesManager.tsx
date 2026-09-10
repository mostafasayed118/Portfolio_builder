import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui";
import { useToast } from "@workspace/ui";
import {
  Mail,
  Keyboard,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { SHORTCUTS_OPENED_EVENT } from "@/components/ShortcutsDialog";
import { Button, Card, CardContent, Input, Textarea } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { MessageCard, type Message as Msg, isUnread, isArchived } from "@/features/messages/components/MessageCard";
import { MessageFilterBar } from "@/features/messages/components/MessageFilterBar";
import { MessagePresetBar } from "@/features/messages/components/MessagePresetBar";
import { MessagePagination } from "@/features/messages/components/MessagePagination";
import { useAllMessages, useUnreadCountQuery, type MessagePreset } from "@/lib/use-entity-query";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type MessageFilter = "all" | "unread" | "read" | "archived" | "spam";

/** Either a status chip or a saved compound preset. */
type MessageView = MessageFilter | MessagePreset;

export default function MessagesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // The All view: always fetched, drives the header/chip counts and the
  // default tab. Kept separate from the filtered fetch so switching chips
  // never recomputes counts from a filtered page. Fetches EVERY visible
  // row (batched at 200) so the total is real, not the first 50-row page.
  const { data: messages, isLoading: allLoading, isError, error, refetch } = useAllMessages();

  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [view, setView] = useState<MessageView>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // The row most recently toggled — the target of the Gmail-style `x` key
  // (which toggles the focused message like Gmail's checkbox shortcut).
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);
  const [showRestoreAllDialog, setShowRestoreAllDialog] = useState(false);
  // The keyboard-shortcuts help is global now: the `?` / `Shift+?` keys and
  // the modal live in the shell (ShortcutsHelp), so the header icon below
  // only needs to request it via the shared event.
  const openShortcuts = useCallback(() => {
    window.dispatchEvent(new Event(SHORTCUTS_OPENED_EVENT));
  }, []);

  // The active chip or preset drives a server-side filter on the collection
  // endpoint: status chips page over exactly those rows (not a client-side
  // slice of the first 50 fetched) and presets apply a compound view the
  // chips can't express. Every fetch walks the ENTIRE filtered set in
  // batches of 200 — the server's default 50-row page would otherwise
  // truncate each view once more than 50 messages exist. `enabled` keeps
  // the filtered fetch off on All.
  const isPreset =
    view === "unread_today" || view === "unread_or_archived" || view === "needs_reply";
  const statusParam = !isPreset && view !== "all" ? (view as MessageFilter) : undefined;
  const presetParam = isPreset ? (view as MessagePreset) : undefined;
  const { data: filteredMessages, isLoading: filteredLoading } = useAllMessages(
    statusParam,
    presetParam,
    { enabled: view !== "all" },
  );

  const allMsgs = messages as Msg[] | undefined;
  const msgs = (view === "all" ? messages : filteredMessages) as Msg[] | undefined;
  const isLoading = view === "all" ? allLoading : filteredLoading;

  // The unread chip and Unread-tab count must match the sidebar badge and the
  // API's unread-count endpoint (status='unread' only). Computing them from
  // the fetched list is wrong: the collection endpoint paginates at 50 rows,
  // so once more than 50 messages exist the local count silently truncates
  // and disagrees with the sidebar. Use the API-backed count instead.
  const { data: unread } = useUnreadCountQuery();
  // Read/archived counts come from the All fetch (always available), never
  // from the filtered page — on the Unread chip the fetched rows are all
  // unread, so counting them would under-report the others.
  const readCount = useMemo(() => allMsgs?.filter((m) => !isUnread(m) && !isArchived(m)).length ?? 0, [allMsgs]);
  const archivedCount = useMemo(() => allMsgs?.filter(isArchived).length ?? 0, [allMsgs]);
  const spamCount = useMemo(() => allMsgs?.filter((m) => m.is_spam).length ?? 0, [allMsgs]);

  // Server-side filtering makes a client-side `filtered` memo redundant —
  // `msgs` already is the filtered set, so pagination pages over exactly
  // the rows the active chip asked for.
  const paginatedMessages = useMemo(() => {
    const list = msgs ?? [];
    return list.slice((page - 1) * pageSize, page * pageSize);
  }, [msgs, page, pageSize]);

  // Selection toolbar state: the "Select all on page" checkbox operates on
  // the currently rendered page only (not the whole fetched list, which can
  // span multiple pages at 20–50 rows).
  const pageIds = useMemo(
    () => paginatedMessages.map((m) => m.id).filter((id): id is string => !!id),
    [paginatedMessages],
  );
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  // Tab title reflects the current selection (Gmail-style "(N)" prefix), so
  // the selection state is visible even when the tab is unfocused. The base
  // title is captured on mount and restored on unmount.
  useEffect(() => {
    const base = document.title;
    document.title = selectedIds.size > 0 ? `(${selectedIds.size}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [selectedIds.size]);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageSelected, pageIds]);

  // Ctrl/Cmd+A selects (or clears) the whole rendered page — the same toggle
  // as the toolbar checkbox. The hook ignores the shortcut while focus is in
  // an input/textarea, so native select-all-in-field keeps working, and
  // `enabled` gates it while a dialog is open (the selection lives behind
  // the dialog and shouldn't change underneath it).
  const dialogsOpen = !!replyTo || showCleanupDialog || showRestoreAllDialog;
  const selectPageShortcut = useMemo(
    () => [
      {
        key: "a",
        ctrl: true,
        handler: () => {
          if (pageIds.length === 0) return;
          // Confirm the keyboard path: the toggle is silent by itself, so
          // tell the user what it did (E/U already confirm via their bulk
          // action toasts).
          toggleSelectAllOnPage();
          toast({
            title: allPageSelected
              ? "Selection cleared"
              : `Selected ${pageIds.length} on this page`,
          });
        },
        description: "Select all on page",
      },
    ],
    [toggleSelectAllOnPage, allPageSelected, pageIds, toast],
  );
  useKeyboardShortcuts(selectPageShortcut, !dialogsOpen);

  // Gmail-style "Select all N matching": the batched fetcher has already
  // loaded EVERY row matching the active view, so grabbing them all is a
  // local Set over `msgs` — and the follow-up Archive/Restore then hits the
  // whole matching set in ONE bulk call, beyond the current page. Shown only
  // while a partial selection exists and matching rows remain unselected.
  const totalMatching = msgs?.length ?? 0;
  const allMatchingIds = useMemo(
    () => (msgs ?? []).map((m) => m.id).filter((id): id is string => !!id),
    [msgs],
  );
  const canSelectAllMatching = selectedIds.size > 0 && selectedIds.size < totalMatching;

  const selectAllMatching = useCallback(() => {
    setSelectedIds(new Set(allMatchingIds));
  }, [allMatchingIds]);

  const openReply = useCallback((msg: Msg) => {
    setReplyTo(msg);
    setSubject(`Re: ${msg.name}`);
    setBody(`Hi ${msg.name},\n\nThanks for reaching out.\n\n`);
  }, []);

  // Arrow-key navigation moves a cursor (the focused row) through the visible
  // page, so `x` and `r` can act on a row with no mouse interaction at all.
  // The focused row is scrolled into view so the cursor never points at an
  // off-screen message.
  const scrollMessageIntoView = useCallback((id: string) => {
    requestAnimationFrame(() => {
      // `scrollIntoView` isn't implemented in jsdom and is optional on some
      // embedded browsers — degrade gracefully rather than crash navigation.
      document
        .querySelector(`[data-message-id="${id}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
    });
  }, []);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const list = paginatedMessages;
      if (list.length === 0) return;
      const currentIndex = focusedId
        ? list.findIndex((m) => m.id === focusedId)
        : -1;
      // Nothing focused yet: both arrows start at the first row. Otherwise
      // clamp at the list edges (Gmail-style — no wrap-around).
      const nextIndex =
        currentIndex === -1
          ? 0
          : Math.min(list.length - 1, Math.max(0, currentIndex + dir));
      const next = list[nextIndex];
      if (next?.id) {
        setFocusedId(next.id);
        scrollMessageIntoView(next.id);
      }
    },
    [paginatedMessages, focusedId, scrollMessageIntoView],
  );

  const sendReply = async () => {
    if (!replyTo) return;
    if (!body.trim()) {
      toast({ title: "Reply message is required", variant: "destructive" });
      return;
    }
    setSendingReply(true);
    try {
      let sent = false;
      if (replyTo.id) {
        const res = await api.messages.reply(replyTo.id, body);
        sent = (res as { sent?: boolean }).sent === true;
        if (!res.success) throw new Error(res.message);
        await api.messages.markRead(replyTo.id).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      }

      if (sent) {
        setReplyTo(null);
        setBody("");
        toast({ title: "Reply sent", description: `Replied to ${replyTo.email}` });
      } else {
        // Email delivery not configured — fall back to the user's mail client.
        const mailto = `mailto:${replyTo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        setReplyTo(null);
        setBody("");
        toast({ title: "Reply opened in email app (sending not configured)" });
      }
    } catch (err) {
      toast({
        title: "Failed to send reply",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSendingReply(false);
    }
  };

  const handleMarkRead = async (msg: Msg) => {
    try {
      if (msg.id) {
        const res = await api.messages.markRead(msg.id);
        if (!res.success) throw new Error(res.message);
        await queryClient.invalidateQueries({ queryKey: ["messages"] });
        await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      }
    } catch (err) {
      toast({
        title: "Failed to mark as read",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const changeView = (v: MessageView) => {
    setView(v);
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleSelect = useCallback((msg: Msg) => {
    // Interacting with a row makes it the focused message for the `x` key.
    setFocusedId(msg.id ?? null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (msg.id) {
        if (next.has(msg.id)) next.delete(msg.id);
        else next.add(msg.id);
      }
      return next;
    });
  }, []);

  const handleCleanupTestSubmissions = async () => {
    try {
      const res = await api.messages.archiveTestSubmissions();
      if (!res.success) throw new Error(res.message);
      const archived = (res as { data?: { archived?: number } }).data?.archived ?? 0;
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      setShowCleanupDialog(false);
      setSelectedIds(new Set());
      toast({
        title:
          archived > 0
            ? `Archived ${archived} test submission${archived === 1 ? "" : "s"}`
            : "No test submissions to archive",
      });
    } catch (err) {
      toast({
        title: "Failed to archive test submissions",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleRestoreAllArchived = async () => {
    try {
      const res = await api.messages.restoreAllArchived();
      if (!res.success) throw new Error(res.message);
      const restored = (res as { data?: { restored?: number } }).data?.restored ?? 0;
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      setShowRestoreAllDialog(false);
      setSelectedIds(new Set());
      toast({
        title:
          restored > 0
            ? `Restored ${restored} message${restored === 1 ? "" : "s"} to the inbox`
            : "No archived messages to restore",
      });
    } catch (err) {
      toast({
        title: "Failed to restore archived messages",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkArchive = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // When every row matching the active view is selected, archive via the
      // server-side filter in ONE statement — no giant id payload, so it
      // scales to thousands of rows. A partial selection sends the ids.
      const allMatchingSelected = totalMatching > 0 && selectedIds.size >= totalMatching;
      const viewFilter = allMatchingSelected
        ? isPreset
          ? { preset: view as MessagePreset }
          : view === "unread" || view === "read" || view === "spam"
            ? { status: view }
            : undefined
        : undefined;
      const res = viewFilter
        ? await api.messages.bulkArchive({ filter: viewFilter })
        : await api.messages.bulkArchive({ ids });
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      setSelectedIds(new Set());
      toast({
        title: viewFilter
          ? `Archived all ${totalMatching} matching message${totalMatching === 1 ? "" : "s"}`
          : `Archived ${ids.length} message${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      toast({
        title: "Failed to archive messages",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [selectedIds, totalMatching, view, isPreset, queryClient, toast]);

  const handleBulkUnarchive = useCallback(async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      // When every row matching the Archived view is selected, restore via
      // the server-side filter in ONE statement — no giant id payload, so it
      // scales to thousands of archived rows. A partial selection sends ids.
      const allMatchingSelected = totalMatching > 0 && selectedIds.size >= totalMatching;
      const res = allMatchingSelected
        ? await api.messages.bulkUnarchive({ filter: { status: "archived" } })
        : await api.messages.bulkUnarchive({ ids });
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      setSelectedIds(new Set());
      toast({
        title: allMatchingSelected
          ? `Restored all ${totalMatching} matching message${totalMatching === 1 ? "" : "s"}`
          : `Restored ${ids.length} message${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      toast({
        title: "Failed to restore messages",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }, [selectedIds, totalMatching, queryClient, toast]);

  // Arrow-key navigation: moves the keyboard cursor between the rows on the
  // current page. Same guards as the other shortcuts (ignored in inputs,
  // gated while a dialog is open).
  const navigationShortcuts = useMemo(
    () => [
      {
        key: "ArrowDown",
        handler: () => navigate(1),
        description: "Next message",
      },
      {
        key: "ArrowUp",
        handler: () => navigate(-1),
        description: "Previous message",
      },
    ],
    [navigate],
  );
  useKeyboardShortcuts(navigationShortcuts, !dialogsOpen);

  // Gmail-style bulk shortcuts: `e` archives the selection, `u` restores it
  // from the Archived view — mirroring whichever bulk action the toolbar shows
  // for the active view. Same guards as Ctrl/Cmd+A (ignored in inputs, gated
  // while a dialog is open); both handlers no-op on an empty selection.
  const bulkShortcuts = useMemo(
    () => [
      {
        key: "e",
        handler: () => {
          if (view !== "archived") handleBulkArchive();
        },
        description: "Archive selected",
      },
      {
        key: "u",
        handler: () => {
          if (view === "archived") handleBulkUnarchive();
        },
        description: "Restore selected",
      },
    ],
    [view, handleBulkArchive, handleBulkUnarchive],
  );
  useKeyboardShortcuts(bulkShortcuts, !dialogsOpen);

  // Gmail-style keys: `r` replies to the row under the cursor (the focused
  // message, set by arrow keys or any row interaction); `x` toggles its
  // selection — falling back to the first row on the page so the key is never
  // dead. Same guards as the other shortcuts (ignored in inputs, gated while
  // a dialog is open).
  const gmailShortcuts = useMemo(
    () => [
      {
        key: "r",
        handler: () => {
          const list = msgs ?? [];
          // The cursor is the unambiguous reply target — no selection needed.
          // Fall back to the legacy "exactly one selected" rule only when
          // nothing has been focused yet.
          let target: Msg | undefined;
          if (focusedId) {
            target = list.find((m) => m.id === focusedId);
          } else if (selectedIds.size === 1) {
            const id = [...selectedIds][0];
            target = list.find((m) => m.id === id);
          }
          if (target) openReply(target);
        },
        description: "Reply to focused",
      },
      {
        key: "x",
        handler: () => {
          const list = msgs ?? [];
          const target = focusedId ? list.find((m) => m.id === focusedId) : list[0];
          if (!target) return;
          // Confirm the keyboard path with the touched row's name.
          const willSelect = !(target.id ? selectedIds.has(target.id) : false);
          toggleSelect(target);
          toast({
            title: willSelect ? `Selected ${target.name}` : `Deselected ${target.name}`,
          });
        },
        description: "Select message",
      },
    ],
    [selectedIds, msgs, focusedId, openReply, toggleSelect, toast],
  );
  useKeyboardShortcuts(gmailShortcuts, !dialogsOpen);

  const handleArchive = async (msg: Msg) => {
    try {
      if (!msg.id) return;
      const res = await api.messages.archive(msg.id);
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      toast({ title: "Message archived", description: `"${msg.name}" moved to the Archived tab` });
    } catch (err) {
      toast({
        title: "Failed to archive message",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleUnarchive = async (msg: Msg) => {
    try {
      if (!msg.id) return;
      const res = await api.messages.unarchive(msg.id);
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      toast({ title: "Message restored", description: `"${msg.name}" is back in the inbox` });
    } catch (err) {
      toast({
        title: "Failed to unarchive message",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllRead = async () => {
    try {
      // Server-side: marking every unread row in one statement. A client-side
      // loop over the fetched list would only reach the first page (50 rows).
      const res = await api.messages.markAllRead();
      if (!res.success) throw new Error(res.message);
      const marked = (res as { data?: { marked?: number } }).data?.marked ?? 0;
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      toast({
        title:
          marked > 0
            ? `Marked ${marked} message${marked === 1 ? "" : "s"} as read`
            : "No unread messages",
      });
    } catch (err) {
      toast({
        title: "Failed to mark all as read",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <AdminLoadingState />;

  if (isError) {
    return <AdminErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[120px]">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Messages
            {(unread ?? 0) > 0 && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{unread} unread</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {allMsgs?.length ?? 0} total messages from the contact form.
          </p>
        </div>
        {(unread ?? 0) > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="min-h-[44px]">
            Mark All Read
          </Button>
        )}
        {view === "archived" && (
          <Button
            size="sm"
            variant="outline"
            className="min-h-[44px]"
            onClick={() => setShowRestoreAllDialog(true)}
          >
            Restore all archived
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowCleanupDialog(true)}
        >
          Archive test submissions
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px]"
          aria-label="Keyboard shortcuts"
          onClick={openShortcuts}
        >
          <Keyboard size={14} />
        </Button>
      </div>

      {msgs && msgs.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              ref={selectAllRef}
              className="h-4 w-4 cursor-pointer accent-primary"
              checked={allPageSelected}
              aria-label="Select all on page"
              onChange={toggleSelectAllOnPage}
            />
            Select all on page
          </label>
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          {canSelectAllMatching && (
            <Button
              size="sm"
              variant="ghost"
              className="min-h-[44px]"
              onClick={selectAllMatching}
            >
              Select all {totalMatching} matching
            </Button>
          )}
          <Button
            size="sm"
            onClick={view === "archived" ? handleBulkUnarchive : handleBulkArchive}
            disabled={selectedIds.size === 0}
            className="min-h-[44px]"
          >
            {view === "archived" ? "Restore selected" : "Archive selected"}
          </Button>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelectedIds(new Set())}
              className="min-h-[44px]"
            >
              Clear
            </Button>
          )}
        </div>
      )}

      <MessagePresetBar
        active={isPreset ? (view as MessagePreset) : null}
        onSelect={(p) => changeView(p)}
      />

      <MessageFilterBar
        filter={view}
        setFilter={(f) => changeView(f as MessageView)}
        totalCount={msgs?.length ?? 0}
        unreadCount={unread ?? 0}
        readCount={readCount}
        archivedCount={archivedCount}
        spamCount={spamCount}
      />

      {msgs && msgs.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {allMsgs?.length === 0 ? (
              <SmartEmptyState type="messages" />
            ) : (
              <>
                <Mail size={32} className="mx-auto mb-3 opacity-30" />
                <div className="text-sm">No messages match this filter.</div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {paginatedMessages.map((msg, i) => (
          /* The wrapper carries the row's data attributes: the focused row is
             scrolled into view by data-message-id, and data-focused marks the
             keyboard cursor for tests and styling hooks. */
          <div
            key={msg.id ?? i}
            data-message-id={msg.id ?? undefined}
            data-focused={msg.id && msg.id === focusedId ? "true" : undefined}
          >
            <MessageCard
              message={msg}
              selected={msg.id ? selectedIds.has(msg.id) : false}
              focused={!!msg.id && msg.id === focusedId}
              onToggleSelect={toggleSelect}
              onReply={openReply}
              onMarkRead={handleMarkRead}
              onArchive={handleArchive}
              onUnarchive={handleUnarchive}
              formatDate={formatDate}
            />
          </div>
        ))}
      </div>

      {msgs && msgs.length > pageSize && (
        <MessagePagination
          filteredCount={msgs.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}

      <Dialog
        open={!!replyTo}
        onOpenChange={(open) => !open && setReplyTo(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to {replyTo?.name}</DialogTitle>
            <DialogDescription>
              Send a reply to this message. If email sending isn't configured, it
              opens your email client instead.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                To
              </label>
              <Input value={replyTo?.email ?? ""} readOnly />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Message
              </label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReplyTo(null)}>
              Cancel
            </Button>
            <Button onClick={sendReply} disabled={!replyTo || sendingReply || !body.trim()}>
              {sendingReply ? "Sending…" : "Send Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <SmartConfirmDialog
      state={{
        isOpen: showCleanupDialog,
        title: "Archive all test submissions?",
        message:
          "This archives every visible message from automated tests " +
          "(emails starting with e2e- or qa.verify., or test@test.com). " +
          "Real inquiries are untouched, and you can restore anything from " +
          "the Archived tab.",
        confirmLabel: "Archive test submissions",
        variant: "warning",
        onConfirm: handleCleanupTestSubmissions,
      }}
      onCancel={() => setShowCleanupDialog(false)}
    />

    <SmartConfirmDialog
      state={{
        isOpen: showRestoreAllDialog,
        title: "Restore all archived messages?",
        message:
          "This brings every archived message back to the inbox in one call. " +
          "If you only want some, use the selection toolbar instead.",
        confirmLabel: "Restore all archived",
        variant: "warning",
        onConfirm: handleRestoreAllArchived,
      }}
      onCancel={() => setShowRestoreAllDialog(false)}
    />
    </>
  );
}
