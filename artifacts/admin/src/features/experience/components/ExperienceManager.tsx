import { useQueryClient } from "@tanstack/react-query";
import type { Experience } from "@workspace/supabase/types";
import { api } from "@/lib/api-client";
import { useState } from "react";
import { useToast } from "@workspace/ui";
import { Plus, Pencil, Trash2, X, Download } from "lucide-react";
import { logError } from "@/lib/logger";
import { Badge, Button, Card, CardContent, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Switch } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { useEntityQuery } from "@/lib/use-entity-query";
import { exportToCsv } from "@/lib/export-csv";

type ExpType = "internship" | "certification" | "volunteer";
type ExpRow = {
  id: string; title: string; company: string; location: string;
  period: string; description: string[]; technologies: string[];
  type: ExpType; sort_order: number; is_published: boolean;
};
type EditForm = {
  title: string; company: string; location: string; period: string;
  description: string[]; technologies: string[]; type: ExpType;
  sort_order: number; is_published: boolean; id?: string;
};
const BLANK: EditForm = { title: "", company: "", location: "", period: "", description: [""], technologies: [], type: "internship", sort_order: 999, is_published: true };

export default function ExperienceManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: items, isLoading, isError, error, refetch } = useEntityQuery<Experience[]>(
    "experience",
    (uid) => api.experience.list(uid ?? undefined) as unknown as Promise<{ success: true; data?: Experience[] } | { success: false; message: string }>,
  );
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openNew = () => { setIsNew(true); setEditing({ ...BLANK, description: [""], technologies: [] }); setTechInput(""); };
  const openEdit = (e: ExpRow) => { setIsNew(false); setEditing({ ...e, sort_order: e.sort_order ?? 999 }); setTechInput(""); };

  const updateDesc = (i: number, val: string) =>
    setEditing(x => ({ ...x!, description: x!.description.map((d, idx) => idx === i ? val : d) }));
  const addDesc = () => setEditing(x => ({ ...x!, description: [...x!.description, ""] }));
  const removeDesc = (i: number) => setEditing(x => ({ ...x!, description: x!.description.filter((_, idx) => idx !== i) }));

  const addTech = () => {
    const v = techInput.trim();
    if (!v || !editing) return;
    setEditing(x => ({ ...x!, technologies: [...x!.technologies, v] }));
    setTechInput("");
  };
  const removeTech = (t: string) => setEditing(x => ({ ...x!, technologies: x!.technologies.filter(v => v !== t) }));

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.title?.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    if (!editing.company?.trim()) { toast({ title: "Company is required", variant: "destructive" }); return; }
    if (!editing.period?.trim()) { toast({ title: "Period is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const { id: editId, ...data } = editing;
      let res;
      if (isNew) res = await api.experience.create(data);
      else res = await api.experience.update(editId!, data);
      if (!res.success) throw new Error(res.message);
      toast({ title: isNew ? "Created" : "Updated" });
      queryClient.invalidateQueries({ queryKey: ["experience"] });
      setEditing(null);
    } catch (err) { logError("Failed to save experience", err, "ExperienceManager"); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (isLoading) return <AdminLoadingState />;

  if (isError) {
    return <AdminErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[120px]"><h1 className="text-2xl font-bold">Experience</h1><p className="text-sm text-muted-foreground mt-0.5">{items?.length ?? 0} entries</p></div>
        <Button size="sm" variant="outline" onClick={() => items && exportToCsv(items.map(e => ({ title: e.title, company: e.company, location: e.location ?? "", period: e.period ?? "", type: e.type, technologies: (e.technologies ?? []).join("; "), is_published: e.is_published ?? true })), [
          { key: "title", label: "Title" },
          { key: "company", label: "Company" },
          { key: "location", label: "Location" },
          { key: "period", label: "Period" },
          { key: "type", label: "Type" },
          { key: "technologies", label: "Technologies" },
          { key: "is_published", label: "Published" },
        ], `experience-${Date.now()}.csv`)}><Download className="h-4 w-4 mr-1.5" />Export</Button>
        <Button size="sm" onClick={openNew} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1.5" />Add Entry</Button>
      </div>

      <div className="space-y-3">
        {(!items || items.length === 0) ? (
          <SmartEmptyState type="experience" onAction={openNew} />
        ) : items?.map(item => (
          <Card key={item.id} className={!item.is_published ? "opacity-60" : ""}>
            <CardContent className="pt-4 pb-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{item.title}</span>
                  <span className="text-muted-foreground text-xs">@ {item.company}</span>
                  <Badge variant="outline" className="text-xs">{item.type}</Badge>
                  {!item.is_published && <Badge variant="secondary" className="text-xs">Draft</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.period} · {item.location}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Edit experience" onClick={() => { const { current: _, order_num: __, created_at: ___, updated_at: ____, ...rest } = item; openEdit({ ...rest, sort_order: item.sort_order ?? 0, is_published: item.is_published ?? false }); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete experience" onClick={() => setDeleteTarget(item.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Experience" : "Edit Experience"}</DialogTitle>
            <DialogDescription className="sr-only">
              {isNew ? "Add a new experience entry." : "Edit experience details."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {([["title", "Title"], ["company", "Company"], ["location", "Location"], ["period", "Period"]] as [keyof typeof editing, string][]).map(([k, label]) => (
                  <div key={k} className="space-y-1"><Label htmlFor={k} className="text-xs">{label}</Label>
                    <Input id={k} value={editing[k] as string} onChange={e => setEditing(x => ({ ...x!, [k]: e.target.value }))} className="h-8 text-sm" /></div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={editing.type} onValueChange={v => setEditing(x => ({ ...x!, type: v as "internship" | "certification" | "volunteer" }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internship">Internship</SelectItem>
                    <SelectItem value="certification">Certification</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><Label className="text-xs">Description Bullets</Label>
                  <Button size="sm" variant="ghost" className="min-h-[44px] text-xs" onClick={addDesc} aria-label="Add description bullet"><Plus className="h-4 w-4 mr-1" />Add</Button></div>
                {editing.description.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={d} onChange={e => updateDesc(i, e.target.value)} className="h-8 text-sm flex-1" placeholder={`Bullet ${i + 1}…`} />
                    <button onClick={() => removeDesc(i)} className="relative min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-destructive after:absolute after:inset-[-6px]" aria-label={`Remove description bullet ${i + 1}`}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="space-y-2"><Label className="text-xs">Technologies</Label>
                <div className="flex flex-wrap gap-1">
                  {editing.technologies.map(t => <Badge key={t} variant="secondary" className="flex items-center gap-1 pr-1">{t}<button type="button" onClick={() => removeTech(t)} className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-['']" aria-label={`Remove technology ${t}`}><X className="h-3 w-3" /></button></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTech()} placeholder="Add tech…" className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={addTech} className="min-h-[44px]" aria-label="Add technology"><Plus className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Sort Order</Label>
                  <Input type="number" value={editing.sort_order} onChange={e => setEditing(x => ({ ...x!, sort_order: Number(e.target.value) }))} className="h-8 text-sm" /></div>
              </div>
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

      <SmartConfirmDialog
        state={{
          isOpen: !!deleteTarget,
          title: "Delete Experience",
          message: "This action cannot be undone. The experience entry will be permanently removed.",
          confirmLabel: "Delete",
          variant: "danger",
          onConfirm: async () => {
            try {
              const res = await api.experience.delete(deleteTarget!);
              if (!res.success) throw new Error(res.message);
              toast({ title: "Experience deleted" });
              queryClient.invalidateQueries({ queryKey: ["experience"] });
            } catch (err) {
              logError("Failed to delete experience", err, "ExperienceManager");
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
