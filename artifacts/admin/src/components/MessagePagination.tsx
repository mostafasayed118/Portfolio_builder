import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button } from "@workspace/ui";

interface MessagePaginationProps {
  filteredCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number | ((prev: number) => number)) => void;
  onPageSizeChange: (size: number) => void;
}

export function MessagePagination({
  filteredCount,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: MessagePaginationProps) {
  const totalPages = Math.ceil(filteredCount / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, filteredCount);

  return (
    <div className="flex items-center justify-between mt-4 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {start}–{end} of {filteredCount}
        </p>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => {
            onPageSizeChange(Number(v));
            onPageChange(1);
          }}
        >
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPageChange((p: number) => Math.max(1, p - 1))
          }
          disabled={page <= 1}
          className="min-h-[44px]"
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPageChange((p: number) => Math.min(totalPages, p + 1))
          }
          disabled={page >= totalPages}
          className="min-h-[44px]"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
