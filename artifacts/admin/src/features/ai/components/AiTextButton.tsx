import { useState } from "react";
import { Sparkles } from "lucide-react";
import { api } from "@/lib/api-client";
import { useToast, Button } from "@workspace/ui";

type ContentType = "hero" | "about" | "project" | "skill" | "experience" | "general";

interface AiTextButtonProps {
  contentType: ContentType;
  /** Current text; empty string triggers /generate instead of /improve. */
  text: string;
  onResult: (text: string) => void;
  instructions?: string;
  context?: string;
  label?: string;
}

export default function AiTextButton({
  contentType,
  text,
  onResult,
  instructions,
  context,
  label = "✨ Improve",
}: AiTextButtonProps) {
  const { toast } = useToast();
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      const res = text.trim()
        ? await api.ai.improve({ contentType, text, ...(instructions ? { instructions } : {}) })
        : await api.ai.generate({
            contentType,
            ...(instructions ? { instructions } : {}),
            ...(context ? { context } : {}),
          });
      if (!res.success) {
        toast({ title: `AI failed: ${res.message}`, variant: "destructive" });
        return;
      }
      const result = res.data?.text;
      if (!result) {
        toast({ title: "AI returned no text", variant: "destructive" });
        return;
      }
      onResult(result);
    } catch (err) {
      toast({ title: `AI failed: ${err instanceof Error ? err.message : "unknown error"}`, variant: "destructive" });
    } finally {
      setPending(false);
    }
  };

  return (
    <Button type="button" variant="outline" size="sm" onClick={run} disabled={pending} className="min-h-[44px]">
      <Sparkles className="h-4 w-4 mr-2" />
      {pending ? "Working…" : label}
    </Button>
  );
}
