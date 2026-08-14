import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { FileText, CheckCircle, ExternalLink, Trash2, Info } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { logError } from "@/lib/logger";
import { Badge, Button, Card, CardContent } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { api } from "@/lib/api-client";
import { CvUploadZone } from "@/features/cv/components/CvUploadZone";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";

export default function CvManager() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const { data: settings, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["cv-settings"],
    queryFn: async () => {
      const result = await api.cv.getSettings();
      if (!result.success) throw new Error(result.message);
      return result.data!;
    },
    retry: 1,
  });

  const uploadFile = async (file: File) => {
    if (!file.type.includes("pdf")) {
      toast({ title: "Only PDF files are supported", variant: "destructive" }); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" }); return;
    }
    setUploading(true); setProgress(0);
    try {
      const supabase = getSupabase();
      if (!supabase) throw new Error("Supabase is not configured — cannot upload CV");
      const objectPath = `cv-${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage.from("cv").upload(objectPath, file, { contentType: "application/pdf", upsert: true });
      if (uploadError) throw new Error(uploadError.message);
      setProgress(100);
      const saveResult = await api.cv.updateSettings({ objectPath, fileName: file.name });
      if (!saveResult.success) {
        await supabase.storage.from("cv").remove([objectPath]);
        throw new Error(saveResult.message);
      }
      await refetch();
      toast({ title: "CV uploaded successfully", description: `${file.name} is now live.` });
    } catch (err) {
      toast({ title: "Upload failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally { setUploading(false); setProgress(0); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (file) uploadFile(file); e.target.value = "";
  };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files?.[0]; if (file) uploadFile(file); };

  const handleRemove = async () => {
    try {
      const result = await api.cv.deleteSettings();
      if (!result.success) throw new Error(result.message);
      await refetch(); toast({ title: "CV removed" });
    } catch (err) {
      logError("Failed to delete CV settings", err, "CvManager");
      toast({ title: "Remove failed", variant: "destructive", description: err instanceof Error ? err.message : undefined });
    }
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });

  if (isLoading) return <AdminLoadingState variant="cv" />;
  if (isError) return (
    <AdminErrorState
      title="Failed to load CV settings"
      message={error instanceof Error ? error.message : "Unknown error"}
      onRetry={() => refetch()}
      wrapperClassName="p-4 sm:p-6 flex flex-col items-center justify-center min-h-64 gap-4"
      iconClassName="h-10 w-10 text-destructive"
      contentClassName="text-center"
      messageClassName="text-sm text-muted-foreground mt-1"
    />
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">CV / Resume</h1>
        <p className="text-sm text-muted-foreground">Upload your resume PDF. It will be served at <code className="bg-muted px-1 py-0.5 rounded text-xs">/api/v1/cv</code> and linked from the portfolio's Download CV button.</p>
      </div>
      {settings?.objectPath && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0"><FileText size={20} className="text-emerald-500" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap"><span className="font-medium text-sm truncate">{settings.fileName}</span><Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-600">Live</Badge></div>
                <p className="text-xs text-muted-foreground mt-0.5">Last updated {fmt(settings.updatedAt)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="min-h-[44px] gap-1.5 text-xs" onClick={() => window.open("/api/v1/cv", "_blank")}><ExternalLink size={12} />Preview</Button>
                <Button size="sm" variant="ghost" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setShowRemoveConfirm(true)} aria-label="Remove CV"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <CvUploadZone uploading={uploading} progress={progress} dragging={dragging} hasExisting={!!settings?.objectPath}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onFileChange={handleFileChange} fileInputRef={fileInputRef} />
      <Card><CardContent className="pt-5 pb-4"><div className="flex items-start gap-3"><CheckCircle size={16} className="text-primary mt-0.5 shrink-0" /><div className="text-sm text-muted-foreground space-y-1"><p>Visitors can download your CV at <strong className="text-foreground">/api/v1/cv</strong>.</p><p>The Download CV button on the portfolio hero section already points to this endpoint.</p></div></div></CardContent></Card>
      <Card><CardContent className="pt-5 pb-4"><div className="flex items-start gap-3"><Info size={16} className="text-primary mt-0.5 shrink-0" /><div className="text-sm text-muted-foreground space-y-1"><p>The generated CV PDF includes a QR code linking to: <code className="text-primary bg-primary/10 px-1 py-0.5 rounded text-xs">{import.meta.env.VITE_SITE_URL ?? 'https://mustafasayed.replit.app'}</code></p><p>The QR code appears in the top-right corner of the first page.</p></div></div></CardContent></Card>
      <SmartConfirmDialog state={{ isOpen: showRemoveConfirm, title: "Remove CV", message: "The Download CV button will show a 'not found' error until a new file is uploaded.", confirmLabel: "Remove", variant: "warning", onConfirm: async () => { await handleRemove(); setShowRemoveConfirm(false); } }} onCancel={() => setShowRemoveConfirm(false)} />
    </div>
  );
}
