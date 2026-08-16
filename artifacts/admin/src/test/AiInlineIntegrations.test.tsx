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

const { mockGenerateDescription, mockSuggestCategories, mockSuggestTags, mockSkillsList, mockSkillsCreate, mockToast } =
  vi.hoisted(() => ({
    mockGenerateDescription: vi.fn(),
    mockSuggestCategories: vi.fn(),
    mockSuggestTags: vi.fn(),
    mockSkillsList: vi.fn(),
    mockSkillsCreate: vi.fn(),
    mockToast: vi.fn(),
  }));

vi.mock("@/lib/api-client", () => ({
  api: {
    ai: { generateDescription: mockGenerateDescription, suggestCategories: mockSuggestCategories, suggestTags: mockSuggestTags },
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

  describe("ProjectEditor · Generate with AI", () => {
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

    it("calls generate-description with the project title + tech stack and applies the result", async () => {
      mockGenerateDescription.mockResolvedValue({
        success: true,
        data: { description: "An ETL pipeline built with Python and SQL." },
      });
      const onEdit = vi.fn();

      renderWithProviders(
        <ProjectEditor editing={editing} isNew={false} saving={false} onEdit={onEdit} onSaved={vi.fn()} />,
      );

      await userEvent.click(screen.getByRole("button", { name: "Generate with AI" }));

      await waitFor(() => {
        expect(mockGenerateDescription).toHaveBeenCalledWith(["Python", "SQL"], "Data Pipeline");
      });
      await waitFor(() => {
        expect(onEdit).toHaveBeenCalled();
      });
      const setter = onEdit.mock.calls[0][0] as (prev: typeof editing) => typeof editing;
      expect(setter(editing).description).toBe("An ETL pipeline built with Python and SQL.");
      expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: "Description generated" }));
    });

    it("disables the button until a tech stack is added", async () => {
      renderWithProviders(
        <ProjectEditor
          editing={{ ...editing, tech_stack: [] }}
          isNew={false}
          saving={false}
          onEdit={vi.fn()}
          onSaved={vi.fn()}
        />,
      );

      const button = screen.getByRole("button", { name: "Generate with AI" });
      expect(button).toBeDisabled();

      await userEvent.click(button);
      expect(mockGenerateDescription).not.toHaveBeenCalled();
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

  describe("SkillsManager · Suggest category", () => {
    it("suggests categories for the skill name and applies a clicked chip", async () => {
      mockSkillsList.mockResolvedValue({ success: true, data: [] });
      mockSuggestCategories.mockResolvedValue({
        success: true,
        data: { categories: ["Frontend", "Mobile"] },
      });

      renderWithProviders(<SkillsManager />);

      // With an empty list, both the header action and the empty state render
      // an "Add Skill" button — click the first one.
      const addButtons = await screen.findAllByRole("button", { name: /add skill/i });
      await userEvent.click(addButtons[0]);
      await screen.findByRole("dialog");

      const nameInput = screen.getAllByRole("textbox")[0];
      await userEvent.type(nameInput, "React Native");
      await userEvent.click(screen.getByRole("button", { name: "Suggest" }));

      const chips = await screen.findByTestId("category-suggestions");
      expect(mockSuggestCategories).toHaveBeenCalledWith("React Native");
      expect(chips).toHaveTextContent("Frontend");
      expect(chips).toHaveTextContent("Mobile");

      await userEvent.click(screen.getByText("Frontend"));
      expect(screen.getAllByRole("textbox")[1]).toHaveValue("Frontend");

      await userEvent.click(screen.getByText("Save"));
      await waitFor(() => {
        expect(mockSkillsCreate).toHaveBeenCalledWith(
          expect.objectContaining({ name: "React Native", category: "Frontend" }),
        );
      });
    });
  });
});
