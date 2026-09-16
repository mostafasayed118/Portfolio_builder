import type { RefObject } from "react";
import { BookmarkPlus, Download, Palette, Upload } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from "@workspace/ui";
import { MAX_CUSTOM_TEMPLATES, PresetPicker, type ThemePreset } from "./ThemePresets";

interface ThemeTemplatesCardProps {
  customPresets: ThemePreset[];
  activePreset: ThemePreset | null;
  importing: boolean;
  onExport: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onImportFile: (file: File | undefined) => void;
  newTemplateName: string;
  onTemplateNameChange: (value: string) => void;
  onSaveAsTemplate: () => void;
  onSaveAsPreset: () => void;
  onApply: (preset: ThemePreset) => void;
  onDeleteCustom: (id: string) => void;
}

/**
 * The "Templates" card of the Theme Manager: JSON export/import, the named
 * and one-click save rows, and the preset grid.
 */
export function ThemeTemplatesCard({
  customPresets,
  activePreset,
  importing,
  onExport,
  fileInputRef,
  onImportFile,
  newTemplateName,
  onTemplateNameChange,
  onSaveAsTemplate,
  onSaveAsPreset,
  onApply,
  onDeleteCustom,
}: ThemeTemplatesCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Templates</CardTitle>
        <p className="text-xs text-muted-foreground">
          Pick a modern template to pre-fill the palette, then fine-tune any color below.
          Currently using <span className="font-medium text-foreground">{activePreset ? activePreset.name : "custom colors"}</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExport} disabled={customPresets.length === 0 || importing} className="min-h-[44px]">
              <Download size={14} className="mr-1.5" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} className="min-h-[44px]">
              <Upload size={14} className="mr-1.5" /> Import
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              aria-label="Import templates from a JSON file"
              data-testid="import-templates-input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                void onImportFile(file);
              }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {customPresets.length}/{MAX_CUSTOM_TEMPLATES} saved
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onSaveAsPreset} className="min-h-[44px]" title="Save the current palette as Preset N — no naming needed">
            <Palette size={14} className="mr-1.5" /> Save as preset
          </Button>
          <Input
            value={newTemplateName}
            onChange={(e) => onTemplateNameChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSaveAsTemplate()}
            placeholder="Name this palette…"
            aria-label="Name for the new template"
            className="h-9 flex-1"
          />
          <Button size="sm" onClick={onSaveAsTemplate} disabled={!newTemplateName.trim()} className="min-h-[44px]">
            <BookmarkPlus size={14} className="mr-1.5" /> Save as template
          </Button>
        </div>
        <PresetPicker
          activePresetId={activePreset?.id ?? null}
          onApply={onApply}
          customPresets={customPresets}
          onDeleteCustom={onDeleteCustom}
        />
      </CardContent>
    </Card>
  );
}
