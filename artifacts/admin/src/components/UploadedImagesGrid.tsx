import { X, CheckCircle } from "lucide-react";
import type { UploadedImage } from "./ImageUploader";

interface UploadedImagesGridProps {
  uploaded: UploadedImage[];
  onRemove: (index: number) => void;
}

/** Grid of images uploaded in this session, with a per-image remove button. */
export function UploadedImagesGrid({ uploaded, onRemove }: UploadedImagesGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {uploaded.map((img, i) => (
        <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
          <img src={img.url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="absolute top-1 right-1 h-8 w-8 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X size={14} />
          </button>
          <div className="absolute bottom-1 left-1">
            <CheckCircle size={14} className="text-success" />
          </div>
        </div>
      ))}
    </div>
  );
}
