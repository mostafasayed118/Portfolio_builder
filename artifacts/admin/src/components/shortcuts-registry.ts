/**
 * Single source of truth for the keyboard-shortcuts help dialog.
 *
 * Adding a shortcut means adding ONE entry here — the dialog renders it
 * automatically, grouped under its header. (Registration lives in each
 * feature's component, e.g. MessagesManager for E/U/X/R and the shell's
 * ShortcutsHelp/SearchPalette for ?/Ctrl+K; this registry only documents.)
 */
export interface ShortcutDoc {
  group: "Inbox" | "Gmail-style keys" | "General";
  label: string;
  /** The key-combo as displayed in the dialog, e.g. "Ctrl/Cmd+A". */
  keys: string;
}

export const ADMIN_SHORTCUTS: ShortcutDoc[] = [
  { group: "Inbox", label: "Select all on page", keys: "Ctrl/Cmd+A" },
  { group: "Inbox", label: "Archive selected", keys: "E" },
  { group: "Inbox", label: "Restore selected (Archived)", keys: "U" },
  { group: "Gmail-style keys", label: "Reply to selected", keys: "R" },
  { group: "Gmail-style keys", label: "Select message", keys: "X" },
  { group: "General", label: "Open search", keys: "Ctrl/Cmd+K" },
  { group: "General", label: "Open keyboard shortcuts", keys: "?" },
];
