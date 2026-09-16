import { type Dispatch, type SetStateAction } from "react";
import { Loader2, CalendarCheck2, Image as ImageIcon } from "lucide-react";
import {
  Button, Input, Textarea, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@workspace/ui";
import ImageUploader, { type UploadedImage } from "@/components/ImageUploader";
import MarkdownEditor from "./MarkdownEditor";
import TagChips from "./TagChips";
import type { BlogPost } from "@workspace/supabase/types";

export type PostDraft = Partial<BlogPost> & { id?: string };

interface PostDialogProps {
  open: boolean;
  saving: boolean;
  post: PostDraft;
  onPostChange: Dispatch<SetStateAction<PostDraft>>;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onSave: () => void;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function PostDialog({
  open, saving, post, onPostChange, onOpenChange, onCancel, onSave,
}: PostDialogProps) {
  const handleTitleChange = (value: string) => {
    onPostChange((prev) => {
      const next = { ...prev, title: value };
      // Auto-generate slug on create (or while slug is empty) from the title.
      if (!prev.id && (!prev.slug || prev.slug === slugify(prev.title ?? ""))) {
        next.slug = slugify(value);
      }
      return next;
    });
  };

  const addTag = (raw: string) => {
    const tag = raw.trim().replace(/^#/, "");
    if (!tag) return;
    onPostChange((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tag) ? prev.tags : [...(prev.tags ?? []), tag],
    }));
  };

  const removeTag = (tag: string) => {
    onPostChange((prev) => ({ ...prev, tags: (prev.tags ?? []).filter((t) => t !== tag) }));
  };

  const handleCoverUpload = (images: UploadedImage[]) => {
    const image = images.at(-1);
    const coverUrl = image?.variants.find((variant) => variant.type === "social")?.url
      ?? image?.variants.find((variant) => variant.type === "medium")?.url
      ?? image?.url
      ?? null;
    onPostChange((prev) => ({ ...prev, cover_image_url: coverUrl }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{post.id ? "Edit Post" : "New Post"}</DialogTitle>
          <DialogDescription>Write Markdown content and (optionally) publish it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Title *</label>
              <Input value={post.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="My first post" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Slug *</label>
              <Input value={post.slug ?? ""} onChange={(e) => onPostChange((p) => ({ ...p, slug: e.target.value }))} placeholder="my-first-post" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Excerpt</label>
            <Textarea value={post.excerpt ?? ""} onChange={(e) => onPostChange((p) => ({ ...p, excerpt: e.target.value }))} rows={2} maxLength={500} />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Cover image
            </label>
            <Input value={post.cover_image_url ?? ""} onChange={(e) => onPostChange((p) => ({ ...p, cover_image_url: e.target.value || null }))} placeholder="https://…" />
            <ImageUploader
              entityType="content"
              maxFiles={1}
              onUploadComplete={handleCoverUpload}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Content (Markdown) *</label>
            <MarkdownEditor
              value={post.content ?? ""}
              onChange={(content) => onPostChange((p) => ({ ...p, content }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Tags (Enter to add)</label>
            <TagChips tags={post.tags ?? []} onAdd={addTag} onRemove={removeTag} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={post.is_published === true}
                onCheckedChange={(checked) => onPostChange((p) => ({ ...p, is_published: checked }))}
                aria-label="Published"
              />
              <span className="text-sm text-muted-foreground">{post.is_published ? "Published" : "Draft"}</span>
            </div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Published on publishing.
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            {saving ? "Saving…" : "Save Post"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
