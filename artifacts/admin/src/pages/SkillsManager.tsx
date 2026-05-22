import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { Plus, Pencil, Trash2, Code2, AlertCircle, RefreshCw } from "lucide-react";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Skeleton, Slider, Switch } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { getErrorMessage } from "@/lib/error-messages";

type SkillRow = { id: string; name: string; category: string; proficiency: number; is_visible: boolean; sort_order: number };

const BLANK = { name: "", category: "", proficiency: 75, is_visible: true, sort_order: 999 };

export default function SkillsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: skills, isLoading, isError, error, refetch } = useQuery({ queryKey: ["skills"], queryFn: async () => { const res = await api.skills.list(); if (!res.success) throw new Error(res.message); return res.data; } });

  const [editing, setEditing] = useState<Partial<SkillRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openNew = () => { setIsNew(true); setEditing(BLANK); };
  const openEdit = (s: SkillRow) => { setIsNew(false); setEditing({ ...s }); };
  const mapToRow = (s: { id: string; name: string; category: string; proficiency: number; is_visible: boolean | null; sort_order: number | null }): SkillRow => ({
    id: s.id, name: s.name, category: s.category, proficiency: s.proficiency,
    is_visible: s.is_visible ?? false, sort_order: s.sort_order ?? 0,
  });

  const handleSave = async () => {
    if (!editing) return;
    const name = editing.name?.trim();
    if (!name) { toast({ title: "Name is required", variant: "destructive" }); return; }
    const duplicate = skills?.find(s => s.name.toLowerCase() === name.toLowerCase() && s.id !== editing.id);
    if (duplicate) {
      toast({ title: "Duplicate name", description: `A skill named "${name}" already exists`, variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let res;
      if (isNew) {
        res = await api.skills.create({ name: editing.name!, category: editing.category!, proficiency: editing.proficiency!, is_visible: editing.is_visible!, sort_order: editing.sort_order! });
      } else {
        res = await api.skills.update(editing.id!, editing);
      }
      if (!res.success) throw new Error(res.message);
      toast({ title: isNew ? "Skill created" : "Skill updated" });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
      setEditing(null);
    } catch (err) { logError("Failed to save skill", err, "SkillsManager"); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.skills.delete(id);
      if (!res.success) throw new Error(res.message);
      toast({ title: "Skill deleted" });
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    } catch (err) {
      logError("Failed to delete skill", err, "SkillsManager");
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  const cats = [...new Set(skills?.map(s => s.category) ?? [])];

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
        <div className="flex-1 min-w-[120px]">
          <h1 className="text-2xl font-bold">Skills Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{skills?.length ?? 0} skills across {cats.length} categories.</p>
        </div>
        <Button size="sm" onClick={openNew} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1.5" />Add Skill</Button>
      </div>

      {(!skills || skills.length === 0) ? (
        <SmartEmptyState
          type="skills"
          onAction={openNew}
        />
      ) : cats.map(cat => (
        <Card key={cat}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="font-semibold">{cat}</span>
              <Badge variant="secondary" className="text-xs">{skills?.filter(s => s.category === cat).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skills?.filter(s => s.category === cat).map(skill => {
              const row = mapToRow(skill);
              return (
              <div key={row.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors group">
                <div className={`w-2 h-2 rounded-full shrink-0 ${row.is_visible ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{row.name}</span>
                    <span className="text-xs text-muted-foreground">{row.proficiency}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-primary rounded-full h-1 transition-all" style={{ width: `${row.proficiency}%` }} />
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]" aria-label="Edit skill" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button> {/* STANDARDIZED: Type D — inline edit */}
                  <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive hover:bg-destructive/10" aria-label="Delete skill" onClick={() => setDeleteTarget(row.id)}><Trash2 className="h-4 w-4" /></Button> {/* STANDARDIZED: Type E — inline delete */}
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Skill" : "Edit Skill"}</DialogTitle>
            <DialogDescription className="sr-only">
              {isNew ? "Add a new skill with name, category, and proficiency level." : "Edit the selected skill's details."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={editing.name ?? ""} onChange={e => setEditing(x => ({ ...x!, name: e.target.value }))} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Input value={editing.category ?? ""} onChange={e => setEditing(x => ({ ...x!, category: e.target.value }))} className="h-9" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Proficiency</Label>
                  <span className="text-xs text-muted-foreground font-mono">{editing.proficiency}%</span>
                </div>
                <Slider value={[editing.proficiency ?? 75]} min={0} max={100} step={5} onValueChange={([v]) => setEditing(x => ({ ...x!, proficiency: v }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={editing.sort_order ?? 999} onChange={e => setEditing(x => ({ ...x!, sort_order: Number(e.target.value) }))} className="h-8 text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Visible</Label>
                <Switch checked={editing.is_visible ?? true} onCheckedChange={v => setEditing(x => ({ ...x!, is_visible: v }))} />
              </div>
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
          title: "Delete Skill",
          message: "This action cannot be undone. The skill will be permanently removed.",
          confirmLabel: "Delete",
          variant: "danger",
          onConfirm: async () => {
            await handleDelete(deleteTarget!);
            setDeleteTarget(null);
          },
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
