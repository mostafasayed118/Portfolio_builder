import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { listSkills, createSkill, updateSkill, deleteSkill } from "@workspace/db/skills";

type SkillRow = { id: string; name: string; category: string; proficiency: number; is_visible: boolean; sort_order: number };

const BLANK = { name: "", category: "", proficiency: 75, is_visible: true, sort_order: 999 };

export default function SkillsManager() {
  const { toast } = useToast();
  const { data: skills } = useQuery({ queryKey: ["skills"], queryFn: () => listSkills(getSupabase()), enabled: isSupabaseConfigured }) as { data: SkillRow[] | undefined };

  const [editing, setEditing] = useState<Partial<SkillRow> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setIsNew(true); setEditing(BLANK); };
  const openEdit = (s: SkillRow) => { setIsNew(false); setEditing({ ...s }); };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (isNew) {
        await createSkill(getSupabase(), { name: editing.name!, category: editing.category!, proficiency: editing.proficiency!, is_visible: editing.is_visible!, sort_order: editing.sort_order! });
      } else {
        await updateSkill(getSupabase(), editing.id!, editing);
      }
      toast({ title: isNew ? "Skill created" : "Skill updated" });
      setEditing(null);
    } catch (err) { console.error(err); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    await deleteSkill(getSupabase(), id);
    toast({ title: "Skill deleted" });
  };

  const cats = [...new Set(skills?.map(s => s.category) ?? [])];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Skills Manager</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{skills?.length ?? 0} skills across {cats.length} categories.</p>
        </div>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1.5" />Add Skill</Button>
      </div>

      {cats.map(cat => (
        <Card key={cat}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              {cat}
              <Badge variant="secondary" className="text-xs">{skills?.filter(s => s.category === cat).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {skills?.filter(s => s.category === cat).map(skill => (
              <div key={skill.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors group">
                <div className={`w-2 h-2 rounded-full shrink-0 ${skill.is_visible ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{skill.name}</span>
                    <span className="text-xs text-muted-foreground">{skill.proficiency}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1 mt-1">
                    <div className="bg-primary rounded-full h-1 transition-all" style={{ width: `${skill.proficiency}%` }} />
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(skill)}><Pencil size={12} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(skill.id)}><Trash2 size={12} /></Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isNew ? "Add Skill" : "Edit Skill"}</DialogTitle>
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
    </div>
  );
}
