import { useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import { TagInput } from "./TagInput";
import { RetryNotice } from "./RetryNotice";

export function TagsTool() {
  const [techStack, setTechStack] = useState<string[]>([]);
  const [category, setCategory] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);

  const suggest = async () => {
    if (techStack.length === 0) return;
    setSuggesting(true);
    setError(null);
    try {
      const res = await api.ai.suggestTags(techStack, category.trim() || undefined);
      if (!res.success) throw new Error(res.message);
      setTags(res.data?.tags ?? []);
      setAttempts(res.data?.attempts);
    } catch (err) {
      logError("AI tag suggestion failed", err, "TagsTool");
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  };

  const copy = async () => {
    if (tags.length === 0 || !navigator.clipboard) return;
    await navigator.clipboard.writeText(tags.join(", "));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Card id="ai-suggest-tags" data-testid="tool-tags">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Suggest Tags</CardTitle>
        <CardDescription>
          Generate short, lowercase tags for a project from its tech stack.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Tech stack</Label>
          <TagInput
            value={techStack}
            onChange={setTechStack}
            placeholder="Add tech… (e.g. Next.js, Supabase)"
            addLabel="Add technology"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Category (optional)</Label>
          <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Full-Stack" className="h-9" />
        </div>
        <Button onClick={suggest} disabled={techStack.length === 0 || suggesting} className="min-h-[44px]" data-testid="suggest-tags">
          {suggesting ? "Suggesting…" : "Suggest tags"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {tags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5" data-testid="tag-results">
                {tags.map(tag => <Badge key={tag} variant="secondary">{tag}</Badge>)}
              </div>
              <RetryNotice attempts={attempts} />
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={copy} className="min-h-[44px]">
                {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Copy className="h-4 w-4 mr-1.5" />}
                {copied ? "Copied" : "Copy all"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
