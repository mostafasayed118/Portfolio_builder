import { useState, useEffect } from "react";
import { X, Image as ImageIcon, Plus } from "lucide-react";
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Switch, Textarea, useToast } from "@workspace/ui";
import ImageUploader from "@/components/ImageUploader";
import { getSupabase } from "@/lib/supabase";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { listEntityImages } from "@workspace/db/images";
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
  const { toast } = useToast();
  const [techInput, setTechInput] = useState("");
  const [metricInput, setMetricInput] = useState("");
  const [projectImages, setProjectImages] = useState<{ id: string; url: string }[]>([]);

  // Load the project's attached gallery images (image_metadata) when editing.
  useEffect(() => {
    let cancelled = false;
    const id = editing?.id;
    if (!id) {
      setProjectImages([]);
      return;
    }
    const sb = getSupabase();
    if (!sb) {
      setProjectImages([]);
      return;
    }
    listEntityImages(sb, "projects", id)
      .then((rows) => {
        if (cancelled) return;
        setProjectImages(rows.map((row) => ({
          id: row.id,
          url: sb.storage.from("project_images").getPublicUrl(row.storage_path).data.publicUrl,
        })));
      })
      .catch(() => {
        if (!cancelled) setProjectImages([]);
      });
    return () => { cancelled = true; };
  }, [editing?.id]);

  const addTag = (field: "tech_stack" | "metrics", val: string, setter: (v: string) => void) => {
    const v = val.trim();
    if (!v || !editing) return;
    onEdit(e => e ? ({ ...e, [field]: [...(e[field] as string[]), v] }) : e);
    setter("");
  };

  const removeTag = (field: "tech_stack" | "metrics", val: string) =>
    onEdit(e => e ? ({ ...e, [field]: (e[field] as string[]).filter(x => x !== val) }) : e);

  /** Permanently delete an attached gallery image (storage file + metadata). */
  const deleteProjectImage = async (imageId: string) => {
    try {
      const res = await api.images.delete(imageId);
      if (!res.success) throw new Error(res.message);
      setProjectImages(prev => prev.filter(img => img.id !== imageId));
      toast({ title: "Image deleted" });
    } catch (err) {
      logError("Failed to delete image", err, "ProjectEditor");
      toast({ title: "Delete failed", variant: "destructive" });
    }
  };

  /** Apply the new order optimistically, reverting on failure. */
  const reorderProjectImages = async (orderedIds: string[]) => {
    const previous = projectImages;
    const byId = new Map(previous.map(img => [img.id, img]));
    const next = orderedIds.map(id => byId.get(id)).filter(Boolean) as { id: string; url: string }[];
    if (next.length !== previous.length) return; // ids changed mid-flight — ignore
    setProjectImages(next);
    try {
      const res = await api.images.reorder(orderedIds);
      if (!res.success) throw new Error(res.message);
    } catch (err) {
      logError("Failed to reorder images", err, "ProjectEditor");
      setProjectImages(previous);
      toast({ title: "Reorder failed", variant: "destructive" });
    }
  };

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
              <Input value={editing.title} onChange={e => onEdit(x => x ? ({ ...x, title: e.target.value }) : x)} className="h-9" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Description</Label>
              <Textarea value={editing.description} onChange={e => onEdit(x => x ? ({ ...x, description: e.target.value }) : x)} rows={3} /></div>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5"><ImageIcon size={12} /> Project Images</Label>
              <ImageUploader
                entityType="projects"
                entityId={editing.id}
                maxFiles={5}
                existingImages={projectImages}
                onDeleteExisting={deleteProjectImage}
                onReorderExisting={reorderProjectImages}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Category</Label>
                <Input value={editing.category} onChange={e => onEdit(x => x ? ({ ...x, category: e.target.value }) : x)} className="h-8" /></div>
              <div className="space-y-1.5"><Label className="text-xs">Sort Order</Label>
                <Input type="number" value={editing.sort_order} onChange={e => onEdit(x => x ? ({ ...x, sort_order: Number(e.target.value) }) : x)} className="h-8" /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">GitHub URL</Label>
              <Input value={editing.github_url} onChange={e => onEdit(x => x ? ({ ...x, github_url: e.target.value }) : x)} className="h-8 text-sm" /></div>
            <div className="space-y-1.5"><Label className="text-xs">Live URL (optional)</Label>
              <Input value={editing.live_url} onChange={e => onEdit(x => x ? ({ ...x, live_url: e.target.value }) : x)} className="h-8 text-sm" /></div>
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
            <div className="flex items-center justify-between"><Label className="text-sm">Featured</Label><Switch checked={editing.featured} onCheckedChange={v => onEdit(x => x ? ({ ...x, featured: v }) : x)} /></div>
            <div className="flex items-center justify-between"><Label className="text-sm">Published</Label><Switch checked={editing.is_published} onCheckedChange={v => onEdit(x => x ? ({ ...x, is_published: v }) : x)} /></div>
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
