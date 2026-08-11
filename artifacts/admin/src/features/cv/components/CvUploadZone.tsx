

import { Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui";

interface CvUploadZoneProps {
  uploading: boolean;
  progress: number;
  dragging: boolean;
  hasExisting: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export function CvUploadZone({ uploading, progress, dragging, hasExisting, onDragOver, onDragLeave, onDrop, onFileChange, fileInputRef }: CvUploadZoneProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{hasExisting ? "Replace CV" : "Upload CV"}</CardTitle>
      </CardHeader>
      <CardContent>
        <div onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); if (!uploading) fileInputRef.current?.click(); } }}
          role="button" tabIndex={0} aria-label="Upload CV PDF file"
          className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"} ${uploading ? "pointer-events-none opacity-70" : ""}`}>
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={onFileChange} />
          {uploading ? (
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Upload size={20} className="text-primary animate-bounce" />
              </div>
              <p className="text-sm font-medium text-foreground">Uploading… {progress}%</p>
              <div className="h-2 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Upload size={20} className="text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Drop your PDF here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">Only PDF files are accepted</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
