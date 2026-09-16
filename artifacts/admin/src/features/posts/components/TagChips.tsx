import { useState } from "react";

interface TagChipsProps {
  tags: string[];
  onAdd: (t: string) => void;
  onRemove: (t: string) => void;
}

export default function TagChips({ tags, onAdd, onRemove }: TagChipsProps) {
  const [value, setValue] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border/60">
            {tag}
            <button type="button" onClick={() => onRemove(tag)} className="hover:text-destructive" aria-label={`Remove ${tag}`}>×</button>
          </span>
        ))}
      </div>
      <input
        className="w-full rounded-lg px-3 py-2 text-sm bg-background border border-border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        placeholder="Add a tag and press Enter"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onAdd(value); setValue(""); }
        }}
      />
    </div>
  );
}
