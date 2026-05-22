import { useState, useCallback, useEffect, useRef, useId } from "react";
import { AlertTriangle, Trash2, XCircle, CheckCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info" | "success";
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface UseSmartConfirmReturn {
  confirm: (options: Omit<ConfirmDialogState, "isOpen">) => Promise<boolean>;
  dialogState: ConfirmDialogState;
  isOpen: boolean;
}

const variantConfig = {
  danger: {
    icon: Trash2,
    iconClass: "text-destructive",
    defaultConfirm: "Delete",
  },
  warning: {
    icon: AlertTriangle,
    iconClass: "text-amber-600 dark:text-amber-400",
    defaultConfirm: "Continue",
  },
  info: {
    icon: HelpCircle,
    iconClass: "text-primary",
    defaultConfirm: "OK",
  },
  success: {
    icon: CheckCircle,
    iconClass: "text-emerald-600 dark:text-emerald-400",
    defaultConfirm: "Confirm",
  },
};

const defaultState: ConfirmDialogState = {
  isOpen: false,
  title: "",
  message: "",
  variant: "info",
};

export function useSmartConfirm(): UseSmartConfirmReturn {
  const [dialogState, setDialogState] = useState<ConfirmDialogState>(defaultState);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback(async (options: Omit<ConfirmDialogState, "isOpen">) => {
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setDialogState({
        ...options,
        isOpen: true,
        confirmLabel: options.confirmLabel || variantConfig[options.variant || "info"].defaultConfirm,
        cancelLabel: options.cancelLabel || "Cancel",
        onConfirm: async () => {
          try {
            await options.onConfirm?.();
            setDialogState(defaultState);
            resolveRef.current?.(true);
            resolveRef.current = null;
          } catch {
            resolveRef.current?.(false);
            resolveRef.current = null;
          }
        },
      });
    });
  }, []);

  const handleCancel = useCallback(() => {
    setDialogState(defaultState);
    resolveRef.current?.(false);
    resolveRef.current = null;
  }, []);

  return { confirm, dialogState: { ...dialogState, onCancel: handleCancel }, isOpen: dialogState.isOpen };
}

interface SmartConfirmDialogProps {
  state: ConfirmDialogState;
  onCancel?: () => void;
}

export function SmartConfirmDialog({ state, onCancel }: SmartConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const handleCancel = state.onCancel ?? onCancel ?? (() => {});

  useEffect(() => {
    if (!state.isOpen) return;
    const timer = setTimeout(() => cancelRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [state.isOpen]);

  useEffect(() => {
    if (!state.isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state.isOpen, handleCancel]);

  useEffect(() => {
    if (state.isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [state.isOpen]);

  if (!state.isOpen) return null;

  const config = variantConfig[state.variant || "info"];
  const Icon = config.icon;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        aria-hidden="true"
        onClick={handleCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background p-6 shadow-lg"
      >
        <div className="flex items-start gap-4">
          <div className={cn("h-10 w-10 rounded-full flex items-center justify-center bg-current/10", config.iconClass)}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 id={titleId} className="text-lg font-semibold">{state.title}</h2>
            <p id={descId} className="text-sm text-muted-foreground mt-1">{state.message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            ref={cancelRef}
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium rounded-md border bg-background hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {state.cancelLabel}
          </button>
          <button
            onClick={async () => {
              await state.onConfirm?.();
            }}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              state.variant === "danger"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
