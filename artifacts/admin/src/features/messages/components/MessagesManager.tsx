import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui";
import { useToast } from "@workspace/ui";
import {
  Mail,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button, Card, CardContent, Input, Textarea } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { MessageCard, type Message as Msg, isUnread, isArchived } from "@/features/messages/components/MessageCard";
import { MessageFilterBar } from "@/features/messages/components/MessageFilterBar";
import { MessagePagination } from "@/features/messages/components/MessagePagination";
import { useEntityQuery, useUnreadCountQuery } from "@/lib/use-entity-query";

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type MessageFilter = "all" | "unread" | "read" | "archived";

export default function MessagesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // The All view: always fetched, drives the header/chip counts and the
  // default tab. Kept separate from the filtered fetch so switching chips
  // never recomputes counts from a filtered page.
  const { data: messages, isLoading: allLoading, isError, error, refetch } = useEntityQuery<Msg[]>(
    "messages",
    (uid) => api.messages.list(uid ?? undefined),
  );

  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState<MessageFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showCleanupDialog, setShowCleanupDialog] = useState(false);

  // The active chip drives a server-side status filter on the collection
  // endpoint: Unread/Read page over exactly those rows (not a client-side
  // slice of the first 50 fetched) and Archived pages over the soft-deleted
  // set the All view hides. `enabled` keeps the filtered fetch off on All.
  const statusParam = filter === "all" ? undefined : filter;
  const { data: filteredMessages, isLoading: filteredLoading } = useEntityQuery<Msg[]>(
    "messages",
    (uid) => api.messages.list(uid ?? undefined, statusParam),
    { enabled: filter !== "all" },
    [statusParam ?? "all"],
  );

  const allMsgs = messages as Msg[] | undefined;
  const msgs = (filter === "all" ? messages : filteredMessages) as Msg[] | undefined;
  const isLoading = filter === "all" ? allLoading : filteredLoading;

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

  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const openReply = (msg: Msg) => {
    setReplyTo(msg);
    setSubject(`Re: ${msg.name}`);
    setBody(`Hi ${msg.name},\n\nThanks for reaching out.\n\n`);
  };

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

  const handleFilterChange = (f: string) => {
    // MessageFilterBar hands back one of the four chip keys.
    setFilter(f as MessageFilter);
    setPage(1);
    setSelectedIds(new Set());
  };

  const toggleSelect = (msg: Msg) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (msg.id) {
        if (next.has(msg.id)) next.delete(msg.id);
        else next.add(msg.id);
      }
      return next;
    });
  };

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

  const handleBulkArchive = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      const res = await api.messages.bulkArchive(ids);
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      setSelectedIds(new Set());
      toast({
        title: `Archived ${ids.length} message${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      toast({
        title: "Failed to archive messages",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const handleBulkUnarchive = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    try {
      const res = await api.messages.bulkUnarchive(ids);
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      setSelectedIds(new Set());
      toast({
        title: `Restored ${ids.length} message${ids.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      toast({
        title: "Failed to restore messages",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

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
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setShowCleanupDialog(true)}
        >
          Archive test submissions
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
          <Button
            size="sm"
            onClick={filter === "archived" ? handleBulkUnarchive : handleBulkArchive}
            disabled={selectedIds.size === 0}
            className="min-h-[44px]"
          >
            {filter === "archived" ? "Restore selected" : "Archive selected"}
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

      <MessageFilterBar
        filter={filter}
        setFilter={handleFilterChange}
        totalCount={msgs?.length ?? 0}
        unreadCount={unread ?? 0}
        readCount={readCount}
        archivedCount={archivedCount}
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
          <MessageCard
            key={msg.id ?? i}
            message={msg}
            selected={msg.id ? selectedIds.has(msg.id) : false}
            onToggleSelect={toggleSelect}
            onReply={openReply}
            onMarkRead={handleMarkRead}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            formatDate={formatDate}
          />
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
    </>
  );
}
