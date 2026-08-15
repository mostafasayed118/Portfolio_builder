import { Loader2 } from "lucide-react";
import { Button, DialogFooter } from "@workspace/ui";

interface FormDialogFooterProps {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
}

/**
 * Standard Cancel/Save footer for admin edit dialogs. Replaces the duplicated
 * footer markup previously copy-pasted into every manager component.
 */
export function FormDialogFooter({ onCancel, onSave, saving, saveLabel = "Save" }: FormDialogFooterProps) {
  return (
    <DialogFooter>
      <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
      <Button onClick={onSave} disabled={saving}>
        {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        {saving ? "Saving…" : saveLabel}
      </Button>
    </DialogFooter>
  );
}
