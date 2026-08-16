import { CalendarClock, Inbox, Reply, type LucideIcon } from "lucide-react";
import type { MessagePreset } from "@/lib/use-entity-query";

/**
 * One-click saved views for the inbox — compound filters the single status
 * chips can't express (date ranges, unread-OR-archived, actionable rows).
 * Each maps to the list endpoint's `?preset=` param, which applies the whole
 * predicate server-side so the batched fetcher pages over the true set.
 */
const PRESETS: {
  key: MessagePreset;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  {
    key: "unread_today",
    label: "Unread today",
    hint: "Unread messages created since UTC midnight",
    icon: CalendarClock,
  },
  {
    key: "unread_or_archived",
    label: "Unread + archived",
    hint: "Every unread or archived row (excludes read, visible messages)",
    icon: Inbox,
  },
  {
    key: "needs_reply",
    label: "Needs reply",
    hint: "Read but never replied to",
    icon: Reply,
  },
];

interface MessagePresetBarProps {
  active: MessagePreset | null;
  onSelect: (preset: MessagePreset) => void;
}

export function MessagePresetBar({ active, onSelect }: MessagePresetBarProps) {
  return (
    <div
      role="group"
      aria-label="Saved filter presets"
      className="flex gap-2 overflow-x-auto pb-2 md:flex-wrap scrollbar-none"
    >
      {PRESETS.map(({ key, label, hint, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => onSelect(key)}
          title={hint}
          aria-pressed={active === key}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 min-h-[44px] ${
            active === key
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-muted-foreground border-border hover:border-primary/40"
          }`}
        >
          <Icon size={12} />
          {label}
        </button>
      ))}
    </div>
  );
}
