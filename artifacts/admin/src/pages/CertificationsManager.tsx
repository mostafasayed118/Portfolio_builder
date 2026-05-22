import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Certification } from "@workspace/supabase/types";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { useToast } from "@workspace/ui";
import { Plus, Pencil, Trash2, AlertCircle, RefreshCw, Award } from "lucide-react";
import { logError } from "@/lib/logger";
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, Input, Label, Skeleton, Switch } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { getErrorMessage } from "@/lib/error-messages";

type Cert = Certification;

const EMPTY_CERT: Cert = {
  id: "",
  title: "",
  issuer: "",
  title_ar: null,
  issuer_ar: null,
  issuer_logo: null,
  date: "",
  date_sort: null,
  category: null,
  credential_url: null,
  sort_order: 0,
  is_published: true,
  credential_id: null,
  created_at: "",
  updated_at: "",
  skills: [],
  user_id: null,
  deleted_at: null,
};

export default function CertificationsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["certifications"],
    queryFn: async () => {
      const res = await api.certifications.list();
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
  });
  const [editing, setEditing] = useState<Cert | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openNew = () => { setIsNew(true); setEditing({ ...EMPTY_CERT }); };
  const openEdit = (c: Cert) => { setIsNew(false); setEditing({ ...c }); };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; } {/* FIX: UX-018 */}
    if (!editing.issuer?.trim()) { toast({ title: "Issuer is required", variant: "destructive" }); return; }
    if (!editing.date?.trim()) { toast({ title: "Date is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const rowData = {
        title: editing.title || "",
        issuer: editing.issuer || "",
        issuer_logo: editing.issuer_logo || "🏅",
        date: editing.date || "",
        date_sort: editing.date_sort || "",
        category: editing.category || null,
        credential_url: editing.credential_url || null,
        sort_order: editing.sort_order ?? 0,
        is_published: editing.is_published ?? true,
        credential_id: editing.credential_id || null,
      };
      let res;
      if (isNew) {
        res = await api.certifications.create(rowData);
      } else {
        res = await api.certifications.update(editing.id!, rowData);
      }
      if (!res.success) throw new Error(res.message);
      toast({ title: isNew ? "Created" : "Updated" });
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      setEditing(null);
    } catch (err) { logError("Failed to save certification", err, "CertificationsManager"); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const cats = [...new Set(items?.map(c => c.category) ?? [])] as string[];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {[1,2,3,4,5].map(i => (
            <Skeleton key={i} className="h-16 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{getErrorMessage(error)}</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[120px]"><h1 className="text-2xl font-bold">Certifications</h1><p className="text-sm text-muted-foreground mt-0.5">{items?.length ?? 0} certifications</p></div>
        <Button size="sm" onClick={openNew} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1.5" />Add Cert</Button>
      </div>

      {(!items || items.length === 0) ? (
        <SmartEmptyState type="certifications" onAction={openNew} />
      ) : cats.map(cat => (
        <div key={cat}>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">{cat}</span>
          <div className="space-y-2">
            {items?.filter(c => c.category === cat).map(cert => (
              <Card key={cert.id} className={!cert.is_published ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4 flex items-center gap-3">
                  <span className="text-2xl">{cert.issuer_logo ?? ""}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{cert.title}</div>
                    <div className="text-xs text-muted-foreground">{cert.issuer} · {cert.date}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Edit certification" onClick={() => openEdit(cert)}><Pencil className="h-4 w-4" /></Button> {/* STANDARDIZED: Type D — inline edit */}
                    <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete certification" onClick={() => setDeleteTarget(cert.id)}><Trash2 className="h-4 w-4" /></Button> {/* STANDARDIZED: Type E — inline delete */}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{isNew ? "Add Certification" : "Edit Certification"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5"><Label className="text-xs">Title</Label>
                <Input value={editing.title} onChange={e => setEditing(x => ({ ...x!, title: e.target.value }))} className="h-9" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Issuer</Label>
                  <Input value={editing.issuer} onChange={e => setEditing(x => ({ ...x!, issuer: e.target.value }))} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Issuer Logo (emoji)</Label>
                  <Input value={editing.issuer_logo ?? ""} onChange={e => setEditing(x => ({ ...x!, issuer_logo: e.target.value }))} className="h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Date (display)</Label>
                  <Input value={editing.date} onChange={e => setEditing(x => ({ ...x!, date: e.target.value }))} placeholder="Mar 2024" className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Date Sort (YYYY-MM)</Label>
                  <Input value={editing.date_sort ?? ""} onChange={e => setEditing(x => ({ ...x!, date_sort: e.target.value }))} placeholder="2024-03" className="h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Category</Label>
                  <Input value={editing.category ?? ""} onChange={e => setEditing(x => ({ ...x!, category: e.target.value }))} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing(x => ({ ...x!, sort_order: Number(e.target.value) }))} className="h-8 text-sm" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Credential URL</Label>
                <Input value={editing.credential_url ?? ""} onChange={e => setEditing(x => ({ ...x!, credential_url: e.target.value }))} className="h-8 text-sm" /></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Published</Label>
                <Switch checked={editing.is_published ?? false} onCheckedChange={v => setEditing(x => ({ ...x!, is_published: v }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SmartConfirmDialog
        state={{
          isOpen: !!deleteTarget,
          title: "Delete Certification",
          message: "This action cannot be undone. The certification will be permanently removed.",
          confirmLabel: "Delete",
          variant: "danger",
          onConfirm: async () => {
            try {
              const res = await api.certifications.delete(deleteTarget!);
              if (!res.success) throw new Error(res.message);
              toast({ title: "Certification deleted" });
              queryClient.invalidateQueries({ queryKey: ["certifications"] });
            } catch (err) {
              logError("Failed to delete certification", err, "CertificationsManager");
              toast({ title: "Delete failed", variant: "destructive" });
            }
            setDeleteTarget(null);
          },
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
