import { useEffect, useRef } from "react";

interface DeepLinkEditorOptions<T> {
  /** Query data used to resolve `#edit-<id>` links (undefined while loading). */
  items: readonly T[] | undefined;
  /** Stable id accessor — matches the id embedded in the `#edit-<id>` hash. */
  getId: (item: T) => string;
  /** Open the create dialog (hash `#new`). */
  onNew: () => void;
  /** Open the editor for a matched item (hash `#edit-<id>`). */
  onEdit: (item: T) => void;
}

/**
 * Deep-link support shared by the admin manager screens: the command palette's
 * quick actions navigate to a manager with a URL hash — `#new` opens the
 * create dialog, `#edit-<id>` opens the editor for that item. The hash is
 * stripped after opening so refetches don't re-open the dialog.
 *
 * The effect re-runs only when `items` changes (a link can only resolve once
 * the list has loaded); the callbacks are read through a latest-ref so
 * inline closures don't reschedule listeners on every render.
 */
export function useDeepLinkEditor<T>({ items, getId, onNew, onEdit }: DeepLinkEditorOptions<T>): void {
  const handlersRef = useRef({ getId, onNew, onEdit });
  handlersRef.current = { getId, onNew, onEdit };

  useEffect(() => {
    const clearDeepLinkHash = () => {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    };
    const handleDeepLink = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash === "new") {
        handlersRef.current.onNew();
        clearDeepLinkHash();
        return;
      }
      if (hash.startsWith("edit-")) {
        const id = hash.slice("edit-".length);
        const item = items?.find((entry) => handlersRef.current.getId(entry) === id);
        if (item) {
          handlersRef.current.onEdit(item);
          clearDeepLinkHash();
        }
      }
    };
    handleDeepLink();
    window.addEventListener("hashchange", handleDeepLink);
    return () => window.removeEventListener("hashchange", handleDeepLink);
  }, [items]);
}
