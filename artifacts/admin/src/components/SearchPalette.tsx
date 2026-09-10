import { useCallback, useMemo, useState } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import CommandPalette from "./CommandPalette";

/**
 * Search palette, mounted once in the admin shell: Ctrl/Cmd+K opens the
 * CommandPalette from any page — mirroring ShortcutsHelp's pattern of owning
 * the shortcut + dialog state at the shell. The palette never stacks on an
 * existing dialog (the guard detects those from the DOM); it closes via
 * Escape or an item selection.
 */
export default function SearchPalette() {
  const [open, setOpen] = useState(false);

  const togglePalette = useCallback(() => {
    // Toggling closed always works; opening is blocked while any other
    // dialog (cleanup confirm, reply, shortcuts help, …) is open.
    if (open) {
      setOpen(false);
      return;
    }
    if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
      return;
    }
    setOpen(true);
  }, [open]);

  const shortcuts = useMemo(
    () => [
      { key: "k", ctrl: true, handler: togglePalette, description: "Open search" },
    ],
    [togglePalette],
  );
  useKeyboardShortcuts(shortcuts);

  return <CommandPalette open={open} onOpenChange={setOpen} />;
}
