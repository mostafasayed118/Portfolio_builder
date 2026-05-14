import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { listCertifications, createCertification, updateCertification, deleteCertification } from "@workspace/db/certifications";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Cert = {
  id: string; title: string; issuer: string; issuer_logo: string;
  date: string; date_sort: string; category: string; credential_url: string;
  sort_order: number; is_published: boolean;
};
const BLANK = { title: "", issuer: "", issuer_logo: "🏅", date: "", date_sort: "", category: "", credential_url: "#", sort_order: 999, is_published: true };

export default function CertificationsManager() {
  const { toast } = useToast();
  const { data: items } = useQuery({
    queryKey: ["certifications"],
    queryFn: () => listCertifications(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [editing, setEditing] = useState<typeof BLANK & { id?: string } | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setIsNew(true); setEditing({ ...BLANK }); };
  const openEdit = (c: Cert) => { setIsNew(false); setEditing({ ...c }); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { id: editId, ...data } = editing;
      if (isNew) await createCertification(getSupabase(), data);
      else await updateCertification(getSupabase(), editId!, data);
      toast({ title: isNew ? "Created" : "Updated" });
      setEditing(null);
    } catch (err) { console.error(err); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const cats = [...new Set(items?.map(c => c.category) ?? [])];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Certifications</h1><p className="text-sm text-muted-foreground mt-0.5">{items?.length ?? 0} certifications</p></div>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1.5" />Add Cert</Button>
      </div>

      {cats.map(cat => (
        <div key={cat}>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{cat}</h2>
          <div className="space-y-2">
            {items?.filter(c => c.category === cat).map(cert => (
              <Card key={cert.id} className={!cert.is_published ? "opacity-60" : ""}>
                <CardContent className="pt-3 pb-3 flex items-center gap-3">
                  <span className="text-2xl">{cert.issuer_logo ?? ""}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{cert.title}</div>
                    <div className="text-xs text-muted-foreground">{cert.issuer} · {cert.date}</div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit({ ...cert, issuer_logo: cert.issuer_logo ?? "", date_sort: cert.date_sort ?? "", category: cert.category ?? "", credential_url: cert.credential_url ?? "", sort_order: cert.sort_order ?? 0, is_published: cert.is_published ?? false })}><Pencil size={12} /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { if (confirm("Delete?")) { await deleteCertification(getSupabase(), cert.id); toast({ title: "Deleted" }); } }}><Trash2 size={12} /></Button>
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
                  <Input value={editing.issuer_logo} onChange={e => setEditing(x => ({ ...x!, issuer_logo: e.target.value }))} className="h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Date (display)</Label>
                  <Input value={editing.date} onChange={e => setEditing(x => ({ ...x!, date: e.target.value }))} placeholder="Mar 2024" className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Date Sort (YYYY-MM)</Label>
                  <Input value={editing.date_sort} onChange={e => setEditing(x => ({ ...x!, date_sort: e.target.value }))} placeholder="2024-03" className="h-8 text-sm" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Category</Label>
                  <Input value={editing.category} onChange={e => setEditing(x => ({ ...x!, category: e.target.value }))} className="h-8 text-sm" /></div>
                <div className="space-y-1"><Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={e => setEditing(x => ({ ...x!, sort_order: Number(e.target.value) }))} className="h-8 text-sm" /></div>
              </div>
              <div className="space-y-1"><Label className="text-xs">Credential URL</Label>
                <Input value={editing.credential_url} onChange={e => setEditing(x => ({ ...x!, credential_url: e.target.value }))} className="h-8 text-sm" /></div>
              <div className="flex items-center justify-between"><Label className="text-sm">Published</Label>
                <Switch checked={editing.is_published} onCheckedChange={v => setEditing(x => ({ ...x!, is_published: v }))} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
