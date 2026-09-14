import { MessageCard, type Message as Msg } from "../components/MessageCard";
import { formatDateTime } from "@/lib/format-date";

interface MessageListProps {
  messages: Msg[];
  focusedId: string | null;
  selectedIds: Set<string>;
  onToggleSelect: (msg: Msg) => void;
  onReply: (msg: Msg) => void;
  onMarkRead: (msg: Msg) => void;
  onArchive: (msg: Msg) => void;
  onUnarchive: (msg: Msg) => void;
}

/** The rows on the currently rendered page. */
export function MessageList({
  messages,
  focusedId,
  selectedIds,
  onToggleSelect,
  onReply,
  onMarkRead,
  onArchive,
  onUnarchive,
}: MessageListProps) {
  return (
    <div className="space-y-3">
      {messages.map((msg, i) => (
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
            onToggleSelect={onToggleSelect}
            onReply={onReply}
            onMarkRead={onMarkRead}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
            formatDate={formatDateTime}
          />
        </div>
      ))}
    </div>
  );
}
