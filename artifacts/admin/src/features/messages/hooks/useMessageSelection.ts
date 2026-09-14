import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Message as Msg } from "../components/MessageCard";

interface UseMessageSelectionInput {
  /** The rows on the currently rendered page. */
  pageMessages: Msg[];
  /** Ids of EVERY row matching the active view (across all pages). */
  allMatchingIds: string[];
  totalMatching: number;
}

/**
 * Selection + keyboard-cursor state for the messages screen: which rows are
 * selected, which row is under the Gmail-style cursor, select-all helpers,
 * and arrow-key navigation over the visible page.
 */
export function useMessageSelection({ pageMessages, allMatchingIds, totalMatching }: UseMessageSelectionInput) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // The row most recently toggled — the target of the Gmail-style `x` key
  // (which toggles the focused message like Gmail's checkbox shortcut).
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // Selection toolbar state: the "Select all on page" checkbox operates on
  // the currently rendered page only (not the whole fetched list, which can
  // span multiple pages at 20–50 rows).
  const pageIds = useMemo(
    () => pageMessages.map((m) => m.id).filter((id): id is string => !!id),
    [pageMessages],
  );
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id));

  const selectAllRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  // Tab title reflects the current selection (Gmail-style "(N)" prefix), so
  // the selection state is visible even when the tab is unfocused. The base
  // title is captured on mount and restored on unmount.
  useEffect(() => {
    const base = document.title;
    document.title = selectedIds.size > 0 ? `(${selectedIds.size}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [selectedIds.size]);

  const toggleSelectAllOnPage = useCallback(() => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [allPageSelected, pageIds]);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // Gmail-style "Select all N matching": the batched fetcher has already
  // loaded EVERY row matching the active view, so grabbing them all is a
  // local Set over `msgs` — and the follow-up Archive/Restore then hits the
  // whole matching set in ONE bulk call, beyond the current page. Shown only
  // while a partial selection exists and matching rows remain unselected.
  const canSelectAllMatching = selectedIds.size > 0 && selectedIds.size < totalMatching;

  const selectAllMatching = useCallback(() => {
    setSelectedIds(new Set(allMatchingIds));
  }, [allMatchingIds]);

  const toggleSelect = useCallback((msg: Msg) => {
    // Interacting with a row makes it the focused message for the `x` key.
    setFocusedId(msg.id ?? null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (msg.id) {
        if (next.has(msg.id)) next.delete(msg.id);
        else next.add(msg.id);
      }
      return next;
    });
  }, []);

  // Arrow-key navigation moves a cursor (the focused row) through the visible
  // page, so `x` and `r` can act on a row with no mouse interaction at all.
  // The focused row is scrolled into view so the cursor never points at an
  // off-screen message.
  const scrollMessageIntoView = useCallback((id: string) => {
    requestAnimationFrame(() => {
      // `scrollIntoView` isn't implemented in jsdom and is optional on some
      // embedded browsers — degrade gracefully rather than crash navigation.
      document
        .querySelector(`[data-message-id="${id}"]`)
        ?.scrollIntoView?.({ block: "nearest" });
    });
  }, []);

  const navigate = useCallback(
    (dir: 1 | -1) => {
      const list = pageMessages;
      if (list.length === 0) return;
      const currentIndex = focusedId
        ? list.findIndex((m) => m.id === focusedId)
        : -1;
      // Nothing focused yet: both arrows start at the first row. Otherwise
      // clamp at the list edges (Gmail-style — no wrap-around).
      const nextIndex =
        currentIndex === -1
          ? 0
          : Math.min(list.length - 1, Math.max(0, currentIndex + dir));
      const next = list[nextIndex];
      if (next?.id) {
        setFocusedId(next.id);
        scrollMessageIntoView(next.id);
      }
    },
    [pageMessages, focusedId, scrollMessageIntoView],
  );

  return {
    selectedIds,
    focusedId,
    pageIds,
    allPageSelected,
    selectAllRef,
    toggleSelectAllOnPage,
    clearSelection,
    canSelectAllMatching,
    selectAllMatching,
    toggleSelect,
    navigate,
  };
}
