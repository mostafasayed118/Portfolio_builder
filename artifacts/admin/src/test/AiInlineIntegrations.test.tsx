import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders,
  smartConfirmDialogMock,
  smartEmptyStateMock,
  stubUseToast,
} from "./helpers";
import { ProjectEditor } from "@/features/projects/components/ProjectEditor";
import { SkillsManager } from "@/features/skills";

const { mockAiGenerate, mockAiImprove, mockSuggestTags, mockSkillsList, mockSkillsCreate, mockToast } =
  vi.hoisted(() => ({
    mockAiGenerate: vi.fn(),
    mockAiImprove: vi.fn(),
    mockSuggestTags: vi.fn(),
    mockSkillsList: vi.fn(),
    mockSkillsCreate: vi.fn(),
    mockToast: vi.fn(),
  }));

vi.mock("@/lib/api-client", () => ({
  api: {
    ai: { generate: mockAiGenerate, improve: mockAiImprove, suggestTags: mockSuggestTags },
    skills: { list: mockSkillsList, create: mockSkillsCreate, update: vi.fn(), delete: vi.fn() },
    images: { delete: vi.fn(), reorder: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));

vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn(() => ({})), isSupabaseConfigured: true }));

vi.mock("@workspace/db/images", () => ({ listEntityImages: vi.fn(async () => []) }));

vi.mock("@workspace/ui", (importOriginal) => stubUseToast(importOriginal, mockToast));

vi.mock("@/components/SmartConfirmDialog", () => smartConfirmDialogMock());

vi.mock("@/components/SmartEmptyState", () => smartEmptyStateMock("No skills added", "Add Skill"));

describe("Inline AI integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ProjectEditor · ✨ AI text button", () => {
    const editing = {
      id: "p1",
      title: "Data Pipeline",
      description: "",
      tech_stack: ["Python", "SQL"],
      category: "data",
      sort_order: 1,
      github_url: "",
      live_url: "",
      metrics: [],
      featured: false,
      is_published: true,
      slug: "data-pipeline",
    };

    it("generates a description using the tech stack as context", async () => {
      mockAiGenerate.mockResolvedValue({
        success: true,
        data: { text: "An ETL pipeline built with Python and SQL." },
      });
      const onEdit = vi.fn();

      renderWithProviders(
        <ProjectEditor editing={editing} isNew={false} saving={false} onEdit={onEdit} onSaved={vi.fn()} />,
      );

      await userEvent.click(screen.getByRole("button", { name: "✨ Improve" }));

      await waitFor(() => {
        expect(mockAiGenerate).toHaveBeenCalledWith(
          expect.objectContaining({
            contentType: "project",
            context: expect.stringContaining("Python, SQL"),
          }),
        );
      });
      await waitFor(() => {
        expect(onEdit).toHaveBeenCalled();
      });
      const setter = onEdit.mock.calls[0][0] as (prev: typeof editing) => typeof editing;
      expect(setter(editing).description).toBe("An ETL pipeline built with Python and SQL.");
    });

    it("improves an existing description instead of generating from scratch", async () => {
      mockAiImprove.mockResolvedValue({
        success: true,
        data: { text: "A polished description." },
      });
      const onEdit = vi.fn();

      renderWithProviders(
        <ProjectEditor
          editing={{ ...editing, description: "rough draft" }}
          isNew={false}
          saving={false}
          onEdit={onEdit}
          onSaved={vi.fn()}
        />,
      );

      await userEvent.click(screen.getByRole("button", { name: "✨ Improve" }));

      await waitFor(() => {
        expect(mockAiImprove).toHaveBeenCalledWith(
          expect.objectContaining({ contentType: "project", text: "rough draft" }),
        );
      });
    });
  });

  describe("ProjectEditor · Suggest tags", () => {
    const editing = {
      id: "p2",
      title: "ETL Pipeline",
      description: "",
      tech_stack: ["Python", "SQL"],
      category: "data",
      sort_order: 1,
      github_url: "",
      live_url: "",
      metrics: [],
      tags: [],
      featured: false,
      is_published: true,
      slug: "etl-pipeline",
    };

    it("suggests tags from the tech stack + category and applies a clicked chip", async () => {
      mockSuggestTags.mockResolvedValue({
        success: true,
        data: { tags: ["etl", "pipeline", "python"] },
      });
      const onEdit = vi.fn();

      renderWithProviders(
        <ProjectEditor editing={editing} isNew={false} saving={false} onEdit={onEdit} onSaved={vi.fn()} />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Suggest tags" }));

      const chips = await screen.findByTestId("tag-suggestions");
      expect(mockSuggestTags).toHaveBeenCalledWith(["Python", "SQL"], "data");
      expect(within(chips).getByText("etl")).toBeInTheDocument();

      await userEvent.click(within(chips).getByText("etl"));
      await waitFor(() => {
        expect(onEdit).toHaveBeenCalled();
      });
      const setter = onEdit.mock.calls.at(-1)[0] as (prev: typeof editing) => typeof editing;
      expect(setter(editing).tags).toEqual(["etl"]);
    });

    it("adds a tag manually through the tags field and dedupes suggestions", async () => {
      const onEdit = vi.fn();
      renderWithProviders(
        <ProjectEditor editing={editing} isNew={false} saving={false} onEdit={onEdit} onSaved={vi.fn()} />,
      );

      await userEvent.type(screen.getByPlaceholderText("Add tag…"), "etl");
      await userEvent.click(screen.getByRole("button", { name: "Add tag" }));

      const setter = onEdit.mock.calls.at(-1)[0] as (prev: typeof editing) => typeof editing;
      expect(setter(editing).tags).toEqual(["etl"]);

      // A suggested chip matching an existing tag must not duplicate it.
      mockSuggestTags.mockResolvedValue({ success: true, data: { tags: ["etl"] } });
      await userEvent.click(screen.getByRole("button", { name: "Suggest tags" }));
      const chips = await screen.findByTestId("tag-suggestions");
      await userEvent.click(within(chips).getByText("etl"));

      const lastSetter = onEdit.mock.calls.at(-1)[0] as (prev: typeof editing) => typeof editing;
      expect(lastSetter({ ...editing, tags: ["etl"] }).tags).toEqual(["etl"]);
    });
  });

  describe("SkillsManager · ✨ Generate category", () => {
    it("generates a category for the skill and writes it into the form", async () => {
      mockSkillsList.mockResolvedValue({ success: true, data: [] });
      mockAiGenerate.mockResolvedValue({
        success: true,
        data: { text: "Frontend" },
      });

      renderWithProviders(<SkillsManager />);

      // With an empty list, both the header action and the empty state render
      // an "Add Skill" button — click the first one.
      const addButtons = await screen.findAllByRole("button", { name: /add skill/i });
      await userEvent.click(addButtons[0]);
      await screen.findByRole("dialog");

      const nameInput = screen.getAllByRole("textbox")[0];
      await userEvent.type(nameInput, "React Native");
      await userEvent.click(screen.getByRole("button", { name: "✨ Generate category" }));

      await waitFor(() => {
        expect(mockAiGenerate).toHaveBeenCalledWith(
          expect.objectContaining({ contentType: "skill" }),
        );
      });
      await waitFor(() => {
        expect(screen.getAllByRole("textbox")[1]).toHaveValue("Frontend");
      });

      await userEvent.click(screen.getByText("Save"));
      await waitFor(() => {
        expect(mockSkillsCreate).toHaveBeenCalledWith(
          expect.objectContaining({ name: "React Native", category: "Frontend" }),
        );
      });
    });
  });
});
