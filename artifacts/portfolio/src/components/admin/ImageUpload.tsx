import { useState, useRef, useCallback } from "react";
import { Upload, X, FileIcon, AlertCircle, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  uploadFileWithProgress,
  deleteFile,
  isSupabaseStorageUrl,
  extractStoragePath,
  type BucketName,
} from "@workspace/db/storage";

interface ImageUploadProps {
  bucket: BucketName;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  accept?: string;
  maxSizeMB?: number;
  label?: string;
  hint?: string;
  showPreview?: boolean;
  previewSize?: "sm" | "md" | "lg";
}

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string }
  | { status: "error"; message: string; fileName?: string };

const previewSizeClasses: Record<string, string> = {
  sm: "h-12 w-12",
  md: "h-24 w-24",
  lg: "h-full w-full max-h-48",
};

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export default function ImageUpload({
  bucket,
  value,
  onChange,
  folder,
  accept = "image/*",
  maxSizeMB = 5,
  label,
  hint,
  showPreview = true,
  previewSize = "md",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: "idle" });
  const [showPasteInput, setShowPasteInput] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;

      if (accept !== "*" && accept !== ".pdf") {
        const acceptedTypes = accept.split(",").map((t) => t.trim());
        const isAccepted = acceptedTypes.some((t) => {
          if (t.endsWith("/*")) {
            const category = t.split("/")[0];
            return file.type.startsWith(`${category}/`);
          }
          return file.type === t || file.name.endsWith(t.replace("*", ""));
        });
        if (!isAccepted) {
          setUploadState({
            status: "error",
            message: `Invalid file type. Accepted: ${accept}`,
          });
          return;
        }
      }

      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        setUploadState({
          status: "error",
          message: `File too large. Max ${maxSizeMB}MB (got ${(file.size / (1024 * 1024)).toFixed(1)}MB)`,
        });
        return;
      }

      setUploadState({
        status: "uploading",
        progress: 0,
        fileName: file.name,
      });

      if (value && isSupabaseStorageUrl(value)) {
        const oldPath = extractStoragePath(value);
        if (oldPath) {
          const pathParts = oldPath.split("/");
          const oldBucket = pathParts[0];
          const oldFilePath = pathParts.slice(1).join("/");
          if (oldBucket) {
            deleteFile(oldBucket, oldFilePath);
          }
        }
      }

      const result = await uploadFileWithProgress(
        bucket,
        file,
        folder,
        (pct: number) => {
          setUploadState((prev) =>
            prev.status === "uploading" ? { ...prev, progress: pct } : prev,
          );
        },
      );

      if ("error" in result && result.error) {
        setUploadState({ status: "error", message: result.error });
      } else if ("url" in result && result.url) {
        setUploadState({ status: "idle" });
        onChange(result.url);
      }
    },
    [bucket, folder, value, onChange, accept, maxSizeMB],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    if (value && isSupabaseStorageUrl(value)) {
      const oldPath = extractStoragePath(value);
      if (oldPath) {
        const pathParts = oldPath.split("/");
        const oldBucket = pathParts[0];
        const oldFilePath = pathParts.slice(1).join("/");
        if (oldBucket && oldFilePath) {
          deleteFile(oldBucket, oldFilePath);
        }
      }
    }
    onChange("");
    setUploadState({ status: "idle" });
  };

  const handleReplace = () => {
    inputRef.current?.click();
  };

  const handlePasteUrl = (url: string) => {
    onChange(url);
    setShowPasteInput(false);
  };

  const hasValue = Boolean(value);

  if (uploadState.status === "uploading") {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Upload className="h-5 w-5 text-muted-foreground animate-pulse" />
            <span className="text-sm text-muted-foreground truncate flex-1">
              {uploadState.fileName}
            </span>
            <span className="text-xs text-muted-foreground">
              {uploadState.progress}%
            </span>
          </div>
          <Progress value={uploadState.progress} />
        </div>
      </div>
    );
  }

  if (uploadState.status === "error") {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <div className="border border-destructive/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <span className="text-sm text-destructive flex-1">
              {uploadState.message}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReplace}
            >
              Try again
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUploadState({ status: "idle" })}
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (hasValue && showPreview) {
    const isImage = isImageFileValue(value) || !accept.includes(".pdf");
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start gap-3">
            {isImage ? (
              <div
                className={cn(
                  "rounded-lg overflow-hidden border bg-muted shrink-0",
                  previewSizeClasses[previewSize],
                )}
              >
                <img
                  src={value}
                  alt="Upload preview"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "";
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            ) : (
              <div
                className={cn(
                  "rounded-lg border bg-muted flex items-center justify-center shrink-0",
                  previewSizeClasses[previewSize],
                )}
              >
                <FileIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {value.split("/").pop() || "Uploaded file"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{value}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReplace}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
        {!showPasteInput && (
          <button
            type="button"
            onClick={() => setShowPasteInput(true)}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <Link className="h-3 w-3" />
            Paste URL instead
          </button>
        )}
        {showPasteInput && (
          <PasteUrlInput
            onPaste={handlePasteUrl}
            onCancel={() => setShowPasteInput(false)}
          />
        )}
      </div>
    );
  }

  if (hasValue && !showPreview) {
    return (
      <div className="space-y-2">
        {label && <label className="text-sm font-medium">{label}</label>}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <FileIcon className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {value.split("/").pop() || "Uploaded file"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{value}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReplace}
            >
              Replace
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleRemove}
            >
              <X className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
        {!showPasteInput && (
          <button
            type="button"
            onClick={() => setShowPasteInput(true)}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <Link className="h-3 w-3" />
            Paste URL instead
          </button>
        )}
        {showPasteInput && (
          <PasteUrlInput
            onPaste={handlePasteUrl}
            onCancel={() => setShowPasteInput(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium">{label}</label>}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/50",
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />
        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-1">
          Drop image here or{" "}
          <span className="text-primary font-medium">Browse files</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {accept === ".pdf" ? "PDF" : "PNG, JPG, WebP"} &middot; Max{" "}
          {maxSizeMB}MB
        </p>
      </div>
      {!showPasteInput && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowPasteInput(true);
          }}
          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
        >
          <Link className="h-3 w-3" />
          Paste URL instead
        </button>
      )}
      {showPasteInput && (
        <PasteUrlInput
          onPaste={handlePasteUrl}
          onCancel={() => setShowPasteInput(false)}
        />
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function isImageFileValue(url: string): boolean {
  const ext = url.split(".").pop()?.toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"].includes(
    ext || "",
  );
}

function PasteUrlInput({
  onPaste,
  onCancel,
}: {
  onPaste: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");

  return (
    <div className="flex gap-2">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://..."
        className="flex-1 text-xs"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={!url.trim()}
        onClick={() => onPaste(url.trim())}
      >
        Apply
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
