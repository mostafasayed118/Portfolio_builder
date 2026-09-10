import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useState,
  type ReactNode,
} from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OneTimeHintHandle {
  /** Hide the hint and permanently persist the dismissal. */
  dismiss: () => void;
}

interface OneTimeHintProps {
  /** localStorage key — once it holds the value "1", the hint never shows. */
  storageKey: string;
  /** Hint content (icon + text). */
  children: ReactNode;
  /** aria-label for the dismiss ✕. */
  dismissLabel: string;
  /** Container styling. */
  className?: string;
}

/**
 * A one-time, localStorage-gated hint — the shared pattern for any "teach
 * this feature once" nudge. Renders until dismissed via the ✕ or an
 * imperative `ref.dismiss()` (for auto-dismiss when the taught action fires
 * elsewhere), then never again. Storage reads/writes are try/catch-wrapped
 * so blocked storage degrades harmlessly (the hint may reappear).
 */
export const OneTimeHint = forwardRef<OneTimeHintHandle, OneTimeHintProps>(
  function OneTimeHint({ storageKey, children, dismissLabel, className }, ref) {
    const [dismissed, setDismissed] = useState<boolean>(() => {
      try {
        return localStorage.getItem(storageKey) === "1";
      } catch {
        return false; // storage unavailable — the hint may reappear; harmless
      }
    });

    const dismiss = useCallback(() => {
      setDismissed(true);
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* storage unavailable — persist best-effort only */
      }
    }, [storageKey]);

    useImperativeHandle(ref, () => ({ dismiss }), [dismiss]);

    if (dismissed) return null;

    return (
      <div
        role="status"
        className={cn(
          "flex items-center gap-2 text-xs text-muted-foreground",
          className,
        )}
      >
        <div className="flex-1 min-w-0">{children}</div>
        <button
          type="button"
          aria-label={dismissLabel}
          onClick={dismiss}
          className="rounded p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      </div>
    );
  },
);
