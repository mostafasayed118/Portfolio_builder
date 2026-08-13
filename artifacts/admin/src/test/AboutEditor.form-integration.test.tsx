import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AboutEditor } from "@/features/about-content";

const { mockAboutGet, mockAboutUpdate, mockToast } = vi.hoisted(() => ({
  mockAboutGet: vi.fn(),
  mockAboutUpdate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { about: { get: mockAboutGet, update: mockAboutUpdate } },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return { ...actual, useToast: () => ({ toast: mockToast }) };
});

vi.mock("@/hooks/useKeyboardShortcuts", () => ({ useKeyboardShortcuts: vi.fn() }));
vi.mock("@/hooks/use-before-unload", () => ({ useBeforeUnload: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getSupabase: vi.fn(() => ({})), isSupabaseConfigured: true }));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { ...render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>) };
}

const mockAboutData = {
  bio: "My bio text",
  education: [{ degree: "BSc CS", institution: "MIT", year: "2024" }],
  languages: [{ name: "English", level: 90 }],
  interests: ["Coding", "Reading"],
};

describe("AboutEditor form integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAboutGet.mockResolvedValue({ success: true, data: mockAboutData });
    mockAboutUpdate.mockResolvedValue({ success: true });
  });

  it("adds and removes education entries", async () => {
    renderWithProviders(<AboutEditor />);
    await screen.findByDisplayValue("My bio text");

    // Should have 1 education entry initially (displayed as "BSc CS")
    const degreeInputs = screen.getAllByDisplayValue("BSc CS");
    expect(degreeInputs.length).toBe(1);

    // Add education
    await userEvent.click(screen.getByText("Add Education"));
    await waitFor(() => {
      const removeButtons = screen.getAllByLabelText(/Remove education entry/);
      expect(removeButtons.length).toBeGreaterThanOrEqual(2);
    });

    // Remove the new entry (last remove button)
    const removeButtons = screen.getAllByLabelText(/Remove education entry/);
    await userEvent.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => {
      const degreeInputsFinal = screen.getAllByDisplayValue("BSc CS");
      expect(degreeInputsFinal.length).toBe(1);
    });
  });

  it("adds and removes languages", async () => {
    renderWithProviders(<AboutEditor />);
    await screen.findByDisplayValue("English");

    // Add language
    await userEvent.click(screen.getByText("Add Language"));
    await waitFor(() => {
      const removeButtons = screen.getAllByLabelText(/Remove language/);
      expect(removeButtons.length).toBeGreaterThanOrEqual(2);
    });

    // Remove new language (last one)
    const removeButtons = screen.getAllByLabelText(/Remove language/);
    await userEvent.click(removeButtons[removeButtons.length - 1]);

    await waitFor(() => {
      const languageInputs = screen.getAllByDisplayValue("English");
      expect(languageInputs.length).toBe(1);
    });
  });

  it("adds and removes interests", async () => {
    renderWithProviders(<AboutEditor />);
    await screen.findByDisplayValue("My bio text");

    // Should have 2 interests initially (Coding + Reading)
    await waitFor(() => {
      const codingElements = screen.getAllByText("Coding");
      expect(codingElements.length).toBeGreaterThanOrEqual(1);
    });

    // Count initial interests
    const initialCount = screen.getAllByLabelText(/Remove interest/).length;
    expect(initialCount).toBe(2);

    // Remove first interest
    const removeButtons = screen.getAllByLabelText(/Remove interest/);
    await userEvent.click(removeButtons[0]);

    // Should have 1 less
    await waitFor(() => {
      const remainingCount = screen.getAllByLabelText(/Remove interest/).length;
      expect(remainingCount).toBe(initialCount - 1);
    });
  });

  it("submits bio update", async () => {
    renderWithProviders(<AboutEditor />);
    await screen.findByDisplayValue("My bio text");

    const bioInput = screen.getByDisplayValue("My bio text");
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, "Updated bio text");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockAboutUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ bio: "Updated bio text" }),
      );
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<AboutEditor />);
    await screen.findByDisplayValue("My bio text");

    const bioInput = screen.getByDisplayValue("My bio text");
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, "New bio");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "About section updated successfully" }),
      );
    });
  });
});