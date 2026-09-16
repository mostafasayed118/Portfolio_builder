import { SmartConfirmDialog } from "@/components/SmartConfirmDialog";
import type { ImportPlan } from "./ThemePresets";
import type { ThemePreset } from "./ThemePresetData";

interface ThemePresetDialogsProps {
  /** Template pending the overwrite choice (null → dialog closed). */
  overwriteTarget: ThemePreset | null;
  onOverwriteConfirm: () => Promise<void>;
  onOverwriteCancel: () => void;
  /** Import plan awaiting confirmation (null → dialog closed). */
  importPlan: ImportPlan | null;
  onImportConfirm: () => Promise<void>;
  onImportCancel: () => void;
}

/**
 * The two confirmation dialogs of the template flows: overwriting an existing
 * template's palette, and confirming a multi-template JSON import.
 */
export function ThemePresetDialogs({
  overwriteTarget,
  onOverwriteConfirm,
  onOverwriteCancel,
  importPlan,
  onImportConfirm,
  onImportCancel,
}: ThemePresetDialogsProps) {
  return (
    <>
      <SmartConfirmDialog
        state={{
          isOpen: overwriteTarget !== null,
          title: `Overwrite "${overwriteTarget?.name ?? ""}"?`,
          message: `A template named "${overwriteTarget?.name ?? ""}" already exists. Overwriting replaces its saved palette with the current colors — this cannot be undone.`,
          confirmLabel: "Overwrite",
          cancelLabel: "Don't overwrite",
          variant: "warning",
          onConfirm: onOverwriteConfirm,
        }}
        onCancel={onOverwriteCancel}
      />
      <SmartConfirmDialog
        state={{
          isOpen: importPlan !== null,
          title: `Import ${importPlan ? importPlan.toCreate.length + importPlan.toOverwrite.length : 0} template${importPlan && importPlan.toCreate.length + importPlan.toOverwrite.length === 1 ? "" : "s"}?`,
          message: importPlan
            ? `This will add ${importPlan.toCreate.length} new template${importPlan.toCreate.length === 1 ? "" : "s"} and overwrite ${importPlan.toOverwrite.length} existing template${importPlan.toOverwrite.length === 1 ? "" : "s"} with the same name.`
            : "",
          confirmLabel: "Import",
          cancelLabel: "Cancel",
          variant: "warning",
          onConfirm: onImportConfirm,
        }}
        onCancel={onImportCancel}
      />
    </>
  );
}
