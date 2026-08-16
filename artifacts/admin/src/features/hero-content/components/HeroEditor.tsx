import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@workspace/ui";
import { Button, Input, Textarea } from "@workspace/ui";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBeforeUnload } from "@/hooks/use-before-unload";
import { ImageWithFallback } from "@/components/ImageWithFallback";
import ImageUploader, { type UploadedImage } from "@/components/ImageUploader";
import { HeroLivePreview, type HeroFormData } from "@/features/hero-content/components/HeroLivePreview";
import { EditorErrorState, EditorLoadingState } from "@/components/EditorStates";
import { EditorHeader, EditorLayout } from "@/components/EditorScaffold";
import { EditorCard, EditorField } from "@/components/EditorForm";


export default function HeroEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: heroData, isLoading, error, refetch } = useQuery({
    queryKey: ["hero"],
    queryFn: async () => {
      const res = await api.hero.get();
      if (!res.success) throw new Error(res.message);
      return res.data ?? null;
    },
  });

  const { register, control, handleSubmit, reset, setValue, getValues, formState: { isDirty } } = useForm<HeroFormData>({
    defaultValues: {
      name: "",
      typewriter_lines: [""],
      subtitle: "",
      bio: "",
      avatar_url: "",
      cv_url: "",
      social_links: {},
      stats: [],
    },
  });

  const watchedData = useWatch({ control });
  const [showPreview, setShowPreview] = useState(false);

  useKeyboardShortcuts([
    { key: "s", ctrl: true, handler: () => { if (isDirty) handleSubmit(onSubmit)(); }, description: "Save changes" },
  ]);
  useBeforeUnload(isDirty, "You have unsaved changes. Leave anyway?");

  useEffect(() => {
    if (heroData) {
      reset({
        name: heroData.name || "",
        typewriter_lines: heroData.roles || [""],
        subtitle: heroData.heading || "",
        bio: heroData.description || "",
        avatar_url: heroData.avatar_url || "",
        cv_url: heroData.cv_url || "",
        social_links: {
          github: heroData.github_url || "",
          linkedin: heroData.linkedin_url || "",
          twitter: heroData.twitter_url || "",
          youtube: heroData.youtube_url || "",
          facebook: heroData.facebook_url || "",
          email: heroData.email || "",
        },
        stats: heroData.stats || [],
      });
    }
  }, [heroData, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: HeroFormData) => {
      const res = await api.hero.update({
        name: data.name,
        roles: data.typewriter_lines.filter(l => l.trim()),
        heading: data.subtitle,
        description: data.bio,
        avatar_url: data.avatar_url || null,
        cv_url: data.cv_url || null,
        github_url: data.social_links.github || undefined,
        linkedin_url: data.social_links.linkedin || undefined,
        twitter_url: data.social_links.twitter || null,
        youtube_url: data.social_links.youtube || null,
        facebook_url: data.social_links.facebook || null,
        email: data.social_links.email || undefined,
        stats: data.stats,
      });
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero"] });
      toast({ title: "Hero section updated successfully" });
    },
    onError: (err) => {
      toast({ title: `Save failed: ${err.message}`, variant: "destructive" });
    },
  });

  const onSubmit = (data: HeroFormData) => {
    saveMutation.mutate(data);
  };

  const addTypewriterLine = () => {
    const current = getValues("typewriter_lines") || [];
    setValue("typewriter_lines", [...current, ""], { shouldDirty: true });
  };

  const handleAvatarUpload = (images: UploadedImage[]) => {
    const image = images.at(-1);
    const optimizedUrl = image?.variants.find((variant) => variant.type === "medium")?.url ?? image?.url ?? "";
    setValue("avatar_url", optimizedUrl, { shouldDirty: true });
  };

  const removeTypewriterLine = (index: number) => {
    const current = [...(getValues("typewriter_lines") || [])];
    if (current.length > 1) {
      current.splice(index, 1);
      setValue("typewriter_lines", current, { shouldDirty: true });
    }
  };

  const addStat = () => {
    const current = getValues("stats") || [];
    setValue("stats", [...current, { label: "", value: "" }], { shouldDirty: true });
  };

  const removeStat = (index: number) => {
    const current = [...(getValues("stats") || [])];
    current.splice(index, 1);
    setValue("stats", current, { shouldDirty: true });
  };

  if (isLoading) {
    return (
      <EditorLoadingState title="Hero Editor" />
    );
  }

  if (error) {
    return (
      <EditorErrorState
        message="Failed to load hero content"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <EditorHeader
        title="Hero Editor"
        description="Edit your hero section content"
        actions={(
          <Button onClick={handleSubmit(onSubmit)} disabled={!isDirty || saveMutation.isPending} data-save-button>
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      />

      <EditorLayout
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview((value) => !value)}
        preview={<HeroLivePreview data={watchedData as Partial<HeroFormData>} />}
      >
          <EditorCard title="Identity" contentClassName="space-y-4">
              <EditorField label="Name">
                <Input {...register("name")} placeholder="John Doe" />
              </EditorField>
              <EditorField label="Subtitle / Tagline">
                <Input {...register("subtitle")} placeholder="Hi, I'm John Doe" />
              </EditorField>
              <EditorField label="Bio">
                <Textarea {...register("bio")} placeholder="Short bio..." rows={4} />
              </EditorField>
          </EditorCard>

          <EditorCard title="Avatar & CV" contentClassName="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <EditorField label="Avatar URL">
                    <Input {...register("avatar_url")} placeholder="https://..." />
                  </EditorField>
                </div>
                {watchedData.avatar_url && (
                  <ImageWithFallback
                    src={watchedData.avatar_url}
                    alt="Avatar preview"
                    size="sm"
                    className="h-8 w-8 shrink-0 rounded object-cover border"
                  />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Or upload an image (JPG, PNG, or WEBP; max 10MB).</p>
                <ImageUploader
                  entityType="hero"
                  maxFiles={1}
                  onUploadComplete={handleAvatarUpload}
                />
              </div>
              <EditorField label="CV Download URL">
                <Input {...register("cv_url")} placeholder="https://..." />
              </EditorField>
          </EditorCard>

          <EditorCard title="Typewriter Lines" contentClassName="space-y-3">
              {watchedData.typewriter_lines?.map((_: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input {...register(`typewriter_lines.${i}` as const)} placeholder={`Line ${i + 1}`} />
                  {(watchedData.typewriter_lines?.length || 0) > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeTypewriterLine(i)} className="min-h-[44px] min-w-[44px]" aria-label={`Remove typewriter line ${i + 1}`}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTypewriterLine} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add line
              </Button>
          </EditorCard>

          <EditorCard title="Social Links" contentClassName="space-y-3">
              <EditorField label="GitHub URL">
                <Input {...register("social_links.github")} placeholder="https://github.com/..." />
              </EditorField>
              <EditorField label="LinkedIn URL">
                <Input {...register("social_links.linkedin")} placeholder="https://linkedin.com/in/..." />
              </EditorField>
              <EditorField label="Twitter URL">
                <Input {...register("social_links.twitter")} placeholder="https://twitter.com/..." />
              </EditorField>
              <EditorField label="YouTube URL">
                <Input {...register("social_links.youtube")} placeholder="https://youtube.com/@..." />
              </EditorField>
              <EditorField label="Facebook URL">
                <Input {...register("social_links.facebook")} placeholder="https://facebook.com/..." />
              </EditorField>
              <EditorField label="Email">
                <Input {...register("social_links.email")} placeholder="you@example.com" />
              </EditorField>
          </EditorCard>

          <EditorCard title="Stats" contentClassName="space-y-3">
              {watchedData.stats?.map((stat: { label?: string; value?: string }, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input {...register(`stats.${i}.label` as const)} placeholder="Label" />
                  <Input {...register(`stats.${i}.value` as const)} placeholder="Value" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeStat(i)} className="min-h-[44px] min-w-[44px]" aria-label={`Remove stat ${i + 1}`}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addStat} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add stat
              </Button>
          </EditorCard>

      </EditorLayout>
    </div>
  );
}
