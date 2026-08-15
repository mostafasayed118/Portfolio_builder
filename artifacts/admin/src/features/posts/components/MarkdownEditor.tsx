import { useRef, useState } from "react";
import { Bold, Code2, Eye, Heading2, Italic, Link2, List } from "lucide-react";
import ReactMarkdown from "react-markdown";
import RemarkGfm from "remark-gfm";
import { Button, Textarea } from "@workspace/ui";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

type ToolbarAction = {
  label: string;
  icon: typeof Bold;
  prefix: string;
  suffix?: string;
};

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "Heading", icon: Heading2, prefix: "## " },
  { label: "Bold", icon: Bold, prefix: "**", suffix: "**" },
  { label: "Italic", icon: Italic, prefix: "_", suffix: "_" },
  { label: "Bulleted list", icon: List, prefix: "- " },
  { label: "Code", icon: Code2, prefix: "`", suffix: "`" },
  { label: "Link", icon: Link2, prefix: "[", suffix: "](https://)" },
];

export default function MarkdownEditor({ value, onChange, maxLength = 200_000 }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  const insertMarkdown = (action: ToolbarAction) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || "text";
    const nextValue = `${value.slice(0, start)}${action.prefix}${selected}${action.suffix ?? ""}${value.slice(end)}`;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.focus();
      const selectionStart = start + action.prefix.length;
      textarea.setSelectionRange(selectionStart, selectionStart + selected.length);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1" aria-label="Markdown formatting tools">
          {TOOLBAR_ACTIONS.map(({ label, icon: Icon, ...action }) => (
            <Button
              key={label}
              type="button"
              size="sm"
              variant="outline"
              className="h-8 min-w-8 px-2"
              onClick={() => insertMarkdown({ label, icon: Icon, ...action })}
              aria-label={label}
              title={label}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="sr-only">{label}</span>
            </Button>
          ))}
        </div>
        <Button
          type="button"
          size="sm"
          variant={preview ? "secondary" : "outline"}
          onClick={() => setPreview((current) => !current)}
          aria-pressed={preview}
        >
          <Eye className="h-3.5 w-3.5" />
          {preview ? "Write" : "Preview"}
        </Button>
      </div>

      {preview ? (
        <div
          className="min-h-64 rounded-md border border-input bg-background px-4 py-3 prose prose-sm max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground"
          data-testid="markdown-preview"
        >
          {value.trim() ? (
            <ReactMarkdown remarkPlugins={[RemarkGfm]}>{value}</ReactMarkdown>
          ) : (
            <p className="text-muted-foreground italic">Your preview will appear here.</p>
          )}
        </div>
      ) : (
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={14}
          maxLength={maxLength}
          placeholder={"## Heading\n\nWrite your article in Markdown…"}
          className="font-mono text-sm"
          data-testid="markdown-input"
        />
      )}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Markdown and GitHub-flavored tables are supported.</span>
        <span>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</span>
      </div>
    </div>
  );
}
