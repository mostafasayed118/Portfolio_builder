import { useCallback, useMemo, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsDialog, SHORTCUTS_OPENED_EVENT } from "./ShortcutsDialog";

/**
 * Global keyboard-shortcuts help, mounted once in the admin shell so `?`
 * (and `Shift+?`) opens the shortcuts modal from ANY page. The Modal only
 * stacks on nothing: if another dialog is already open (cleanup confirm,
 * reply, …), the key is ignored — the guard detects those from the DOM
 * because they live in page components the shell can't see.
 */
export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  const openShortcuts = useCallback(() => {
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
      return; // never stack the help modal on an existing dialog
    }
    setOpen(true);
    // Let the sidebar's one-time "press ?" nudge dismiss itself.
    window.dispatchEvent(new Event(SHORTCUTS_OPENED_EVENT));
  }, []);

  const shortcuts = useMemo(
    () => [
      { key: "?", handler: openShortcuts, description: "Open keyboard shortcuts" },
      // US-layout keyboards produce `?` as Shift+/.
      { key: "/", shift: true, handler: openShortcuts, description: "Open keyboard shortcuts" },
    ],
    [openShortcuts],
  );
  useKeyboardShortcuts(shortcuts);

  return <ShortcutsDialog open={open} onOpenChange={setOpen} />;
}
