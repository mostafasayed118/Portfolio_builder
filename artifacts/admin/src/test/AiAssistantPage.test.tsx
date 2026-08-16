import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./helpers";
import { AiAssistantPage } from "@/features/ai";

const { mockGenerateDescription, mockSuggestCategories, mockSuggestTags, mockAnalyzeContent } = vi.hoisted(() => ({
  mockGenerateDescription: vi.fn(),
  mockSuggestCategories: vi.fn(),
  mockSuggestTags: vi.fn(),
  mockAnalyzeContent: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    ai: {
      generateDescription: mockGenerateDescription,
      suggestCategories: mockSuggestCategories,
      suggestTags: mockSuggestTags,
      analyzeContent: mockAnalyzeContent,
    },
  },
}));

vi.mock("@/lib/logger", () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));

describe("AiAssistantPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four AI tools", () => {
    renderWithProviders(<AiAssistantPage />);
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(screen.getByText("Project Description")).toBeInTheDocument();
    expect(screen.getByText("Suggest Tags")).toBeInTheDocument();
    expect(screen.getByText("Suggest Categories")).toBeInTheDocument();
    expect(screen.getByText("Content Analysis")).toBeInTheDocument();
  });

  it("generates a project description from title + tech stack", async () => {
    mockGenerateDescription.mockResolvedValue({
      success: true,
      data: { description: "A full-stack dashboard built with React and Node." },
    });

    renderWithProviders(<AiAssistantPage />);
    const tool = screen.getByTestId("tool-description");

    await userEvent.type(within(tool).getByPlaceholderText("e.g. Data Pipeline Dashboard"), "My App");
    await userEvent.type(within(tool).getByLabelText("Add tech… (e.g. React, Node, PostgreSQL)"), "React");
    await userEvent.click(within(tool).getByRole("button", { name: "Add technology" }));
    await userEvent.click(within(tool).getByRole("button", { name: "Generate description" }));

    await within(tool).findByLabelText("Generated description");
    expect(mockGenerateDescription).toHaveBeenCalledWith(["React"], "My App");
    expect(within(tool).getByLabelText("Generated description")).toHaveValue(
      "A full-stack dashboard built with React and Node.",
    );
  });

  it("surfaces Gemini errors on generate-description", async () => {
    mockGenerateDescription.mockRejectedValue(new Error("Gemini API 503"));

    renderWithProviders(<AiAssistantPage />);
    const tool = screen.getByTestId("tool-description");

    await userEvent.type(within(tool).getByLabelText("Add tech… (e.g. React, Node, PostgreSQL)"), "React");
    await userEvent.click(within(tool).getByRole("button", { name: "Add technology" }));
    await userEvent.click(within(tool).getByRole("button", { name: "Generate description" }));

    expect(await within(tool).findByRole("alert")).toHaveTextContent("Gemini API 503");
  });

  it("suggests categories for a skill name", async () => {
    mockSuggestCategories.mockResolvedValue({
      success: true,
      data: { categories: ["Frontend", "Mobile"] },
    });

    renderWithProviders(<AiAssistantPage />);
    const tool = screen.getByTestId("tool-categories");

    await userEvent.type(within(tool).getByPlaceholderText("e.g. React Native"), "React Native");
    await userEvent.click(within(tool).getByRole("button", { name: "Suggest categories" }));

    const results = await within(tool).findByTestId("category-results");
    expect(mockSuggestCategories).toHaveBeenCalledWith("React Native");
    expect(within(results).getByText("Frontend")).toBeInTheDocument();
    expect(within(results).getByText("Mobile")).toBeInTheDocument();
  });

  it("suggests tags from a tech stack with an optional category", async () => {
    mockSuggestTags.mockResolvedValue({
      success: true,
      data: { tags: ["next.js", "supabase", "full-stack"] },
    });

    renderWithProviders(<AiAssistantPage />);
    const tool = screen.getByTestId("tool-tags");

    await userEvent.type(within(tool).getByLabelText("Add tech… (e.g. Next.js, Supabase)"), "Next.js");
    await userEvent.click(within(tool).getByRole("button", { name: "Add technology" }));
    await userEvent.type(within(tool).getByPlaceholderText("e.g. Full-Stack"), "Full-Stack");
    await userEvent.click(within(tool).getByRole("button", { name: "Suggest tags" }));

    const results = await within(tool).findByTestId("tag-results");
    expect(mockSuggestTags).toHaveBeenCalledWith(["Next.js"], "Full-Stack");
    expect(within(results).getByText("next.js")).toBeInTheDocument();
    expect(within(results).getByText("full-stack")).toBeInTheDocument();
  });

  it("analyzes content and renders score, strengths, and suggestions", async () => {
    mockAnalyzeContent.mockResolvedValue({
      success: true,
      data: { score: 85, suggestions: ["Add more detail"], strengths: ["Good length"] },
    });

    renderWithProviders(<AiAssistantPage />);
    const tool = screen.getByTestId("tool-analysis");

    await userEvent.type(
      within(tool).getByPlaceholderText("Paste the section text to analyze…"),
      "I build scalable web applications.",
    );
    await userEvent.click(within(tool).getByRole("button", { name: "Analyze content" }));

    const results = await within(tool).findByTestId("analysis-results");
    expect(mockAnalyzeContent).toHaveBeenCalledWith("I build scalable web applications.", "hero");
    expect(within(results).getByText("85")).toBeInTheDocument();
    expect(within(results).getByText("Good length")).toBeInTheDocument();
    expect(within(results).getByText("Add more detail")).toBeInTheDocument();
  });

  it("switches the analyzed section type via the select", async () => {
    mockAnalyzeContent.mockResolvedValue({ success: true, data: { score: 60, suggestions: [], strengths: [] } });

    renderWithProviders(<AiAssistantPage />);
    const tool = screen.getByTestId("tool-analysis");

    await userEvent.click(within(tool).getByRole("combobox"));
    await userEvent.click(await screen.findByRole("option", { name: "About" }));
    await userEvent.type(
      within(tool).getByPlaceholderText("Paste the section text to analyze…"),
      "A short bio.",
    );
    await userEvent.click(within(tool).getByRole("button", { name: "Analyze content" }));

    await within(tool).findByTestId("analysis-results");
    expect(mockAnalyzeContent).toHaveBeenCalledWith("A short bio.", "about");
  });

  it("scrolls to the tool referenced by the URL hash (command-palette deep link)", async () => {
    const scrollSpy = vi.fn();
    Element.prototype.scrollIntoView = scrollSpy;
    window.location.hash = "#suggest-tags";

    renderWithProviders(<AiAssistantPage />);

    expect(scrollSpy).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    window.location.hash = "";
  });
});
