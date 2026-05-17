import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
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
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  listMessages,
  unreadCount,
  markMessageRead,
  markAllMessagesRead,
  deleteMessage,
  replyToMessage,
} from "@workspace/db/messages";

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
}

function MessagesUI({
  messages,
  filtered,
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
}: MessagesUIProps) {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            Messages
            {unread > 0 && <Badge className="text-xs">{unread} unread</Badge>}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {messages?.length ?? 0} total messages from the contact form.
          </p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="outline" onClick={onMarkAllRead}>
            <CheckCheck size={14} className="mr-1.5" />
            Mark All Read
          </Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto flex-nowrap md:flex-wrap pb-1">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
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

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Mail size={32} className="mx-auto mb-3 opacity-30" />
            <div className="text-sm">
              {messages?.length === 0
                ? "No messages yet. They'll appear here when someone submits the contact form."
                : "No messages match this filter."}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {filtered.map((msg, i) => (
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
                    className="h-7 w-7"
                    title="Reply"
                    onClick={() => openReply(msg)}
                  >
                    <Reply size={13} />
                  </Button>
                  {isUnread(msg) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Mark as read"
                      onClick={() => onMarkRead(msg)}
                    >
                      <CheckCheck size={13} />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => onDelete(msg)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

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
  const supabase = getSupabase();
  const { data: messages, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["messages"],
    queryFn: () => listMessages(supabase),
    enabled: isSupabaseConfigured,
  });

  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState("all");

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
    const mailto = await replyToMessage(replyTo.email, subject, body);
    window.location.href = mailto;
    if (replyTo.id) await markMessageRead(supabase, replyTo.id);
    setReplyTo(null);
    toast({ title: "Reply opened in email app" });
  };

  if (!isSupabaseConfigured) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold">Messages</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Loading messages...
          </CardContent>
        </Card>
      </div>
    );
  }

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
        <p className="text-destructive font-medium">Failed to load data</p>
        <p className="text-muted-foreground text-sm">{error?.message}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <MessagesUI
      messages={messages as Msg[] | undefined}
      filtered={filtered}
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
        if (msg.id) await markMessageRead(supabase, msg.id);
      }}
      onMarkAllRead={async () => {
        await markAllMessagesRead(supabase);
        toast({ title: "All marked as read" });
      }}
      onDelete={async (msg) => {
        if (msg.id && confirm("Delete message?")) {
          await deleteMessage(supabase, msg.id);
          toast({ title: "Deleted" });
        }
      }}
    />
  );
}
