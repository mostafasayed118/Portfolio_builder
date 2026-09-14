import type { RefObject } from "react";
import { Button } from "@workspace/ui";

interface MessageSelectionToolbarProps {
  selectAllRef: RefObject<HTMLInputElement | null>;
  allPageSelected: boolean;
  onToggleSelectAll: () => void;
  selectedCount: number;
  canSelectAllMatching: boolean;
  totalMatching: number;
  onSelectAllMatching: () => void;
  isArchivedView: boolean;
  onBulkArchive: () => void;
  onBulkUnarchive: () => void;
  onClear: () => void;
}

/** Bulk-selection toolbar shown above the list whenever rows are visible. */
export function MessageSelectionToolbar({
  selectAllRef,
  allPageSelected,
  onToggleSelectAll,
  selectedCount,
  canSelectAllMatching,
  totalMatching,
  onSelectAllMatching,
  isArchivedView,
  onBulkArchive,
  onBulkUnarchive,
  onClear,
}: MessageSelectionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
      <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
        <input
          type="checkbox"
          ref={selectAllRef}
          className="h-4 w-4 cursor-pointer accent-primary"
          checked={allPageSelected}
          aria-label="Select all on page"
          onChange={onToggleSelectAll}
        />
        Select all on page
      </label>
      <span className="text-sm font-medium">
        {selectedCount} selected
      </span>
      {canSelectAllMatching && (
        <Button
          size="sm"
          variant="ghost"
          className="min-h-[44px]"
          onClick={onSelectAllMatching}
        >
          Select all {totalMatching} matching
        </Button>
      )}
      <Button
        size="sm"
        onClick={isArchivedView ? onBulkUnarchive : onBulkArchive}
        disabled={selectedCount === 0}
        className="min-h-[44px]"
      >
        {isArchivedView ? "Restore selected" : "Archive selected"}
      </Button>
      {selectedCount > 0 && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onClear}
          className="min-h-[44px]"
        >
          Clear
        </Button>
      )}
    </div>
  );
}
