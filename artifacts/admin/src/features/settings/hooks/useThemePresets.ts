import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@workspace/ui";
import { api } from "@/lib/api-client";
import { logError } from "@/lib/logger";
import type { ThemePreviewData } from "../components/ThemePreview";
import {
  loadCustomPresets,
  MAX_CUSTOM_TEMPLATES,
  parseImportedPresets,
  planImport,
  exportPresetsToFile,
  type ThemePreset,
  type ImportPlan,
} from "../components/ThemePresets";

/**
 * Custom-template CRUD for the Theme Manager: the server presets query plus
 * every write path — named saves, one-click presets, overwrite, delete, and
 * JSON export/import with its confirmation plan. Owns the pending-dialog
 * state (overwriteTarget / importPlan) and the template-name input.
 */

/** Shared "saved on <date>" stamp for template descriptions ("Sep 15, 2026"). */
function formatSavedDate(): string {
  return new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function useThemePresets(theme: ThemePreviewData) {
  const { toast } = useToast();
  const { data: customPresets = [], refetch: refetchPresets } = useQuery({
    queryKey: ["themePresets"],
    queryFn: loadCustomPresets,
  });
  const [newTemplateName, setNewTemplateName] = useState("");
  /** A template with the same name already exists; pending user overwrite choice. */
  const [overwriteTarget, setOverwriteTarget] = useState<ThemePreset | null>(null);
  /** Import plan awaiting confirmation (overwrites existing templates). */
  const [importPlan, setImportPlan] = useState<ImportPlan | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Persist the current palette as a custom template under `name` (server-side,
   * capped). Shared by the named "Save as template" flow and the one-click
   * auto-named "Save as preset" flow.
   */
  const saveNamedTemplate = async (name: string, opts: { clearInput: boolean; toastTitle: string }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const nameExists = customPresets.some((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
    // Overwriting an existing template doesn't add a row, so it's allowed
    // even when the 10-template cap is already reached.
    if (customPresets.length >= MAX_CUSTOM_TEMPLATES && !nameExists) {
      toast({ title: "Template limit reached", description: `You can save up to ${MAX_CUSTOM_TEMPLATES} custom templates. Delete one to save another.`, variant: "destructive" });
      return;
    }
    try {
      const res = await api.themePresets.create({
        name: trimmed,
        description: `Custom palette saved on ${formatSavedDate()}`,
        palette: { ...theme },
      });
      if (!res.success) {
        if (res.code === "DUPLICATE_NAME") {
          const existing = customPresets.find((p) => p.id === res.existingId)
            ?? customPresets.find((p) => p.name.trim().toLowerCase() === trimmed.toLowerCase());
          setOverwriteTarget(existing ?? { id: res.existingId ?? "", name: trimmed, description: "", theme: { ...theme } });
          return;
        }
        throw new Error(res.message);
      }
      await refetchPresets();
      if (opts.clearInput) setNewTemplateName("");
      toast({ title: opts.toastTitle, description: `"${trimmed}" is now available in the template grid.` });
    } catch (err) {
      logError("Failed to save template", err, "ThemeManager");
      toast({ title: "Save failed", description: "The template was not saved. Please try again.", variant: "destructive" });
    }
  };

  /** Save the current palette under the name typed into the field. */
  const saveCurrentAsTemplate = () => {
    void saveNamedTemplate(newTemplateName, { clearInput: true, toastTitle: "Template saved" });
  };

  /**
   * One-click save: auto-name the current palette (Preset 1, Preset 2, …) so a
   * freshly generated scheme is immediately reusable from the template grid.
   */
  const saveCurrentAsPreset = () => {
    let n = customPresets.length + 1;
    while (customPresets.some((p) => p.name.trim().toLowerCase() === `preset ${n}`)) n += 1;
    void saveNamedTemplate(`Preset ${n}`, { clearInput: false, toastTitle: "Preset saved" });
  };

  /** Download the current custom templates as a JSON file. */
  const handleExport = () => {
    if (customPresets.length === 0) return;
    exportPresetsToFile(customPresets);
    toast({
      title: "Templates exported",
      description: `${customPresets.length} template${customPresets.length === 1 ? "" : "s"} saved to a JSON file.`,
    });
  };

  /** Read an imported file, validate it, and run (or confirm) the import. */
  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    const raw = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error ?? new Error("Could not read the file"));
      reader.readAsText(file);
    });
    const presets = parseImportedPresets(raw);
    if (presets.length === 0) {
      toast({ title: "Import failed", description: "The file doesn't contain any valid templates.", variant: "destructive" });
      return;
    }
    const plan = planImport(presets, customPresets);
    if (plan.toOverwrite.length > 0) {
      setImportPlan(plan);
      return;
    }
    await runImport(plan);
  };

  /** Execute an import plan: create new templates, overwrite name collisions. */
  const runImport = async (plan: ImportPlan) => {
    setImporting(true);
    let created = 0;
    let overwritten = 0;
    let failed = 0;
    try {
      const write = (id: string | undefined, preset: ThemePreset, isNew: boolean) => {
        const payload = {
          description: preset.description,
          palette: preset.theme as Record<string, string>,
        };
        return isNew
          ? api.themePresets.create({ name: preset.name, ...payload })
          : api.themePresets.update(id as string, payload);
      };
      for (const preset of plan.toCreate) {
        const res = await write(undefined, preset, true);
        if (res.success) created += 1;
        else if (res.code === "DUPLICATE_NAME" && res.existingId) {
          // Race: another device created the same name between plan and write.
          const retry = await write(res.existingId, preset, false);
          if (retry.success) overwritten += 1; else failed += 1;
        } else failed += 1;
      }
      for (const { preset, existing } of plan.toOverwrite) {
        const res = await write(existing.id, preset, false);
        if (res.success) overwritten += 1; else failed += 1;
      }
      await refetchPresets();
    } finally {
      setImporting(false);
      setImportPlan(null);
    }
    const parts: string[] = [];
    if (created) parts.push(`${created} imported`);
    if (overwritten) parts.push(`${overwritten} overwritten`);
    if (failed) parts.push(`${failed} failed`);
    if (plan.skipped) parts.push(`${plan.skipped} skipped (10-template limit)`);
    toast({
      title: "Import complete",
      description: parts.length ? parts.join(" · ") : "Nothing changed.",
      variant: failed > 0 ? "destructive" : undefined,
    });
  };

  /** Replace an existing template's palette (name stays the same). */
  const overwritePreset = async () => {
    if (!overwriteTarget) return;
    try {
      const res = await api.themePresets.update(overwriteTarget.id, {
        description: `Custom palette saved on ${formatSavedDate()}`,
        palette: { ...theme },
      });
      if (!res.success) throw new Error(res.message);
      await refetchPresets();
      const name = overwriteTarget.name;
      setOverwriteTarget(null);
      setNewTemplateName("");
      toast({ title: "Template overwritten", description: `"${name}" now uses the current palette.` });
    } catch (err) {
      // Rethrow so the confirm dialog surfaces the failure next to its buttons.
      throw err instanceof Error ? err : new Error(String(err));
    }
  };

  /** Remove a saved custom template (server-side soft delete). */
  const deleteCustomPreset = async (id: string) => {
    const target = customPresets.find((p) => p.id === id);
    try {
      const res = await api.themePresets.delete(id);
      if (!res.success) throw new Error(res.message);
      await refetchPresets();
      toast({ title: "Template deleted", description: target ? `"${target.name}" was removed.` : undefined });
    } catch (err) {
      logError("Failed to delete template", err, "ThemeManager");
      toast({ title: "Delete failed", description: "The template was not removed. Please try again.", variant: "destructive" });
    }
  };

  return {
    customPresets,
    importing,
    newTemplateName,
    setNewTemplateName,
    fileInputRef,
    overwriteTarget,
    setOverwriteTarget,
    importPlan,
    setImportPlan,
    saveCurrentAsTemplate,
    saveCurrentAsPreset,
    handleExport,
    handleImportFile,
    runImport,
    overwritePreset,
    deleteCustomPreset,
  };
}
