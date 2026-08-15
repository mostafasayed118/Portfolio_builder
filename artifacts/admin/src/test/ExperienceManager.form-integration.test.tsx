import { vi, describe, it, expect, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  renderWithProviders,
  smartConfirmDialogMock,
  smartEmptyStateMock,
  stubUseToast,
} from "./helpers";
import { ExperienceManager } from "@/features/experience";

const { mockExperienceList, mockExperienceCreate, mockToast } = vi.hoisted(() => ({
  mockExperienceList: vi.fn(),
  mockExperienceCreate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { experience: { list: mockExperienceList, create: mockExperienceCreate, update: vi.fn(), delete: vi.fn() } },
}));

vi.mock("@workspace/ui", (importOriginal) => stubUseToast(importOriginal, mockToast));

vi.mock("@/components/SmartConfirmDialog", () => smartConfirmDialogMock());

vi.mock("@/components/SmartEmptyState", () => smartEmptyStateMock("No experience entries", "Add Entry"));

const mockExperience = [
  { id: "1", title: "Data Engineer", company: "Microsoft", location: "Cairo", period: "2024 – Present", description: ["Built pipelines"], technologies: ["Python", "SQL"], type: "internship", sort_order: 1, is_published: true },
];

describe("ExperienceManager form integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExperienceList.mockResolvedValue({ success: true, data: mockExperience });
    mockExperienceCreate.mockResolvedValue({ success: true });
  });

  it("renders experience list", async () => {
    renderWithProviders(<ExperienceManager />);

    await screen.findByText("Data Engineer");
    expect(screen.getByText("@ Microsoft")).toBeInTheDocument();
  });

  it("opens add experience dialog", async () => {
    renderWithProviders(<ExperienceManager />);
    await screen.findByText("Data Engineer");

    // Button text is "Add Entry" (not "Add experience")
    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Add Experience")).toBeInTheDocument();
  });

  it("validates required title on save", async () => {
    renderWithProviders(<ExperienceManager />);
    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));
    await screen.findByRole("dialog");

    // Click save without filling in title
    await userEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Title is required", variant: "destructive" }),
      );
    });
  });

  it("adds description lines in dialog", async () => {
    renderWithProviders(<ExperienceManager />);
    await screen.findByText("Data Engineer");

    await userEvent.click(screen.getByRole("button", { name: /add entry/i }));
    await screen.findByRole("dialog");

    // Should have 1 description line initially
    const textareas = screen.getAllByRole("textbox");
    const initialCount = textareas.length;

    // Add description line — button text is "Add" with aria-label "Add description bullet"
    await userEvent.click(screen.getByLabelText("Add description bullet"));

    await waitFor(() => {
      const textareasAfter = screen.getAllByRole("textbox");
      expect(textareasAfter.length).toBeGreaterThan(initialCount);
    });
  });
});
