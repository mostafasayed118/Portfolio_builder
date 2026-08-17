import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { Plus, Download } from "lucide-react";
import { logError } from "@/lib/logger";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, Input, Label, Slider, Switch } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import { PageHeader } from "@/components/PageHeader";
import { RowActions } from "@/components/RowActions";
import { FormDialogFooter } from "@/components/FormDialogFooter";
import { api } from "@/lib/api-client";
import AiTextButton from "@/features/ai/components/AiTextButton";
import { useSkillsList } from "@/features/skills/hooks/useSkills";
import { type SkillRow, BLANK_SKILL, mapToSkillRow } from "@/features/skills/types";
import { exportToCsv } from "@/lib/export-csv";

const UNCATEGORIZED = "Uncategorized";

/** Normalize null/empty/whitespace categories into one stable bucket so a
 *  blank category renders as a real heading (never an empty string) and all
 *  uncategorized skills share a single group + React key. */
function normalizeCategory(category: string | null | undefined): string {
  const trimmed = category?.trim();
  return trimmed ? trimmed : UNCATEGORIZED;
}

export default function SkillsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: skills, isLoading, isError, error, refetch } = useSkillsList();

  const [editing, setEditing] = useState<Partial<SkillRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const openNew = () => { setIsNew(true); setEditing(BLANK_SKILL); };
  const openEdit = (s: SkillRow) => { setIsNew(false); setEditing({ ...s }); };

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
        res = await api.skills.create({
          name,
          category: editing.category ?? "",
          proficiency: editing.proficiency ?? 75,
          is_visible: editing.is_visible ?? true,
          sort_order: editing.sort_order ?? 999,
        });
      } else {
        if (!editing.id) throw new Error("Cannot update a skill without an id");
        res = await api.skills.update(editing.id, editing);
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

  const cats = [...new Set((skills ?? []).map(s => normalizeCategory(s.category)))];

  if (isLoading) return <AdminLoadingState />;

  if (isError) {
    return <AdminErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Skills Manager"
        description={`${skills?.length ?? 0} skills across ${cats.length} categories.`}
        actions={<>
          <Button size="sm" variant="outline" onClick={() => skills && exportToCsv(skills.map(s => ({ name: s.name, category: s.category, proficiency: s.proficiency, icon: s.icon ?? "", is_visible: s.is_visible ?? true, sort_order: s.sort_order ?? 0 })), [
            { key: "name", label: "Name" },
            { key: "category", label: "Category" },
            { key: "proficiency", label: "Proficiency" },
            { key: "icon", label: "Icon" },
            { key: "is_visible", label: "Visible" },
            { key: "sort_order", label: "Sort Order" },
          ], `skills-${Date.now()}.csv`)}><Download className="h-4 w-4 mr-1.5" />Export</Button>
          <Button size="sm" onClick={openNew} className="min-h-[44px]"><Plus className="h-4 w-4 mr-1.5" />Add Skill</Button>
        </>}
      />

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
              <Badge variant="secondary" className="text-xs">{skills?.filter(s => normalizeCategory(s.category) === cat).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skills?.filter(s => normalizeCategory(s.category) === cat).map(skill => {
              const row = mapToSkillRow(skill);
              return (
              <div key={row.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors group">
                <div className={`w-2 h-2 rounded-full shrink-0 ${row.is_visible ? "bg-success" : "bg-muted-foreground/30"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{row.name}</span>
                    <span className="text-xs text-muted-foreground">{row.proficiency}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-primary rounded-full h-1 transition-all" style={{ width: `${row.proficiency}%` }} />
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                  <RowActions editLabel="Edit skill" deleteLabel="Delete skill" onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row.id)} />
                </div>
              </div>
              );
            })}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Skill" : "Edit Skill"}</DialogTitle>
            <DialogDescription className="sr-only">
              {isNew ? "Add a new skill with name, category, and proficiency level." : "Edit the selected skill's details."}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={editing.name ?? ""} onChange={e => setEditing(x => x ? ({ ...x, name: e.target.value }) : x)} className="h-9" />
                  <AiTextButton
                    contentType="skill"
                    label="✨ Generate name"
                    text={editing.name ?? ""}
                    instructions="Recommend a short, professional skill name (1-2 words, capitalized, e.g. 'React', 'TypeScript', 'Figma', 'AWS'). Return only the name, no quotes or commentary."
                    onResult={(t) => setEditing((x) => (x ? { ...x, name: t } : x))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Input value={editing.category ?? ""} onChange={e => setEditing(x => x ? ({ ...x, category: e.target.value }) : x)} className="h-9" />
                  <AiTextButton
                    contentType="skill"
                    label="✨ Generate category"
                    text={editing.category ?? ""}
                    instructions="Recommend only a short skill category name (e.g. 'Frontend', 'Backend', 'DevOps', 'Design', 'AI/ML'). Return only the category name, no quotes or commentary."
                    onResult={(t) => setEditing((x) => (x ? { ...x, category: t } : x))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className="text-xs">Proficiency</Label>
                  <span className="text-xs text-muted-foreground font-mono">{editing.proficiency}%</span>
                </div>
                <Slider value={[editing.proficiency ?? 75]} min={0} max={100} step={5} onValueChange={([v]) => setEditing(x => x ? ({ ...x, proficiency: v }) : x)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sort Order</Label>
                <Input type="number" value={editing.sort_order ?? 999} onChange={e => setEditing(x => x ? ({ ...x, sort_order: Number(e.target.value) }) : x)} className="h-8 text-sm" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Visible</Label>
                <Switch checked={editing.is_visible ?? true} onCheckedChange={v => setEditing(x => x ? ({ ...x, is_visible: v }) : x)} />
              </div>
            </div>
          )}
          <FormDialogFooter onCancel={() => setEditing(null)} onSave={handleSave} saving={saving} />
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
            if (!deleteTarget) return;
            await handleDelete(deleteTarget);
            setDeleteTarget(null);
          },
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
