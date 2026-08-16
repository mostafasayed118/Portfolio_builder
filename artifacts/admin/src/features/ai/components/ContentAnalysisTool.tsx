import { useState } from "react";
import { Sparkles, CircleCheck, TriangleAlert, Loader2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@workspace/ui";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";

const CONTENT_TYPES = [
  { value: "hero", label: "Hero" },
  { value: "about", label: "About" },
  { value: "project", label: "Project" },
] as const;

type ContentType = (typeof CONTENT_TYPES)[number]["value"];

interface AnalysisResult {
  score: number;
  suggestions: string[];
  strengths: string[];
}

export function ContentAnalysisTool() {
  const [content, setContent] = useState("");
  const [contentType, setContentType] = useState<ContentType>("hero");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = async () => {
    if (!content.trim()) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await api.ai.analyzeContent(content, contentType);
      if (!res.success) throw new Error(res.message);
      const data = res.data;
      setResult({
        score: data?.score ?? 0,
        suggestions: data?.suggestions ?? [],
        strengths: data?.strengths ?? [],
      });
    } catch (err) {
      logError("AI content analysis failed", err, "ContentAnalysisTool");
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card data-testid="tool-analysis">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-4 w-4" /> Content Analysis</CardTitle>
        <CardDescription>
          Score a hero, about, or project section and get concrete improvements.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Section type</Label>
          <Select value={contentType} onValueChange={(v: ContentType) => setContentType(v)}>
            <SelectTrigger aria-label="Section type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CONTENT_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Content</Label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={5}
            placeholder="Paste the section text to analyze…"
          />
        </div>
        <Button onClick={analyze} disabled={!content.trim() || analyzing} className="min-h-[44px]" data-testid="analyze-content">
          {analyzing ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Analyzing…</> : "Analyze content"}
        </Button>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="space-y-3" data-testid="analysis-results">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono">{result.score}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${result.score >= 70 ? "bg-success" : result.score >= 40 ? "bg-warning" : "bg-destructive"}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <Badge variant="outline">score / 100</Badge>
            </div>
            {result.strengths.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Strengths</p>
                {result.strengths.map(s => (
                  <p key={s} className="text-sm flex items-start gap-1.5"><CircleCheck className="h-4 w-4 mt-0.5 text-success shrink-0" />{s}</p>
                ))}
              </div>
            )}
            {result.suggestions.length > 0 && (
              <Alert variant={result.score >= 70 ? "default" : "destructive"}>
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Suggestions</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 space-y-1 mt-1">
                    {result.suggestions.map(s => <li key={s}>{s}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
