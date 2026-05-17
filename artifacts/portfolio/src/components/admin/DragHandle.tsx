import { GripVertical, ChevronUp, ChevronDown } from "lucide-react";
import type { DragHandleProps } from "@/hooks/use-drag-reorder";

interface DragHandleComponentProps {
  dragProps: DragHandleProps;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
}

export default function DragHandle({
  dragProps,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  className = "",
}: DragHandleComponentProps) {
  return (
    <div className={`flex items-center gap-0.5 ${className}`}>
      <div
        {...dragProps}
        className="hidden sm:flex cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </div>
      <div className="flex sm:hidden flex-col">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
