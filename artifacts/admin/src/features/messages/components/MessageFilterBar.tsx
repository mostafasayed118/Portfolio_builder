import { Inbox, Mail, MailOpen, Archive, type LucideIcon } from "lucide-react";

const STATUS_FILTERS: {
  key: string;
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "all", label: "All", icon: Inbox },
  { key: "unread", label: "Unread", icon: Mail },
  { key: "read", label: "Read", icon: MailOpen },
  { key: "archived", label: "Archived", icon: Archive },
];

interface MessageFilterBarProps {
  filter: string;
  setFilter: (f: string) => void;
  totalCount: number;
  unreadCount: number;
  readCount: number;
  archivedCount: number;
}

export function MessageFilterBar({
  filter,
  setFilter,
  totalCount,
  unreadCount,
  readCount,
  archivedCount,
}: MessageFilterBarProps) {
  const countMap: Record<string, number> = {
    all: totalCount,
    unread: unreadCount,
    read: readCount,
    archived: archivedCount,
  };

  return (
    <div className="relative">
      <div
        className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap scrollbar-none"
        role="tablist"
        aria-label="Message filters"
      >
        {STATUS_FILTERS.map(({ key, label, icon: Icon }) => (
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
            {label} ({countMap[key]})
          </button>
        ))}
      </div>
      <div
        className="absolute end-0 top-0 bottom-2 w-8 bg-gradient-to-s from-background to-transparent pointer-events-none md:hidden"
        aria-hidden="true"
      />
    </div>
  );
}
