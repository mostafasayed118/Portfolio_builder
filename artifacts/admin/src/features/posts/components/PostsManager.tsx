import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, NotebookPen, CalendarCheck2, Image as ImageIcon } from "lucide-react";
import { api } from "@/lib/api-client";
import {
  Button, Card, CardContent, Input, Textarea, Badge, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@workspace/ui";
import { useToast } from "@workspace/ui";
import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import { SmartEmptyState } from "@/components/SmartEmptyState";
import { AdminErrorState } from "@/components/AdminErrorState";
import { AdminLoadingState } from "@/components/AdminLoadingState";
import ImageUploader, { type UploadedImage } from "@/components/ImageUploader";
import MarkdownEditor from "@/features/posts/components/MarkdownEditor";
import { useEntityQuery } from "@/lib/use-entity-query";
import type { BlogPost } from "@workspace/supabase/types";

const BLANK_POST: Partial<BlogPost> & { id?: string } = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  cover_image_url: null,
  tags: [],
  is_published: false,
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDate(ts?: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function PostsManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useEntityQuery<BlogPost[]>(
    "posts",
    (uid) => api.posts.list(uid ?? undefined),
  );
  const posts = data as BlogPost[] | undefined;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<BlogPost> & { id?: string }>(BLANK_POST);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [deleteTarget, setDeleteTarget] = useState<BlogPost | null>(null);

  const filtered = useMemo(() => {
    if (!posts) return [];
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      const matchesSearch = !q
        || p.title.toLowerCase().includes(q)
        || Boolean(p.tags?.some((t) => t.toLowerCase().includes(q)));
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "published" && p.is_published === true)
        || (statusFilter === "draft" && p.is_published !== true);
      return matchesSearch && matchesStatus;
    });
  }, [posts, search, statusFilter]);

  const openNew = () => {
    setEditing({ ...BLANK_POST });
    setDialogOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing({
      id: post.id, title: post.title, slug: post.slug, excerpt: post.excerpt ?? "",
      content: post.content, cover_image_url: post.cover_image_url,
      tags: post.tags ?? [], is_published: post.is_published ?? false,
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (value: string) => {
    setEditing((prev) => {
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
    setEditing((prev) => ({
      ...prev,
      tags: prev.tags?.includes(tag) ? prev.tags : [...(prev.tags ?? []), tag],
    }));
  };

  const removeTag = (tag: string) => {
    setEditing((prev) => ({ ...prev, tags: (prev.tags ?? []).filter((t) => t !== tag) }));
  };

  const handleCoverUpload = (images: UploadedImage[]) => {
    const image = images.at(-1);
    const coverUrl = image?.variants.find((variant) => variant.type === "social")?.url
      ?? image?.variants.find((variant) => variant.type === "medium")?.url
      ?? image?.url
      ?? null;
    setEditing((prev) => ({ ...prev, cover_image_url: coverUrl }));
  };

  const handleSave = async () => {
    const payload = editing;
    if (!payload.title?.trim() || !payload.slug?.trim() || !payload.content?.trim()) {
      toast({ title: "Title, slug, and content are required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { id, ...rest } = payload;
      const body = {
        ...rest,
        excerpt: rest.excerpt || null,
        cover_image_url: rest.cover_image_url || null,
        tags: rest.tags ?? [],
        is_published: rest.is_published ?? false,
      };
      const res = id
        ? await api.posts.update(id, body)
        : await api.posts.create(body);
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      setDialogOpen(false);
      toast({ title: id ? "Post updated" : "Post created" });
    } catch (err) {
      toast({
        title: "Failed to save post",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await api.posts.delete(deleteTarget.id);
      if (!res.success) throw new Error(res.message);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast({ title: "Post deleted" });
    } catch (err) {
      toast({
        title: "Failed to delete post",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <AdminLoadingState variant="posts" />;

  if (isError) {
    return <AdminErrorState error={error} onRetry={() => refetch()} />;
  }

  return (
    <>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[160px]">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <NotebookPen className="h-6 w-6 text-primary" />
              Blog Posts
              {posts && posts.length > 0 && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{posts.length}</span>
              )}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage Markdown blog posts (drafts and published).</p>
          </div>
          <Button onClick={openNew} className="min-h-[44px]">
            <Plus className="h-4 w-4 mr-2" /> New Post
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search posts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <div className="flex items-center gap-1" aria-label="Post status filter">
            {(["all", "published", "draft"] as const).map((status) => (
              <Button
                key={status}
                type="button"
                size="sm"
                variant={statusFilter === status ? "secondary" : "ghost"}
                onClick={() => setStatusFilter(status)}
                aria-pressed={statusFilter === status}
              >
                {status === "all" ? "All" : status === "published" ? "Published" : "Drafts"}
              </Button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {posts?.length === 0 ? (
                <SmartEmptyState type="default" onAction={openNew} actionLabel="New Post" />
              ) : (
                "No posts match this search."
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {filtered.map((post) => {
              const published = post.is_published === true;
              return (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {published ? (
                        <Badge variant="outline" className="bg-success/10 text-success border-success/30">Published</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">Draft</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">Updated {formatDate(post.updated_at)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground leading-snug">{post.title}</h3>
                      {post.excerpt && <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>}
                    </div>
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="text-xs text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/60">{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button size="sm" variant="outline" onClick={() => openEdit(post)}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(post)}>Delete</Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && !saving && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing.id ? "Edit Post" : "New Post"}</DialogTitle>
            <DialogDescription>Write Markdown content and (optionally) publish it.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title *</label>
                <Input value={editing.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="My first post" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Slug *</label>
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing((p) => ({ ...p, slug: e.target.value }))} placeholder="my-first-post" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Excerpt</label>
              <Textarea value={editing.excerpt ?? ""} onChange={(e) => setEditing((p) => ({ ...p, excerpt: e.target.value }))} rows={2} maxLength={500} />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" /> Cover image
              </label>
              <Input value={editing.cover_image_url ?? ""} onChange={(e) => setEditing((p) => ({ ...p, cover_image_url: e.target.value || null }))} placeholder="https://…" />
              <ImageUploader
                entityType="content"
                maxFiles={1}
                onUploadComplete={handleCoverUpload}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Content (Markdown) *</label>
              <MarkdownEditor
                value={editing.content ?? ""}
                onChange={(content) => setEditing((p) => ({ ...p, content }))}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Tags (Enter to add)</label>
              <TagChips tags={editing.tags ?? []} onAdd={addTag} onRemove={removeTag} />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch
                  checked={editing.is_published === true}
                  onCheckedChange={(checked) => setEditing((p) => ({ ...p, is_published: checked }))}
                  aria-label="Published"
                />
                <span className="text-sm text-muted-foreground">{editing.is_published ? "Published" : "Draft"}</span>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <CalendarCheck2 className="h-3.5 w-3.5" />
                Published on publishing.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {saving ? "Saving…" : "Save Post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SmartConfirmDialog
        state={{
          isOpen: !!deleteTarget,
          title: "Delete Post",
          message: `Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`,
          confirmLabel: "Delete",
          variant: "danger",
          onConfirm: handleDelete,
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  );
}

function TagChips({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60">
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className="hover:text-destructive" aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
      </div>
      <input
        className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        placeholder="Add a tag and press Enter"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onAdd(value); setValue(""); }
        }}
      />
    </div>
  );
}
