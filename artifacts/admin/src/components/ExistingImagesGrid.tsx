import { X, ArrowUp, ArrowDown } from "lucide-react";

interface ExistingImagesGridProps {
  existingImages: { id: string; url: string }[];
  /** Called with the image id when an existing image's delete button is used. */
  onDeleteExisting?: (id: string) => void;
  /** Called with the full new order (ids) when an existing image is moved. */
  onReorderExisting?: (orderedIds: string[]) => void;
}

/** Grid of saved images — deletable and reorderable (up/down). */
export function ExistingImagesGrid({
  existingImages,
  onDeleteExisting,
  onReorderExisting,
}: ExistingImagesGridProps) {
  /** Move an existing image one step up/down and report the new order. */
  const moveExisting = (index: number, dir: -1 | 1) => {
    if (!existingImages || !onReorderExisting) return;
    const next = [...existingImages];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onReorderExisting(next.map((img) => img.id));
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {existingImages.map((img, idx) => (
        <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
          <img src={img.url} alt="" className="w-full h-full object-cover" />
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            {onReorderExisting && idx > 0 && (
              <button
                type="button"
                onClick={() => moveExisting(idx, -1)}
                aria-label="Move image up"
                className="h-7 w-7 rounded-md bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowUp size={13} />
              </button>
            )}
            {onReorderExisting && idx < existingImages.length - 1 && (
              <button
                type="button"
                onClick={() => moveExisting(idx, 1)}
                aria-label="Move image down"
                className="h-7 w-7 rounded-md bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowDown size={13} />
              </button>
            )}
            {onDeleteExisting && (
              <button
                type="button"
                onClick={() => onDeleteExisting(img.id)}
                aria-label="Delete image"
                className="h-7 w-7 rounded-md bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
