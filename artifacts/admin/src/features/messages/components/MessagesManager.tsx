import { useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui";
import { useToast } from "@workspace/ui";
import {
  Mail,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button, Card, CardContent, Input, Textarea } from "@workspace/ui";
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

export default function MessagesManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: messages, isLoading, isError, error, refetch } = useEntityQuery<Msg[]>(
    "messages",
    (uid) => api.messages.list(uid ?? undefined),
  );

  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const msgs = messages as Msg[] | undefined;
  // The unread chip and Unread-tab count must match the sidebar badge and the
  // API's unread-count endpoint (status='unread' only). Computing them from
  // the fetched list is wrong: the collection endpoint paginates at 50 rows,
  // so once more than 50 messages exist the local count silently truncates
  // and disagrees with the sidebar. Use the API-backed count instead.
  const { data: unread } = useUnreadCountQuery();
  const readCount = useMemo(() => msgs?.filter((m) => !isUnread(m) && !isArchived(m)).length ?? 0, [msgs]);
  const archivedCount = useMemo(() => msgs?.filter(isArchived).length ?? 0, [msgs]);

  const filtered = useMemo(() => {
    if (!msgs) return [];
    if (filter === "all") return msgs;
    if (filter === "unread") return msgs.filter(isUnread);
    if (filter === "read") return msgs.filter((m) => !isUnread(m) && !isArchived(m));
    if (filter === "archived") return msgs.filter(isArchived);
    return msgs;
  }, [msgs, filter]);

  const paginatedMessages = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

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
    setFilter(f);
    setPage(1);
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
    const allMsgs = msgs || [];
    try {
      const results = await Promise.all(allMsgs.filter(m => isUnread(m)).map(m => api.messages.markRead(m.id)));
      const failed = results.filter(r => r.success === false);
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      await queryClient.invalidateQueries({ queryKey: ["unreadCount"] });
      if (failed.length > 0) {
        toast({ title: "Some messages could not be marked read", variant: "destructive" });
        return;
      }
      toast({ title: "All marked as read" });
    } catch {
      toast({ title: "Some messages could not be marked read", variant: "destructive" });
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
            {msgs?.length ?? 0} total messages from the contact form.
          </p>
        </div>
        {(unread ?? 0) > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="min-h-[44px]">
            Mark All Read
          </Button>
        )}
      </div>

      <MessageFilterBar
        filter={filter}
        setFilter={handleFilterChange}
        totalCount={msgs?.length ?? 0}
        unreadCount={unread ?? 0}
        readCount={readCount}
        archivedCount={archivedCount}
      />

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {msgs?.length === 0 ? (
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
            onReply={openReply}
            onMarkRead={handleMarkRead}
            onArchive={handleArchive}
            onUnarchive={handleUnarchive}
            formatDate={formatDate}
          />
        ))}
      </div>

      {filtered.length > pageSize && (
        <MessagePagination
          filteredCount={filtered.length}
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
    </>
  );
}
