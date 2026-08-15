import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@workspace/ui";

interface RowActionsProps {
  editLabel: string;
  deleteLabel: string;
  onEdit?: () => void;
  onDelete?: () => void;
}

/**
 * Standard edit/delete icon-button pair used on admin list rows. Replaces the
 * duplicated ghost-button pairs previously copy-pasted into every manager.
 */
export function RowActions({ editLabel, deleteLabel, onEdit, onDelete }: RowActionsProps) {
  return (
    <div className="flex gap-1">
      <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label={editLabel} onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10"
        aria-label={deleteLabel}
        onClick={onDelete}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
