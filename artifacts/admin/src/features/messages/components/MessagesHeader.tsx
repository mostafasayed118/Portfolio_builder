import { Keyboard } from "lucide-react";
import { Button } from "@workspace/ui";

interface MessagesHeaderProps {
  unread: number;
  totalMessages: number;
  isArchivedView: boolean;
  onMarkAllRead: () => void;
  onRestoreAll: () => void;
  onArchiveTestSubmissions: () => void;
  onOpenShortcuts: () => void;
}

/** Page header: title, unread badge, and the one-click admin actions. */
export function MessagesHeader({
  unread,
  totalMessages,
  isArchivedView,
  onMarkAllRead,
  onRestoreAll,
  onArchiveTestSubmissions,
  onOpenShortcuts,
}: MessagesHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[120px]">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          Messages
          {unread > 0 && <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">{unread} unread</span>}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {totalMessages} total messages from the contact form.
        </p>
      </div>
      {unread > 0 && (
        <Button size="sm" variant="outline" onClick={onMarkAllRead} className="min-h-[44px]">
          Mark All Read
        </Button>
      )}
      {isArchivedView && (
        <Button
          size="sm"
          variant="outline"
          className="min-h-[44px]"
          onClick={onRestoreAll}
        >
          Restore all archived
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        className="min-h-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onArchiveTestSubmissions}
      >
        Archive test submissions
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="min-h-[44px]"
        aria-label="Keyboard shortcuts"
        onClick={onOpenShortcuts}
      >
        <Keyboard size={14} />
      </Button>
    </div>
  );
}
