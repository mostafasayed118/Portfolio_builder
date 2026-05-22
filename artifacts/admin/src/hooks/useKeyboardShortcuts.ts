import { useEffect, useCallback, useMemo } from "react";

type KeyHandler = (e: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  handler: KeyHandler;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description?: string;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key !== "Escape") return;
    }

    for (const shortcut of shortcuts) {
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        e.preventDefault();
        shortcut.handler(e);
        break;
      }
    }
  }, [shortcuts, enabled]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export function useGlobalShortcuts(enabled = true) {
  const shortcuts: Shortcut[] = useMemo(() => [
    {
      key: "s",
      ctrl: true,
      handler: () => {
        const saveBtn = document.querySelector('[data-save-button]') as HTMLButtonElement;
        if (saveBtn) saveBtn.click();
      },
      description: "Save form",
    },
    {
      key: "Escape",
      handler: () => {
        const closeBtn = document.querySelector('[data-dialog-close]') as HTMLButtonElement;
        if (closeBtn) closeBtn.click();
      },
      description: "Close dialog",
    },
    {
      key: "/",
      ctrl: true,
      handler: () => {
        const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      },
      description: "Focus search",
    },
  ], []);

  useKeyboardShortcuts(shortcuts, enabled);
}

export function useFormKeyboardShortcuts(onSave: () => void, onCancel?: () => void) {
  const shortcuts: Shortcut[] = [
    {
      key: "s",
      ctrl: true,
      handler: () => onSave(),
      description: "Save changes",
    },
    {
      key: "Escape",
      handler: () => onCancel?.(),
      description: "Cancel editing",
    },
  ];

  useKeyboardShortcuts(shortcuts, true);
}