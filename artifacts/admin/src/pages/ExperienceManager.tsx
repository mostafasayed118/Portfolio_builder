import { useQuery } from "@tanstack/react-query";
import { getSupabase, isSupabaseConfigured } from "@/lib/convex";
import { listExperience, createExperience, updateExperience, deleteExperience } from "@workspace/db/experience";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X } from "lucide-react";

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
  const { data: items } = useQuery({
    queryKey: ["experience"],
    queryFn: () => listExperience(getSupabase()),
    enabled: isSupabaseConfigured,
  });
  const [editing, setEditing] = useState<EditForm | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [techInput, setTechInput] = useState("");

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
    setSaving(true);
    try {
      const { id: editId, ...data } = editing;
      if (isNew) await createExperience(getSupabase(), data);
      else await updateExperience(getSupabase(), editId!, data);
      toast({ title: isNew ? "Created" : "Updated" });
      setEditing(null);
    } catch (err) { console.error(err); toast({ title: "Failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Experience</h1><p className="text-sm text-muted-foreground mt-0.5">{items?.length ?? 0} entries</p></div>
        <Button size="sm" onClick={openNew}><Plus size={14} className="mr-1.5" />Add Entry</Button>
      </div>

      <div className="space-y-3">
        {items?.map(item => (
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
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { const { current: _, ...rest } = item; openEdit({ ...rest, sort_order: item.sort_order ?? 0, is_published: item.is_published ?? false }); }}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={async () => { if (confirm("Delete?")) { await deleteExperience(getSupabase(), item.id); toast({ title: "Deleted" }); } }}><Trash2 size={13} /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={o => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{isNew ? "Add Experience" : "Edit Experience"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                {([["title", "Title"], ["company", "Company"], ["location", "Location"], ["period", "Period"]] as [keyof typeof editing, string][]).map(([k, label]) => (
                  <div key={k} className="space-y-1"><Label className="text-xs">{label}</Label>
                    <Input value={editing[k] as string} onChange={e => setEditing(x => ({ ...x!, [k]: e.target.value }))} className="h-8 text-sm" /></div>
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
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={addDesc}><Plus size={11} className="mr-1" />Add</Button></div>
                {editing.description.map((d, i) => (
                  <div key={i} className="flex gap-2">
                    <Input value={d} onChange={e => updateDesc(i, e.target.value)} className="h-8 text-sm flex-1" placeholder={`Bullet ${i + 1}…`} />
                    <button onClick={() => removeDesc(i)} className="text-muted-foreground hover:text-destructive"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="space-y-2"><Label className="text-xs">Technologies</Label>
                <div className="flex flex-wrap gap-1">
                  {editing.technologies.map(t => <Badge key={t} variant="secondary" className="flex items-center gap-1 pr-1">{t}<button onClick={() => removeTech(t)}><X size={10} /></button></Badge>)}
                </div>
                <div className="flex gap-2">
                  <Input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTech()} placeholder="Add tech…" className="h-8 text-sm" />
                  <Button size="sm" variant="outline" onClick={addTech}><Plus size={12} /></Button>
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
    </div>
  );
}
