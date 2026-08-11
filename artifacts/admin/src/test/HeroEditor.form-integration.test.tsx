import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HeroEditor } from "@/features/hero-content";

const { mockFetch, mockUpdate, mockToast } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
  mockUpdate: vi.fn(),
  mockToast: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: { hero: { get: mockFetch, update: mockUpdate } },
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

const mockHeroData = {
  id: "1", name: "John Doe", roles: ["Developer", "Designer"],
  heading: "Hello World", description: "A short bio",
  github_url: "https://github.com/johndoe", linkedin_url: "https://linkedin.com/in/johndoe",
  twitter_url: "https://twitter.com/johndoe", email: "john@example.com",
  avatar_url: "", cv_url: "",
  stats: [{ label: "Projects", value: "10" }],
};

describe("HeroEditor form integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ success: true, data: mockHeroData });
    mockUpdate.mockResolvedValue({ success: true });
  });

  it("adds and removes typewriter lines", async () => {
    renderWithProviders(<HeroEditor />);
    await screen.findByDisplayValue("Developer");
    const initialCount = screen.getAllByPlaceholderText(/^Line \d+$/).length;

    await userEvent.click(screen.getByText("Add line"));
    expect(screen.getAllByPlaceholderText(/^Line \d+$/).length).toBe(initialCount + 1);

    const removeBtn = screen.getAllByLabelText(/Remove typewriter line/);
    await userEvent.click(removeBtn[removeBtn.length - 1]);
    expect(screen.getAllByPlaceholderText(/^Line \d+$/).length).toBe(initialCount);
  });

  it("adds and removes stats", async () => {
    renderWithProviders(<HeroEditor />);
    await screen.findByDisplayValue("10");

    await userEvent.click(screen.getByText("Add stat"));
    // After adding, there are 2 "Label" placeholders (existing + new)
    const labelInputs = screen.getAllByPlaceholderText("Label");
    expect(labelInputs.length).toBeGreaterThanOrEqual(2);

    // Remove the newly added stat (last remove button)
    const removeBtns = screen.getAllByLabelText(/Remove stat \d/);
    await userEvent.click(removeBtns[removeBtns.length - 1]);

    // Now there should be fewer Label inputs
    const remainingLabelInputs = screen.getAllByPlaceholderText("Label");
    expect(remainingLabelInputs.length).toBeLessThan(labelInputs.length);
  });

  it("submits with correct payload structure", async () => {
    renderWithProviders(<HeroEditor />);
    await screen.findByDisplayValue("John Doe");

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Updated Name");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Updated Name",
          roles: ["Developer", "Designer"],
          heading: "Hello World",
        }),
      );
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<HeroEditor />);
    await screen.findByDisplayValue("John Doe");

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Jane");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Hero section updated successfully" }),
      );
    });
  });

  it("shows error toast on save failure", async () => {
    mockUpdate.mockRejectedValue(new Error("Network error"));
    renderWithProviders(<HeroEditor />);
    await screen.findByDisplayValue("John Doe");

    const nameInput = screen.getByDisplayValue("John Doe");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Jane");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Save failed: Network error", variant: "destructive" }),
      );
    });
  });
});