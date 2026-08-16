import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label } from "@workspace/ui";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";

export function CategoriesTool() {
  const [skillName, setSkillName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);

  const suggest = async () => {
    const name = skillName.trim();
    if (!name) return;
    setSuggesting(true);
    setError(null);
    try {
      const res = await api.ai.suggestCategories(name);
      if (!res.success) throw new Error(res.message);
      setCategories(res.data?.categories ?? []);
    } catch (err) {
      logError("AI category suggestion failed", err, "CategoriesTool");
      setError(err instanceof Error ? err.message : "Suggestion failed");
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <Card id="ai-suggest-categories" data-testid="tool-categories">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Suggest Categories</CardTitle>
        <CardDescription>
          Get 1–3 portfolio categories that fit a skill name.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Skill name</Label>
          <Input value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="e.g. React Native" className="h-9" />
        </div>
        <Button onClick={suggest} disabled={!skillName.trim() || suggesting} className="min-h-[44px]" data-testid="suggest-categories">
          {suggesting ? "Suggesting…" : "Suggest categories"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5" data-testid="category-results">
            {categories.map(cat => <Badge key={cat} variant="secondary">{cat}</Badge>)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
