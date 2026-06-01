import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui";
import { useToast } from "@workspace/ui";
import {
  Mail,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Button, Card, CardContent, Input, Skeleton, Textarea } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { getErrorMessage } from "@/lib/error-messages";
import { MessageCard, type Message as Msg } from "@/components/MessageCard";
import { MessageFilterBar } from "@/components/MessageFilterBar";
import { MessagePagination } from "@/components/MessagePagination";

function isUnread(msg: Msg): boolean {
  return msg.status === "unread" || msg.status === undefined;
}

function isArchived(msg: Msg): boolean {
  return msg.status === "archived";
}

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
  const { data: messages, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["messages"],
    queryFn: async () => {
      const res = await api.messages.list();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });

  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deleteTarget, setDeleteTarget] = useState<Msg | null>(null);

  const msgs = messages as Msg[] | undefined;
  const unread = useMemo(() => msgs?.filter(isUnread).length ?? 0, [msgs]);
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
    if (replyTo.id) {
      try {
        const res = await api.messages.markRead(replyTo.id);
        if (res.success) {
          queryClient.invalidateQueries({ queryKey: ["messages"] });
        }
      } catch {
        // Non-critical — continue with reply
      }
    }
    const mailto = `mailto:${replyTo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setReplyTo(null);
    toast({ title: "Reply opened in email app" });
  };

  const handleMarkRead = async (msg: Msg) => {
    if (msg.id) {
      const res = await api.messages.markRead(msg.id);
      if (!res.success) throw new Error(res.message);
    }
  };

  const handleMarkAllRead = async () => {
    const allMsgs = msgs || [];
    await Promise.all(allMsgs.filter(m => isUnread(m)).map(m => api.messages.markRead(m.id)));
    toast({ title: "All marked as read" });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{getErrorMessage(error)}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <>
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[120px]">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Messages
            {unread > 0 && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{unread} unread</span>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {msgs?.length ?? 0} total messages from the contact form.
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={handleMarkAllRead} className="min-h-[44px]">
            Mark All Read
          </Button>
        )}
      </div>

      <MessageFilterBar
        filter={filter}
        setFilter={setFilter}
        totalCount={msgs?.length ?? 0}
        unreadCount={unread}
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
            onDelete={(msg) => setDeleteTarget(msg)}
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
            <DialogTitle>Reply via email</DialogTitle>
            <DialogDescription>
              Draft a reply and open your email client.
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
            <Button onClick={sendReply} disabled={!replyTo}>
              Open Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>

    <SmartConfirmDialog
      state={{
        isOpen: !!deleteTarget,
        title: "Delete Message",
        message: `Are you sure you want to delete the message from "${deleteTarget?.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        variant: "danger",
        onConfirm: async () => {
          if (deleteTarget?.id) {
            const res = await api.messages.delete(deleteTarget.id);
            if (!res.success) throw new Error(res.message);
            toast({ title: "Message deleted" });
          }
          setDeleteTarget(null);
        },
      }}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
}
