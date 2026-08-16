import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge, Button, Input } from "@workspace/ui";

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  addLabel?: string;
}

/**
 * Chip-style tag input (Enter or the + button adds a tag; X removes one).
 * Used by the AI tools for tech stacks and other list inputs.
 */
export function TagInput({ value, onChange, placeholder, addLabel = "Add" }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v || value.some(t => t.toLowerCase() === v.toLowerCase())) {
      setDraft("");
      return;
    }
    onChange([...value, v]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {value.map(tag => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => onChange(value.filter(t => t !== tag))}
              className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-['']"
              aria-label={`Remove ${tag}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="h-8 text-sm"
          aria-label={placeholder ?? "Add tag"}
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="min-h-[44px]" aria-label={addLabel}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
