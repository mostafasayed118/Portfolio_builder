import { Mail, MailOpen, Reply, CheckCheck, Trash2 } from "lucide-react";
import { Badge, Card, CardContent, Button } from "@workspace/ui";

export interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  status?: "unread" | "read" | "archived";
  created_at: string;
}

function isUnread(msg: Message): boolean {
  return msg.status === "unread" || msg.status === undefined;
}

function isArchived(msg: Message): boolean {
  return msg.status === "archived";
}

interface MessageCardProps {
  message: Message;
  onReply: (msg: Message) => void;
  onMarkRead: (msg: Message) => void;
  onDelete: (msg: Message) => void;
  formatDate: (ts: string) => string;
}

export function MessageCard({
  message: msg,
  onReply,
  onMarkRead,
  onDelete,
  formatDate,
}: MessageCardProps) {
  return (
    <Card
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
                <Badge variant="secondary" className="text-xs px-1.5 py-0">
                  Archived
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
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
              aria-label={`Delete message from ${msg.name}`}
              onClick={() => onDelete(msg)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
