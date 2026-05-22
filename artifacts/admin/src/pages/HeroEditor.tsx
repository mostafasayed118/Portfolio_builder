import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { Github, Linkedin, Twitter, Mail, Download, Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@workspace/ui";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Skeleton, Textarea } from "@workspace/ui";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBeforeUnload } from "@/hooks/use-before-unload";
import { ImageWithFallback } from "@/components/ImageWithFallback";

type HeroFormData = {
  name: string;
  typewriter_lines: string[];
  subtitle: string;
  bio: string;
  avatar_url: string;
  cv_url: string;
  social_links: {
    github?: string;
    linkedin?: string;
    twitter?: string;
    email?: string;
    [key: string]: string | undefined;
  };
  custom_links: Array<{ label: string; url: string }>;
  stats: Array<{ label: string; value: string }>;
};

function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}

function LivePreview({ data }: { data: Partial<HeroFormData> }) {
  const firstLine = data.typewriter_lines?.[0] || "Developer";
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {data.avatar_url ? (
          <img
            src={data.avatar_url}
            alt="Avatar"
            className="h-20 w-20 rounded-full object-cover border-2 border-primary/20"
          />
        ) : (
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
            {data.name ? data.name.charAt(0) : "?"}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">
            Hi, I'm {data.name || "Your Name"}
          </h2>
          <div className="text-lg text-primary">
            {firstLine}
            <span className="animate-pulse">|</span>
          </div>
        </div>
      </div>
      
      {data.bio && (
        <p className="text-sm text-muted-foreground line-clamp-3">
          {data.bio}
        </p>
      )}
      
      <div className="flex gap-2">
        {data.social_links?.github && (
          <a href={data.social_links.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Github className="h-5 w-5" />
          </a>
        )}
        {data.social_links?.linkedin && (
          <a href={data.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Linkedin className="h-5 w-5" />
          </a>
        )}
        {data.social_links?.twitter && (
          <a href={data.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
            <Twitter className="h-5 w-5" />
          </a>
        )}
        {data.social_links?.email && (
          <a href={`mailto:${data.social_links.email}`} className="text-muted-foreground hover:text-primary">
            <Mail className="h-5 w-5" />
          </a>
        )}
      </div>
      
      {data.cv_url && (
        <Button size="sm" variant="outline" asChild>
          <a href={data.cv_url} target="_blank" rel="noopener noreferrer">
            <Download className="h-4 w-4 mr-2" />
            Download CV
          </a>
        </Button>
      )}
      
      {data.stats && data.stats.length > 0 && (
        <div className="flex gap-4 pt-2">
          {data.stats.map((stat, i) => (
            <div key={i}>
              <div className="font-bold">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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

  const { register, control, handleSubmit, reset, formState: { isDirty } } = useForm<HeroFormData>({
    defaultValues: {
      name: "",
      typewriter_lines: [""],
      subtitle: "",
      bio: "",
      avatar_url: "",
      cv_url: "",
      social_links: {},
      custom_links: [],
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
          email: heroData.email || "",
        },
        custom_links: [],
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
    const current = watchedData.typewriter_lines || [];
    reset({ ...watchedData, typewriter_lines: [...current, ""] });
  };

  const removeTypewriterLine = (index: number) => {
    const current = [...(watchedData.typewriter_lines || [])];
    if (current.length > 1) {
      current.splice(index, 1);
      reset({ ...watchedData, typewriter_lines: current });
    }
  };

  const addStat = () => {
    const current = [...(watchedData.stats || [])];
    reset({ ...watchedData, stats: [...current, { label: "", value: "" }] });
  };

  const removeStat = (index: number) => {
    const current = [...(watchedData.stats || [])];
    current.splice(index, 1);
    reset({ ...watchedData, stats: current });
  };

  const addCustomLink = () => {
    const current = [...(watchedData.custom_links || [])];
    reset({ ...watchedData, custom_links: [...current, { label: "", url: "" }] });
  };

  const removeCustomLink = (index: number) => {
    const current = [...(watchedData.custom_links || [])];
    current.splice(index, 1);
    reset({ ...watchedData, custom_links: current });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Hero Editor</h1>
        </div>
      <div className="lg:hidden mb-4">
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)} className="min-h-[44px]" aria-pressed={showPreview} aria-label={showPreview ? "Hide preview panel" : "Show preview panel"}>
          {showPreview ? "Hide Preview" : "Show Preview"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonForm />
          <SkeletonPreview />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="py-6">
          <p className="text-destructive">Failed to load hero content</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2 min-h-[44px]">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hero Editor</h1>
          <p className="text-sm text-muted-foreground">Edit your hero section content</p>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={!isDirty || saveMutation.isPending} data-save-button>
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Identity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input {...register("name")} placeholder="John Doe" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Subtitle / Tagline</label>
                <Input {...register("subtitle")} placeholder="Hi, I'm John Doe" />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Bio</label>
                <Textarea {...register("bio")} placeholder="Short bio..." rows={4} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Avatar & CV</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Avatar URL</label>
                  <div className="flex items-center gap-2">
                    <Input {...register("avatar_url")} placeholder="https://..." className="flex-1" />
                    {watchedData.avatar_url && (
                      <ImageWithFallback
                        src={watchedData.avatar_url}
                        alt="Avatar preview"
                        size="sm"
                        className="h-8 w-8 rounded object-cover border"
                      />
                    )}
                  </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">CV Download URL</label>
                <Input {...register("cv_url")} placeholder="https://..." />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Typewriter Lines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {watchedData.typewriter_lines?.map((_: string, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input
                    {...register(`typewriter_lines.${i}` as const)}
                    placeholder={`Line ${i + 1}`}
                  />
                  {(watchedData.typewriter_lines?.length || 0) > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeTypewriterLine(i)}
                      className="min-h-[44px] min-w-[44px]"
                      aria-label={`Remove typewriter line ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addTypewriterLine} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add line
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Social Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">GitHub URL</label>
                <Input {...register("social_links.github")} placeholder="https://github.com/..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">LinkedIn URL</label>
                <Input {...register("social_links.linkedin")} placeholder="https://linkedin.com/in/..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Twitter URL</label>
                <Input {...register("social_links.twitter")} placeholder="https://twitter.com/..." />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input {...register("social_links.email")} placeholder="you@example.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {watchedData.stats?.map((_: { label: string; value: string }, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input
                    {...register(`stats.${i}.label` as const)}
                    placeholder="Label"
                  />
                  <Input
                    {...register(`stats.${i}.value` as const)}
                    placeholder="Value"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeStat(i)}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={`Remove stat ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addStat} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add stat
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {watchedData.custom_links?.map((_: { label: string; url: string }, i: number) => (
                <div key={i} className="flex gap-2">
                  <Input
                    {...register(`custom_links.${i}.label` as const)}
                    placeholder="Label"
                  />
                  <Input
                    {...register(`custom_links.${i}.url` as const)}
                    placeholder="URL"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCustomLink(i)}
                    className="min-h-[44px] min-w-[44px]"
                    aria-label={`Remove custom link ${i + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addCustomLink} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add custom link
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className={showPreview ? "block" : "hidden lg:block"}>
          <div className="sticky top-4">
            <p className="text-xs text-muted-foreground mb-2">Live Preview — updates as you type</p>
            <Card>
              <CardContent className="pt-6">
                <LivePreview data={watchedData as Partial<HeroFormData>} />
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">Actual appearance may vary slightly</p>
          </div>
        </div>
      </div>
    </div>
  );
}