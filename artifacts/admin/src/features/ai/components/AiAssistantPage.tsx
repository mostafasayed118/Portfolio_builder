import { useEffect } from "react";
import { PageHeader } from "@/components/PageHeader";
import { ProjectDescriptionTool } from "./ProjectDescriptionTool";
import { CategoriesTool } from "./CategoriesTool";
import { TagsTool } from "./TagsTool";
import { ContentAnalysisTool } from "./ContentAnalysisTool";

/**
 * AI Assistant — Gemini-powered writing helpers for portfolio content.
 * Every tool calls the live /api/v1/admin/ai-assistant endpoints through
 * `api.ai.*`; responses come straight from Gemini (no client-side logic).
 *
 * Deep links (#generate-description, #suggest-categories, #suggest-tags,
 * #analyze-content — used by the command palette quick actions) scroll the
 * matching tool card into view.
 */
export function AiAssistantPage() {
  useEffect(() => {
    const scrollToTool = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      document.getElementById(`ai-${hash}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    scrollToTool();
    window.addEventListener("hashchange", scrollToTool);
    return () => window.removeEventListener("hashchange", scrollToTool);
  }, []);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <PageHeader
        title="AI Assistant"
        description="Generate project descriptions, categories, tags, and content analysis with Gemini."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectDescriptionTool />
        <TagsTool />
        <CategoriesTool />
        <ContentAnalysisTool />
      </div>
    </div>
  );
}
