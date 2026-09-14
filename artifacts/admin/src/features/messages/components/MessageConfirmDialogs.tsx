import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";

interface MessageConfirmDialogsProps {
  cleanupOpen: boolean;
  restoreOpen: boolean;
  onCleanup: () => void;
  onCleanupClose: () => void;
  onRestore: () => void;
  onRestoreClose: () => void;
}

/** Confirmation dialogs for the one-click archive/restore actions. */
export function MessageConfirmDialogs({
  cleanupOpen,
  restoreOpen,
  onCleanup,
  onCleanupClose,
  onRestore,
  onRestoreClose,
}: MessageConfirmDialogsProps) {
  return (
    <>
      <SmartConfirmDialog
        state={{
          isOpen: cleanupOpen,
          title: "Archive all test submissions?",
          message:
            "This archives every visible message from automated tests " +
            "(emails starting with e2e- or qa.verify., or test@test.com). " +
            "Real inquiries are untouched, and you can restore anything from " +
            "the Archived tab.",
          confirmLabel: "Archive test submissions",
          variant: "warning",
          onConfirm: onCleanup,
        }}
        onCancel={onCleanupClose}
      />

      <SmartConfirmDialog
        state={{
          isOpen: restoreOpen,
          title: "Restore all archived messages?",
          message:
            "This brings every archived message back to the inbox in one call. " +
            "If you only want some, use the selection toolbar instead.",
          confirmLabel: "Restore all archived",
          variant: "warning",
          onConfirm: onRestore,
        }}
        onCancel={onRestoreClose}
      />
    </>
  );
}
