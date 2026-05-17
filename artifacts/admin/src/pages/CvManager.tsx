import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileText, CheckCircle, ExternalLink, Trash2, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import { logError } from "@/lib/logger";

interface CvSettings {
  objectPath: string | null;
  fileName: string | null;
  updatedAt: string;
}

export default function CvManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<CvSettings | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    fetch("/api/v1/cv/settings")
      .then((r) => r.json() as Promise<CvSettings>)
      .then(setSettings)
      .catch(() => {});
  }, []);

  const uploadFile = async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast({ title: "Only PDF files are supported", variant: "destructive" });
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const supabase = getSupabase();
      const objectPath = `cv-${Date.now()}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("cv")
        .upload(objectPath, file, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (uploadError) throw new Error(uploadError.message);

      setProgress(100);

      const saveRes = await fetch("/api/v1/cv/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath, fileName: file.name }),
      });
      if (!saveRes.ok) {
        const errBody = await saveRes.text().catch(() => "");
        // Cleanup storage on save failure
        await supabase.storage.from("cv").remove([objectPath]);
        throw new Error(`Failed to save CV settings (${saveRes.status}): ${errBody.slice(0, 200)}`);
      }
      const saved = await saveRes.json() as CvSettings;
      setSettings(saved);
      toast({ title: "CV uploaded successfully", description: `${file.name} is now live.` });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  };

  const handleRemove = async () => {
    if (!confirm("Remove the current CV? The Download CV button will show a 'not found' error until a new file is uploaded.")) return;
    try {
      if (settings?.objectPath) {
        await getSupabase().storage.from("cv").remove([settings.objectPath]);
      }
      const res = await fetch("/api/v1/cv/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objectPath: "", fileName: "" }),
      });
      if (!res.ok) throw new Error("Failed to update CV settings");
      setSettings((s) => s ? { ...s, objectPath: null, fileName: null } : null);
      toast({ title: "CV removed" });
    } catch (err) {
      logError("Failed to save CV settings", err, "CvManager");
      toast({ title: "Remove failed", variant: "destructive", description: err instanceof Error ? err.message : undefined });
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">CV / Resume</h1>
        <p className="text-sm text-muted-foreground">
          Upload your resume PDF. It will be served at{" "}
          <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/v1/cv</code> and linked from the portfolio's Download CV button.
        </p>
      </div>

      {settings?.objectPath && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                <FileText size={20} className="text-green-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">{settings.fileName}</span>
                  <Badge variant="default" className="text-xs bg-green-600 hover:bg-green-600">Live</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Last updated {fmt(settings.updatedAt)}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-xs"
                  onClick={() => window.open("/api/v1/cv", "_blank")}
                >
                  <ExternalLink size={12} />
                  Preview
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={handleRemove}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{settings?.objectPath ? "Replace CV" : "Upload CV"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`
              relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all
              ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"}
              ${uploading ? "pointer-events-none opacity-70" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {uploading ? (
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Upload size={20} className="text-primary animate-bounce" />
                </div>
                <p className="text-sm font-medium text-foreground">Uploading… {progress}%</p>
                <div className="h-2 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
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

      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Visitors can download your CV at <strong className="text-foreground">/api/v1/cv</strong>.</p>
              <p>The Download CV button on the portfolio hero section already points to this endpoint.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p>
                The generated CV PDF includes a QR code linking to:{' '}
                <code className="text-primary bg-primary/10 px-1 py-0.5 rounded text-xs">
                  {import.meta.env.VITE_SITE_URL ?? 'https://mustafasayed.replit.app'}
                </code>
              </p>
              <p>The QR code appears in the top-right corner of the first page.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
