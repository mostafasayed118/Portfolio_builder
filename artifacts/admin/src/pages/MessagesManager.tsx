import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@workspace/ui";
import { useToast } from "@workspace/ui";
import {
  Mail,
  MailOpen,
  Trash2,
  CheckCheck,
  Reply,
  Archive,
  Inbox,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { Badge, Button, Card, CardContent, Input, Skeleton, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { getErrorMessage } from "@/lib/error-messages";

const PAGE_SIZE = 20;

type MsgStatus = "unread" | "read" | "archived";
type Msg = {
  id: string;
  name: string;
  email: string;
  message: string;
  status?: MsgStatus;
  created_at: string;
};

function isUnread(msg: Msg): boolean {
  return msg.status === "unread" || msg.status === undefined;
}

function isArchived(msg: Msg): boolean {
  return msg.status === "archived";
}

const STATUS_FILTERS: {
  key: string;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "all", label: "All", icon: Inbox },
  { key: "unread", label: "Unread", icon: Mail },
  { key: "read", label: "Read", icon: MailOpen },
  { key: "archived", label: "Archived", icon: Archive },
];

interface MessagesUIProps {
  messages: Msg[] | undefined;
  filtered: Msg[];
  paginatedMessages: Msg[];
  unread: number;
  filter: string;
  setFilter: (f: string) => void;
  fmt: (ts: string) => string;
  replyTo: Msg | null;
  subject: string;
  body: string;
  setSubject: (s: string) => void;
  setBody: (b: string) => void;
  openReply: (msg: Msg) => void;
  sendReply: () => void;
  setReplyTo: (m: Msg | null) => void;
  onMarkRead: (msg: Msg) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onDelete: (msg: Msg) => Promise<void>;
  page: number;
  setPage: (p: number | ((prev: number) => number)) => void;
  pageSize: number;
  setPageSize: (s: number) => void;
}

function MessagesUI({
  messages,
  filtered,
  paginatedMessages,
  unread,
  filter,
  setFilter,
  fmt,
  replyTo,
  subject,
  body,
  setSubject,
  setBody,
  openReply,
  sendReply,
  setReplyTo,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  page,
  setPage,
  pageSize,
  setPageSize,
}: MessagesUIProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[120px]">
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Messages
            {unread > 0 && <Badge className="text-xs">{unread} unread</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {messages?.length ?? 0} total messages from the contact form.
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={onMarkAllRead} className="min-h-[44px]">
            <CheckCheck size={14} className="mr-1.5" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap scrollbar-none" role="tablist" aria-label="Message filters">
          {STATUS_FILTERS.map(({ key, label, icon: Icon }) => {
            const count =
              key === "all"
                ? (messages?.length ?? 0)
                : key === "unread"
                  ? (messages?.filter(isUnread).length ?? 0)
                  : key === "read"
                    ? (messages?.filter((m) => !isUnread(m) && !isArchived(m))
                        .length ?? 0)
                    : (messages?.filter(isArchived).length ?? 0);
            return (
              <button
                key={key}
                onClick={() => setFilter(key)}
                role="tab"
                aria-selected={filter === key}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 min-h-[44px] ${
                  filter === key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40"
                }`}
              >
                <Icon size={12} />
                {label} ({count})
              </button>
            );
          })}
        </div>
        <div className="absolute end-0 top-0 bottom-2 w-8 bg-gradient-to-s from-background to-transparent pointer-events-none md:hidden" aria-hidden="true" />
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {messages?.length === 0 ? (
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
          <Card
            key={msg.id ?? i}
            className={
              isUnread(msg)
                ? "border-primary/30 bg-primary/5"
                : isArchived(msg)
                  ? "opacity-50"
                  : "opacity-80"
            }
          >
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isUnread(msg) ? (
                    <Mail size={16} className="text-primary" />
                  ) : (
                    <MailOpen size={16} className="text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{msg.name}</span>
                    <a
                      href={`mailto:${msg.email}`}
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      {msg.email}
                    </a>
                    {isUnread(msg) && (
                      <Badge variant="default" className="text-xs px-1.5 py-0">
                        New
                      </Badge>
                    )}
                    {isArchived(msg) && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-1.5 py-0"
                      >
                        Archived
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {fmt(msg.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                    {msg.message}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={`Reply to ${msg.name}`}
                    onClick={() => openReply(msg)}
                  >
                    <Reply className="h-4 w-4" />
                  </Button>
                  {isUnread(msg) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="min-h-[44px] min-w-[44px]"
                      aria-label={`Mark message from ${msg.name} as read`}
                      onClick={() => onMarkRead(msg)}
                    >
                      <CheckCheck className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    aria-label={`Delete message from ${msg.name}`}
                    onClick={() => onDelete(msg)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button> {/* STANDARDIZED: Type E — inline delete */}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length > pageSize && (
        <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
            </p>
            <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setPage((p: number) => Math.max(1, p - 1)); }} disabled={page === 1} className="min-h-[44px]">
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setPage((p: number) => Math.min(Math.ceil(filtered.length / pageSize), p + 1)); }} disabled={page >= Math.ceil(filtered.length / pageSize)} className="min-h-[44px]">
              Next
            </Button>
          </div>
        </div>
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
  );
}

export default function MessagesManager() {
  const { toast } = useToast();
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

  const unread = useMemo(
    () => (messages as Msg[] | undefined)?.filter(isUnread).length ?? 0,
    [messages],
  );

  const filtered = useMemo(() => {
    if (!messages) return [];
    const msgs = messages as Msg[];
    if (filter === "all") return msgs;
    if (filter === "unread") return msgs.filter(isUnread);
    if (filter === "read")
      return msgs.filter((m) => !isUnread(m) && !isArchived(m));
    if (filter === "archived") return msgs.filter(isArchived);
    return msgs;
  }, [messages, filter]);

  const paginatedMessages = useMemo(() => {
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [filtered, page, pageSize]);

  const fmt = (ts: string) =>
    new Date(ts).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const openReply = (msg: Msg) => {
    setReplyTo(msg);
    setSubject(`Re: ${msg.name}`);
    setBody(`Hi ${msg.name},\n\nThanks for reaching out.\n\n`);
  };

  const sendReply = async () => {
    if (!replyTo) return;
    const mailto = `mailto:${replyTo.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    if (replyTo.id) {
      const res = await api.messages.markRead(replyTo.id);
      if (!res.success) throw new Error(res.message);
    }
    setReplyTo(null);
    toast({ title: "Reply opened in email app" });
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
    <MessagesUI
      messages={messages as Msg[] | undefined}
      filtered={filtered}
      paginatedMessages={paginatedMessages}
      unread={unread}
      filter={filter}
      setFilter={setFilter}
      fmt={fmt}
      replyTo={replyTo}
      subject={subject}
      body={body}
      setSubject={setSubject}
      setBody={setBody}
      openReply={openReply}
      sendReply={sendReply}
      setReplyTo={setReplyTo}
      onMarkRead={async (msg) => {
        if (msg.id) {
          const res = await api.messages.markRead(msg.id);
          if (!res.success) throw new Error(res.message);
        }
      }}
      onMarkAllRead={async () => {
        const msgs = (messages as Msg[]) || [];
        await Promise.all(msgs.filter(m => isUnread(m)).map(m => api.messages.markRead(m.id)));
        toast({ title: "All marked as read" });
      }}
      onDelete={async (msg) => {
        setDeleteTarget(msg);
      }}
      page={page}
      setPage={setPage}
      pageSize={pageSize}
      setPageSize={setPageSize}
    />

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
