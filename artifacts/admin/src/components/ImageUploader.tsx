import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@workspace/ui";


import { getCsrfToken } from "@/lib/api-client";
import { getClerkToken } from "@/lib/auth-token";
import { getApiUrl } from "@/lib/env";

export interface UploadedImage {
  id: string;
  url: string;
  variants: { type: string; url: string }[];
}

interface UploadResponse {
  success?: boolean;
  data?: UploadedImage;
  message?: string;
  error?: string;
}

interface ImageUploaderProps {
  entityType: "project" | "projects" | "hero" | "about" | "certification" | "certifications" | "avatar" | "content";
  entityId?: string;
  maxFiles?: number;
  maxFileSizeMB?: number;
  acceptedTypes?: string[];
  onUploadComplete?: (images: UploadedImage[]) => void;
  existingImages?: { id: string; url: string }[];
}

const API_BASE = getApiUrl();

export default function ImageUploader({
  entityType,
  entityId,
  maxFiles = 5,
  maxFileSizeMB = 10,
  acceptedTypes = ["image/jpeg", "image/png", "image/webp"],
  onUploadComplete,
  existingImages,
}: ImageUploaderProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const xhrsRef = useRef<XMLHttpRequest[]>([]);
  const pendingRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploaded, setUploaded] = useState<UploadedImage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const dragCounter = useRef(0);

  useEffect(() => {
    return () => {
      xhrsRef.current.forEach(xhr => xhr.abort());
      xhrRef.current?.abort();
    };
  }, []);

  const currentCount = (existingImages?.length ?? 0) + uploaded.length;

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Only images are accepted", variant: "destructive" });
      return;
    }
    if (file.size > maxFileSizeMB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max ${maxFileSizeMB}MB`, variant: "destructive" });
      return;
    }
    if ((existingImages?.length ?? 0) + uploaded.length + pendingRef.current >= maxFiles) {
      toast({ title: "Upload limit reached", description: `Max ${maxFiles} files`, variant: "destructive" });
      return;
    }
    pendingRef.current++;

    setUploading(true);
    setProgress(0);
    setError(null);

    let xhr: XMLHttpRequest | null = null;

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entityType", entityType);
      if (entityId) formData.append("entityId", entityId);

      xhr = new XMLHttpRequest();
      const request = xhr;
      xhrsRef.current.push(request);
      request.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };

      const csrfToken = await getCsrfToken().catch(() => null);
      const clerkToken = await getClerkToken().catch(() => null);

      const result = await new Promise<UploadedImage>((resolve, reject) => {
        request.onload = () => {
          try {
            const response = JSON.parse(request.responseText) as UploadResponse | UploadedImage;
            if (request.status >= 200 && request.status < 300) {
              const image: UploadedImage | undefined =
                "data" in response ? response.data : "url" in response ? response : undefined;
              if (!image?.url) throw new Error("Upload response did not include an image URL");
              resolve(image);
            } else {
              const message = "message" in response ? response.message : "error" in response ? response.error : undefined;
              reject(new Error(message || `Upload failed (${request.status})`));
            }
          } catch (err) {
            reject(err instanceof Error ? err : new Error(`Upload failed (${request.status})`));
          }
        };
        request.onerror = () => reject(new Error("Network error"));
        request.open("POST", `${API_BASE}/api/v1/images/upload`);
        if (clerkToken) request.setRequestHeader("Authorization", `Bearer ${clerkToken}`);
        if (csrfToken) request.setRequestHeader("x-csrf-token", csrfToken);
        xhrRef.current = request;
        request.send(formData);
      });

      setUploaded(prev => {
        const newUploaded = [...prev, result];
        onUploadComplete?.(newUploaded);
        return newUploaded;
      });
      toast({ title: "Image uploaded", description: file.name });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      toast({ title: "Upload failed", description: msg, variant: "destructive" });
    } finally {
      pendingRef.current--;
      if (xhr) {
        const idx = xhrsRef.current.indexOf(xhr);
        if (idx !== -1) xhrsRef.current.splice(idx, 1);
      }
      setUploading(false);
      setProgress(0);
    }
  }, [entityType, entityId, maxFileSizeMB, maxFiles, existingImages, uploaded, onUploadComplete, toast]);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
    if (!dragging) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    dragCounter.current = 0;
    const files = Array.from(e.dataTransfer.files);
    let fileCountSoFar = 0;
    for (const file of files) {
      if (fileCountSoFar + uploaded.length >= maxFiles) break;
      uploadFile(file);
      fileCountSoFar++;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    let fileCountSoFar = 0;
    for (const file of files) {
      if (fileCountSoFar + uploaded.length >= maxFiles) break;
      uploadFile(file);
      fileCountSoFar++;
    }
    e.target.value = "";
  };

  const removeUploaded = (index: number) => {
    const newUploaded = uploaded.filter((_, i) => i !== index);
    setUploaded(newUploaded);
    onUploadComplete?.(newUploaded);
  };

  const atLimit = currentCount >= maxFiles;

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => !atLimit && !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
          ${dragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50"}
          ${atLimit || uploading ? "pointer-events-none opacity-60" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Upload images — drag and drop or click to browse"
      >
        <input ref={inputRef} type="file" hidden accept={acceptedTypes.join(",")} multiple onChange={handleFileChange} />
        {uploading ? (
          <div className="space-y-3">
            <Loader2 size={32} className="mx-auto text-primary animate-spin" />
            <p className="text-sm font-medium">Uploading… {progress}%</p>
            <div className="h-2 bg-muted rounded-full max-w-xs mx-auto overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload size={32} className="mx-auto text-muted-foreground" />
            <p className="text-sm font-medium">
              {atLimit ? "Upload limit reached" : "Drop images here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedTypes.map(t => t.split("/")[1]).join(", ").toUpperCase()} · Max {maxFileSizeMB}MB
              {maxFiles > 1 && ` · Up to ${maxFiles} files`}
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Uploaded images */}
      {uploaded.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {uploaded.map((img, i) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeUploaded(i)}
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
      )}

      {/* Existing images */}
      {existingImages && existingImages.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {existingImages.map((img) => (
            <div key={img.id} className="aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
