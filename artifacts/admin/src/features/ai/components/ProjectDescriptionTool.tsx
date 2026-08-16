import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Textarea } from "@workspace/ui";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { TagInput } from "./TagInput";

export function ProjectDescriptionTool() {
  const [title, setTitle] = useState("");
  const [techStack, setTechStack] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    if (techStack.length === 0) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await api.ai.generateDescription(techStack, title.trim() || undefined);
      if (!res.success) throw new Error(res.message);
      setResult(res.data?.description ?? "");
    } catch (err) {
      logError("AI description generation failed", err, "ProjectDescriptionTool");
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const copy = async () => {
    if (!result || !navigator.clipboard) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card data-testid="tool-description">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Project Description</CardTitle>
        <CardDescription>
          Turn a title and tech stack into a ready-to-publish project description.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Title (optional)</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Data Pipeline Dashboard" className="h-9" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Tech stack</Label>
          <TagInput
            value={techStack}
            onChange={setTechStack}
            placeholder="Add tech… (e.g. React, Node, PostgreSQL)"
            addLabel="Add technology"
          />
        </div>
        <Button onClick={generate} disabled={techStack.length === 0 || generating} className="min-h-[44px]" data-testid="generate-description">
          {generating ? "Generating…" : "Generate description"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="rounded-lg border p-3 space-y-2">
            <Textarea readOnly value={result} rows={4} aria-label="Generated description" />
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={copy} className="min-h-[44px]">
                {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
        )}
        {!result && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
            Tip: also available inside <Badge variant="outline">Projects → Edit → Generate with AI</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
