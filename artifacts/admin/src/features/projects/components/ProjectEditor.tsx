import { useState } from "react";
import { X, Image as ImageIcon, Plus } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Textarea } from "@workspace/ui";
import ImageUploader from "@/components/ImageUploader";
import type { Project } from "@/features/projects/types";

type ProjectForm = Partial<Project> & { id?: string };

interface ProjectEditorProps {
  editing: ProjectForm | null;
  isNew: boolean;
  saving: boolean;
  onEdit: React.Dispatch<React.SetStateAction<ProjectForm | null>>;
  onSaved: () => void;
}

export function ProjectEditor({ editing, isNew, saving, onEdit, onSaved }: ProjectEditorProps) {
  const [techInput, setTechInput] = useState("");
  const [metricInput, setMetricInput] = useState("");
  const [projectImages, setProjectImages] = useState<{ id: string; url: string }[]>([]);

  const addTag = (field: "tech_stack" | "metrics", val: string, setter: (v: string) => void) => {
    const v = val.trim();
    if (!v || !editing) return;
    onEdit(e => ({ ...e!, [field]: [...(e![field] as string[]), v] }));
    setter("");
  };

  const removeTag = (field: "tech_stack" | "metrics", val: string) =>
    onEdit(e => ({ ...e!, [field]: (e![field] as string[]).filter(x => x !== val) }));

  return (
    <Dialog open={!!editing} onOpenChange={o => !o && onEdit(null)}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add Project" : "Edit Project"}</DialogTitle>
          <DialogDescription className="sr-only">
            {isNew ? "Add a new project to your portfolio." : "Edit project details."}
          </DialogDescription>
        </DialogHeader>
        {editing && (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5"><Label className="text-xs">Title</Label>
              <Input value={editing.title} onChange={e => onEdit(x => ({ ...x!, title: e.target.value }))} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label>
              <Textarea value={editing.description} onChange={e => onEdit(x => ({ ...x!, description: e.target.value }))} rows={3} /></div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><ImageIcon size={12} /> Project Images</Label>
              <ImageUploader entityType="project" entityId={editing.id} maxFiles={5} existingImages={projectImages} onUploadComplete={(imgs) => setProjectImages(imgs)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                <Input value={editing.category} onChange={e => onEdit(x => ({ ...x!, category: e.target.value }))} className="h-8" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Sort Order</Label>
                <Input type="number" value={editing.sort_order} onChange={e => onEdit(x => ({ ...x!, sort_order: Number(e.target.value) }))} className="h-8" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">GitHub URL</Label>
              <Input value={editing.github_url} onChange={e => onEdit(x => ({ ...x!, github_url: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Live URL (optional)</Label>
              <Input value={editing.live_url} onChange={e => onEdit(x => ({ ...x!, live_url: e.target.value }))} className="h-8 text-sm" /></div>
            <div className="space-y-2"><Label className="text-xs">Tech Stack</Label>
              <div className="flex flex-wrap gap-1">
                {editing.tech_stack?.map(t => <Badge key={t} variant="secondary" className="flex items-center gap-1 pr-1">{t}<button type="button" onClick={() => removeTag("tech_stack", t)} className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-['']" aria-label={`Remove technology ${t}`}><X className="h-3 w-3" /></button></Badge>)}
              </div>
              <div className="flex gap-2">
                <Input value={techInput} onChange={e => setTechInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag("tech_stack", techInput, setTechInput)} placeholder="Add tech…" className="h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={() => addTag("tech_stack", techInput, setTechInput)} className="min-h-[44px]" aria-label="Add technology"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2"><Label className="text-xs">Metrics (optional)</Label>
              <div className="flex flex-wrap gap-1">
                {editing.metrics?.map(m => <Badge key={m} variant="outline" className="flex items-center gap-1 pr-1">{m}<button type="button" onClick={() => removeTag("metrics", m)} className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-['']" aria-label={`Remove metric ${m}`}><X className="h-3 w-3" /></button></Badge>)}
              </div>
              <div className="flex gap-2">
                <Input value={metricInput} onChange={e => setMetricInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addTag("metrics", metricInput, setMetricInput)} placeholder="e.g. 99.9% uptime" className="h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={() => addTag("metrics", metricInput, setMetricInput)} className="min-h-[44px]" aria-label="Add metric"><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="flex items-center justify-between"><Label className="text-sm">Featured</Label><Switch checked={editing.featured} onCheckedChange={v => onEdit(x => ({ ...x!, featured: v }))} /></div>
            <div className="flex items-center justify-between"><Label className="text-sm">Published</Label><Switch checked={editing.is_published} onCheckedChange={v => onEdit(x => ({ ...x!, is_published: v }))} /></div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onEdit(null)}>Cancel</Button>
          <Button onClick={onSaved} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
