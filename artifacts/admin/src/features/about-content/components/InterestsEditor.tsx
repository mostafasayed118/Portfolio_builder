import { useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@workspace/ui";

interface InterestsEditorProps {
  interests: string[];
  onChange: (interests: string[]) => void;
}

export function InterestsEditor({ interests, onChange }: InterestsEditorProps) {
  const [input, setInput] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const value = input.trim();
      if (value && !interests.includes(value)) {
        onChange([...interests, value]);
      }
      setInput("");
    }
  };

  const remove = (index: number) => {
    const copy = [...interests];
    copy.splice(index, 1);
    onChange(copy);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interests</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          placeholder="Type interest and press Enter..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="flex flex-wrap gap-2">
          {interests.map((interest, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-muted rounded-full"
            >
              {interest}
              <button
                type="button"
                onClick={() => remove(index)}
                className="relative flex items-center justify-center h-5 w-5 after:absolute after:inset-[-8px] after:content-[''] hover:text-destructive"
                aria-label={`Remove interest: ${interest}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
