import { useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui";
import { OneTimeHint, type OneTimeHintHandle } from "./OneTimeHint";
import { ADMIN_SHORTCUTS } from "./shortcuts-registry";

/**
 * Window event fired whenever the shortcuts help is requested (via the `?`
 * key anywhere in the admin, or the Messages header icon). The Sidebar's
 * one-time "press ?" nudge listens for it to dismiss itself — finding the
 * modal by any route means the nudge has served its purpose.
 */
export const SHORTCUTS_OPENED_EVENT = "messages:shortcuts-opened";

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-muted px-1 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  );
}

interface ShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The keyboard-shortcuts help modal, shared across the admin. The one-time
 * tip explaining E/U/Ctrl+A shows inside on the first open, then never again
 * (persisted in localStorage).
 */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  const tipRef = useRef<OneTimeHintHandle>(null);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    // Once the dialog closes, the first-visit tip has been seen.
    if (!next) tipRef.current?.dismiss();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Quick keys for working with the inbox. Press <Kbd>?</Kbd> anytime
            to reopen this.
          </DialogDescription>
        </DialogHeader>
        <OneTimeHint
          ref={tipRef}
          storageKey="messages-shortcuts-tip-dismissed"
          dismissLabel="Dismiss shortcuts tip"
          className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-muted-foreground"
        >
          Tip: <Kbd>E</Kbd> archives the selected messages, <Kbd>U</Kbd>{" "}
          restores them from the Archived tab, and <Kbd>Ctrl/Cmd+A</Kbd>{" "}
          selects the whole page.
        </OneTimeHint>
        <ul className="space-y-1.5 text-xs text-muted-foreground">
          {ADMIN_SHORTCUTS.map((shortcut, i) => {
            const isFirst = i === 0;
            const newGroup =
              i > 0 && ADMIN_SHORTCUTS[i - 1].group !== shortcut.group;
            return (
              <li key={`${shortcut.group}:${shortcut.label}`}>
                {newGroup && !isFirst && (
                  <div className="pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    {shortcut.group}
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span>{shortcut.label}</span>
                  <Kbd>{shortcut.keys}</Kbd>
                </div>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
