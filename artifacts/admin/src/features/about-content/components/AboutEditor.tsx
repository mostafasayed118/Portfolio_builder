import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { Plus, X } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast } from "@workspace/ui";
import { Button, Input, Slider, Textarea } from "@workspace/ui";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useBeforeUnload } from "@/hooks/use-before-unload";
import { AboutLivePreview } from "@/features/about-content/components/AboutLivePreview";
import { InterestsEditor } from "@/features/about-content/components/InterestsEditor";
import { EditorErrorState, EditorLoadingState } from "@/components/EditorStates";
import { EditorHeader, EditorLayout } from "@/components/EditorScaffold";
import { EditorCard, EditorField } from "@/components/EditorForm";
import AiTextButton from "@/features/ai/components/AiTextButton";

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

function getLanguageLabel(level: number): string {
  if (level <= 25) return "Beginner";
  if (level <= 50) return "Intermediate";
  if (level <= 75) return "Advanced";
  if (level <= 90) return "Professional";
  return "Native";
}

export default function AboutEditor() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: aboutData, isLoading, error, refetch } = useQuery({
    queryKey: ["about"],
    queryFn: async () => {
      const res = await api.about.get();
      if (!res.success) throw new Error(res.message);
      return res.data ?? null;
    },
  });

  const { register, control, handleSubmit, reset, setValue, formState: { isDirty } } = useForm<AboutFormData>({
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
  const [showPreview, setShowPreview] = useState(false);

  useKeyboardShortcuts([
    { key: "s", ctrl: true, handler: () => { if (isDirty) handleSubmit(onSubmit)(); }, description: "Save changes" },
  ]);
  useBeforeUnload(isDirty, "You have unsaved changes. Leave anyway?");

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
      const res = await api.about.update({
        bio: data.bio,
        education: data.education,
        languages: data.languages,
        interests: data.interests,
      });
      if (!res.success) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about"] });
      toast({ title: "About section updated successfully" });
    },
    onError: (err) => {
      toast({ title: `Save failed: ${err.message}`, variant: "destructive" });
    },
  });

  const onSubmit = (data: AboutFormData) => {
    const hasIncompleteEducation = data.education.some(
      (e) => !e.degree?.trim() || !e.institution?.trim(),
    );
    const hasIncompleteLanguage = data.languages.some((l) => !l.name?.trim());
    if (hasIncompleteEducation || hasIncompleteLanguage) {
      toast({
        title: "Required fields missing",
        description: "Each education entry needs a degree and institution, and each language needs a name.",
        variant: "destructive",
      });
      return;
    }
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <EditorLoadingState title="About Editor" />
    );
  }

  if (error) {
    return (
      <EditorErrorState
        message="Failed to load about content"
        onRetry={() => refetch()}
      />
    );
  }

  return (
    <div className="space-y-4">
      <EditorHeader
        title="About Editor"
        description="Edit your about section content"
        actions={(
          <Button onClick={handleSubmit(onSubmit)} disabled={!isDirty || saveMutation.isPending} data-save-button>
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        )}
      />

      <EditorLayout
        showPreview={showPreview}
        onTogglePreview={() => setShowPreview((value) => !value)}
        preview={<AboutLivePreview data={watchedData} />}
      >
          <EditorCard title="Bio">
            <Textarea {...register("bio")} placeholder="Tell your story..." rows={6} className="resize-none" />
            <div className="mt-2">
              <AiTextButton
                contentType="about"
                text={watchedData.bio ?? ""}
                onResult={(t) => setValue("bio", t, { shouldDirty: true })}
              />
            </div>
          </EditorCard>

          <EditorCard
            title="Education"
            headerActions={(
              <Button type="button" variant="outline" size="sm" onClick={() => appendEducation({ degree: "", institution: "", year: "" })} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add Education
              </Button>
            )}
            contentClassName="space-y-4"
          >
              {educationFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No education entries yet.</p>
              ) : (
                educationFields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-muted-foreground">Entry {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEducation(index)} className="min-h-[44px] min-w-[44px]" aria-label={`Remove education entry ${index + 1}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <EditorField label="Degree" required className="" labelClassName="text-xs text-muted-foreground">
                        <Input {...register(`education.${index}.degree` as const)} placeholder="BSc Computer Science" />
                      </EditorField>
                      <EditorField label="Institution" required className="" labelClassName="text-xs text-muted-foreground">
                        <Input {...register(`education.${index}.institution` as const)} placeholder="University Name" />
                      </EditorField>
                    </div>
                    <EditorField label="Year" className="" labelClassName="text-xs text-muted-foreground">
                      <Input {...register(`education.${index}.year` as const)} placeholder="2020 – 2024" />
                    </EditorField>
                    <EditorField label="Description" className="" labelClassName="text-xs text-muted-foreground">
                      <Textarea {...register(`education.${index}.description` as const)} placeholder="Optional description..." rows={2} />
                    </EditorField>
                  </div>
                ))
              )}
          </EditorCard>

          <EditorCard
            title="Languages"
            headerActions={(
              <Button type="button" variant="outline" size="sm" onClick={() => appendLanguage({ name: "", level: 50 })} className="min-h-[44px]">
                <Plus className="h-4 w-4 mr-2" /> Add Language
              </Button>
            )}
            contentClassName="space-y-4"
          >
              {languageFields.length === 0 ? (
                <p className="text-sm text-muted-foreground">No language entries yet.</p>
              ) : (
                languageFields.map((field, index) => (
                  <div key={field.id} className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-medium text-muted-foreground">Language {index + 1}</span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeLanguage(index)} className="min-h-[44px] min-w-[44px]" aria-label={`Remove language ${index + 1}`}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex gap-3 items-end">
                      <EditorField label="Language" required className="flex-1" labelClassName="text-xs text-muted-foreground">
                        <Input {...register(`languages.${index}.name` as const)} placeholder="English" />
                      </EditorField>
                      <EditorField
                        label={`Level: ${getLanguageLabel(watchedData.languages?.[index]?.level || 50)}`}
                        className="flex-1"
                        labelClassName="text-xs text-muted-foreground"
                      >
                        <Slider
                          value={[watchedData.languages?.[index]?.level || 50]}
                          min={0}
                          max={100}
                          step={1}
                          onValueChange={([v]) => {
                            setValue(`languages.${index}.level`, v, { shouldDirty: true });
                          }}
                        />
                      </EditorField>
                    </div>
                  </div>
                ))
              )}
          </EditorCard>

          <InterestsEditor
            interests={watchedData.interests ?? []}
            onChange={(interests) => setValue("interests", interests, { shouldDirty: true })}
          />
      </EditorLayout>
    </div>
  );
}
