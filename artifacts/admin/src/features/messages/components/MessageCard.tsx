import { Mail, MailOpen, Reply, CheckCheck, Archive, ArchiveRestore } from "lucide-react";
import { Badge, Card, CardContent, Button } from "@workspace/ui";

export interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  status?: "unread" | "read" | "archived";
  /** Present on rows returned by the `?status=archived` server filter. */
  deleted_at?: string | null;
  created_at: string;
  /** AI spam scoring (migration 049): quarantined rows have is_spam=true. */
  is_spam?: boolean;
  spam_score?: number | null;
  spam_reason?: string | null;
}

export function isArchived(msg: Message): boolean {
  // Archive is a soft-delete (`deleted_at` set); the status column only says
  // 'archived' on older/seed rows. Treat either signal as archived so the
  // archived server view renders with the Unarchive action.
  return msg.status === "archived" || (msg.deleted_at ?? null) != null;
}

export function isUnread(msg: Message): boolean {
  return !isArchived(msg) && (msg.status === "unread" || msg.status === undefined);
}

interface MessageCardProps {
  message: Message;
  selected?: boolean;
  /** The row under the keyboard cursor (arrow keys) — visually ringed. */
  focused?: boolean;
  onToggleSelect?: (msg: Message) => void;
  onReply: (msg: Message) => void;
  onMarkRead: (msg: Message) => void;
  onArchive: (msg: Message) => void;
  onUnarchive: (msg: Message) => void;
  formatDate: (ts: string) => string;
}

export function MessageCard({
  message: msg,
  selected = false,
  focused = false,
  onToggleSelect,
  onReply,
  onMarkRead,
  onArchive,
  onUnarchive,
  formatDate,
}: MessageCardProps) {
  return (
    <Card
      aria-current={focused ? "true" : undefined}
      className={[
        isUnread(msg)
          ? "border-primary/30 bg-primary/5"
          : isArchived(msg)
            ? "opacity-50"
            : "opacity-80",
        focused ? "ring-2 ring-primary/70" : "",
      ].join(" ")}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <input
              type="checkbox"
              className="mt-1.5 h-4 w-4 shrink-0 cursor-pointer accent-primary"
              checked={selected}
              aria-label={`Select message from ${msg.name}`}
              onChange={() => onToggleSelect(msg)}
            />
          )}
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
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Archived
                </Badge>
              )}
              {msg.is_spam && (
                <Badge
                  variant="destructive"
                  className="text-xs px-1.5 py-0"
                  title={msg.spam_reason ?? undefined}
                >
                  Spam{msg.spam_score != null ? ` ${msg.spam_score}%` : ""}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground ml-auto">
                {formatDate(msg.created_at)}
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
              onClick={() => onReply(msg)}
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
            {isArchived(msg) ? (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label={`Unarchive message from ${msg.name}`}
                onClick={() => onUnarchive(msg)}
              >
                <ArchiveRestore className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="min-h-[44px] min-w-[44px]"
                aria-label={`Archive message from ${msg.name}`}
                onClick={() => onArchive(msg)}
              >
                <Archive className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
