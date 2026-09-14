import { useMemo } from "react";
import { useToast } from "@workspace/ui";
import { type Message as Msg } from "@/features/messages/components/MessageCard";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { type MessageView } from "./useMessageFilters";

interface UseMessageShortcutsInput {
  /** Off while any dialog is open — the selection lives behind it. */
  enabled: boolean;
  view: MessageView;
  msgs: Msg[] | undefined;
  onToggleSelectAllOnPage: () => void;
  allPageSelected: boolean;
  pageIds: string[];
  selectedIds: Set<string>;
  focusedId: string | null;
  onToggleSelect: (msg: Msg) => void;
  onReply: (msg: Msg) => void;
  onNavigate: (dir: 1 | -1) => void;
  onBulkArchive: () => void;
  onBulkUnarchive: () => void;
}

/**
 * Gmail-style keyboard shortcuts for the messages screen: Ctrl/Cmd+A (select
 * page), ArrowUp/ArrowDown (cursor), E/U (bulk archive/restore), R/X (reply /
 * toggle row). All are ignored while focus is in an input/textarea and gated
 * by `enabled` while a dialog is open.
 */
export function useMessageShortcuts({
  enabled,
  view,
  msgs,
  onToggleSelectAllOnPage,
  allPageSelected,
  pageIds,
  selectedIds,
  focusedId,
  onToggleSelect,
  onReply,
  onNavigate,
  onBulkArchive,
  onBulkUnarchive,
}: UseMessageShortcutsInput) {
  const { toast } = useToast();

  // Ctrl/Cmd+A selects (or clears) the whole rendered page — the same toggle
  // as the toolbar checkbox. The hook ignores the shortcut while focus is in
  // an input/textarea, so native select-all-in-field keeps working.
  const selectPageShortcut = useMemo(
    () => [
      {
        key: "a",
        ctrl: true,
        handler: () => {
          if (pageIds.length === 0) return;
          // Confirm the keyboard path: the toggle is silent by itself, so
          // tell the user what it did (E/U already confirm via their bulk
          // action toasts).
          onToggleSelectAllOnPage();
          toast({
            title: allPageSelected
              ? "Selection cleared"
              : `Selected ${pageIds.length} on this page`,
          });
        },
        description: "Select all on page",
      },
    ],
    [onToggleSelectAllOnPage, allPageSelected, pageIds, toast],
  );
  useKeyboardShortcuts(selectPageShortcut, enabled);

  // Arrow-key navigation: moves the keyboard cursor between the rows on the
  // current page.
  const navigationShortcuts = useMemo(
    () => [
      {
        key: "ArrowDown",
        handler: () => onNavigate(1),
        description: "Next message",
      },
      {
        key: "ArrowUp",
        handler: () => onNavigate(-1),
        description: "Previous message",
      },
    ],
    [onNavigate],
  );
  useKeyboardShortcuts(navigationShortcuts, enabled);

  // Gmail-style bulk shortcuts: `e` archives the selection, `u` restores it
  // from the Archived view — mirroring whichever bulk action the toolbar shows
  // for the active view. Both handlers no-op on an empty selection.
  const bulkShortcuts = useMemo(
    () => [
      {
        key: "e",
        handler: () => {
          if (view !== "archived") onBulkArchive();
        },
        description: "Archive selected",
      },
      {
        key: "u",
        handler: () => {
          if (view === "archived") onBulkUnarchive();
        },
        description: "Restore selected",
      },
    ],
    [view, onBulkArchive, onBulkUnarchive],
  );
  useKeyboardShortcuts(bulkShortcuts, enabled);

  // Gmail-style keys: `r` replies to the row under the cursor (the focused
  // message, set by arrow keys or any row interaction); `x` toggles its
  // selection — falling back to the first row on the page so the key is never
  // dead.
  const gmailShortcuts = useMemo(
    () => [
      {
        key: "r",
        handler: () => {
          const list = msgs ?? [];
          // The cursor is the unambiguous reply target — no selection needed.
          // Fall back to the legacy "exactly one selected" rule only when
          // nothing has been focused yet.
          let target: Msg | undefined;
          if (focusedId) {
            target = list.find((m) => m.id === focusedId);
          } else if (selectedIds.size === 1) {
            const id = [...selectedIds][0];
            target = list.find((m) => m.id === id);
          }
          if (target) onReply(target);
        },
        description: "Reply to focused",
      },
      {
        key: "x",
        handler: () => {
          const list = msgs ?? [];
          const target = focusedId ? list.find((m) => m.id === focusedId) : list[0];
          if (!target) return;
          // Confirm the keyboard path with the touched row's name.
          const willSelect = !(target.id ? selectedIds.has(target.id) : false);
          onToggleSelect(target);
          toast({
            title: willSelect ? `Selected ${target.name}` : `Deselected ${target.name}`,
          });
        },
        description: "Select message",
      },
    ],
    [selectedIds, msgs, focusedId, onReply, onToggleSelect, toast],
  );
  useKeyboardShortcuts(gmailShortcuts, enabled);
}
