import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Plus, X, GraduationCap, Globe, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import SkillMeter from "@/components/SkillMeter";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-provider";
import { fetchAboutContent, upsertAboutContent, type AboutContent } from "@workspace/db/about";
import { toast } from "sonner";

type AboutFormData = {
  bio: string;
  education: Array<{
    degree: string;
    institution: string;
    year: string;
    description?: string;
  }>;
  languages: Array<{
    name: string;
    level: number;
  }>;
  interests: string[];
};

function SkeletonForm() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-20 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function SkeletonPreview() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

function getLanguageLabel(level: number): string {
  if (level <= 25) return "Beginner";
  if (level <= 50) return "Intermediate";
  if (level <= 75) return "Advanced";
  if (level <= 90) return "Professional";
  return "Native";
}

type LivePreviewData = {
  bio?: string;
  education?: Array<{
    degree?: string;
    institution?: string;
    year?: string;
    description?: string;
  }>;
  languages?: Array<{
    name?: string;
    level?: number;
  }>;
  interests?: string[];
};

function LivePreview({ data }: { data: LivePreviewData }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">About Me</h3>
        {data.bio ? (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {data.bio}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No bio yet...</p>
        )}
      </div>

      {data.education && data.education.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <GraduationCap className="h-4 w-4" />
            Education
          </h4>
          <div className="space-y-2">
            {data.education.map((edu, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium">{edu.degree}</div>
                <div className="text-muted-foreground">
                  {edu.institution} · {edu.year}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.languages && data.languages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Globe className="h-4 w-4" />
            Languages
          </h4>
          <div className="space-y-3">
            {data.languages.map((lang, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span>{lang.name}</span>
                  <span>{getLanguageLabel(lang.level || 50)}</span>
                </div>
                <SkillMeter label={lang.name || ""} value={lang.level || 50} />
              </div>
            ))}
          </div>
        </div>
      )}

      {data.interests && data.interests.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Target className="h-4 w-4" />
            Interests
          </h4>
          <div className="flex flex-wrap gap-1">
            {data.interests.map((interest, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 bg-muted rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AboutEditor() {
  const queryClient = useQueryClient();
  const { data: aboutData, isLoading, error, refetch } = useQuery<AboutContent | null>({
    queryKey: ["about"],
    queryFn: () => fetchAboutContent(getSupabase()),
    enabled: isSupabaseConfigured,
  });

  const { register, control, handleSubmit, reset, formState: { isDirty } } = useForm<AboutFormData>({
    defaultValues: {
      bio: "",
      education: [],
      languages: [],
      interests: [],
    },
  });

  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control,
    name: "education",
  });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control,
    name: "languages",
  });

  const watchedData = useWatch({ control });
  const [interestInput, setInterestInput] = useState("");

  useEffect(() => {
    if (aboutData) {
      reset({
        bio: aboutData.bio || "",
        education: aboutData.education || [],
        languages: aboutData.languages || [],
        interests: aboutData.interests || [],
      });
    }
  }, [aboutData, reset]);

  const saveMutation = useMutation({
    mutationFn: async (data: AboutFormData) => {
      const result = await upsertAboutContent(getSupabase(), {
        bio: data.bio,
        education: data.education,
        languages: data.languages,
        interests: data.interests,
      });
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about"] });
      toast.success("About section updated successfully");
    },
    onError: (err) => {
      toast.error(`Save failed: ${err.message}`);
    },
  });

  const onSubmit = (data: AboutFormData) => {
    saveMutation.mutate(data);
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = interestInput.trim();
      if (value && !watchedData.interests?.includes(value)) {
        const currentInterests = watchedData.interests || [];
        reset({ ...watchedData, interests: [...currentInterests, value] });
      }
      setInterestInput("");
    }
  };

  const removeInterest = (index: number) => {
    const current = [...(watchedData.interests || [])];
    current.splice(index, 1);
    reset({ ...watchedData, interests: current });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">About Editor</h1>
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
          <p className="text-destructive">Failed to load about content</p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
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
          <h1 className="text-2xl font-bold">About Editor</h1>
          <p className="text-sm text-muted-foreground">Edit your about section content</p>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={!isDirty || saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Edit Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                {...register("bio")}
                placeholder="Tell your story..."
                rows={6}
                className="resize-none"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Education</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendEducation({ degree: "", institution: "", year: "" })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Education
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {educationFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education entries yet.</p>
              ) : (
                educationFields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-muted-foreground">Entry {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeEducation(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground">Degree *</label>
                        <Input {...register(`education.${index}.degree` as const)} placeholder="BSc Computer Science" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">Institution *</label>
                        <Input {...register(`education.${index}.institution` as const)} placeholder="University Name" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Year</label>
                      <Input {...register(`education.${index}.year` as const)} placeholder="2020 – 2024" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Description</label>
                      <Textarea
                        {...register(`education.${index}.description` as const)}
                        placeholder="Optional description..."
                        rows={2}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Languages</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendLanguage({ name: "", level: 50 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Language
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {languageFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No language entries yet.</p>
              ) : (
                languageFields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-muted-foreground">Language {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeLanguage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-3 items-end">
                      <div className="flex-1">
                        <label className="text-xs text-muted-foreground">Language *</label>
                        <Input {...register(`languages.${index}.name` as const)} placeholder="English" />
                      </div>
                      <div className="flex-[2]">
                        <label className="text-xs text-muted-foreground">
                          Level: {getLanguageLabel(watchedData.languages?.[index]?.level || 50)}
                        </label>
                        <Slider
                          value={[watchedData.languages?.[index]?.level || 50]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([v]) => {
                            const current = [...(watchedData.languages || [])];
                            if (current[index]) current[index].level = v;
                            reset({ ...watchedData, languages: current });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="Type interest and press Enter..."
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyDown={handleInterestKeyDown}
              />
              <div className="flex flex-wrap gap-2">
                {watchedData.interests?.map((interest, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded-full"
                  >
                    {interest}
                    <button
                      type="button"
                      onClick={() => removeInterest(index)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview - Hidden on mobile */}
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <p className="text-xs text-muted-foreground mb-2">Live Preview — updates as you type</p>
            <Card>
              <CardContent className="pt-6">
                <LivePreview data={watchedData} />
              </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground mt-2">Actual appearance may vary slightly</p>
          </div>
        </div>
      </div>
    </div>
  );
}