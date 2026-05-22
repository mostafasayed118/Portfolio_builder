import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AboutEditor from "@/pages/AboutEditor";

const { mockAboutGet, mockAboutUpdate, mockToastSuccess, mockToastError } = vi.hoisted(
  () => ({
    mockAboutGet: vi.fn(),
    mockAboutUpdate: vi.fn(),
    mockToastSuccess: vi.fn(),
    mockToastError: vi.fn(),
  }),
);

vi.mock("@/lib/api-client", () => ({
  api: {
    about: {
      get: mockAboutGet,
      update: mockAboutUpdate,
    },
  },
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToastSuccess }),
  };
});

vi.mock("@/hooks/useKeyboardShortcuts", () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock("@/hooks/use-before-unload", () => ({
  useBeforeUnload: vi.fn(),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockAboutData = {
  bio: "My bio text",
  education: [{ degree: "BSc CS", institution: "MIT", year: "2024" }],
  languages: [{ name: "English", level: 90 }],
  interests: ["Coding", "Reading"],
};

describe("AboutEditor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAboutGet.mockResolvedValue({ success: true, data: mockAboutData });
    mockAboutUpdate.mockResolvedValue({ success: true, data: mockAboutData });
  });

  it("renders form fields correctly", async () => {
    renderWithProviders(<AboutEditor />);

    expect(await screen.findByText("About Editor")).toBeInTheDocument();
    expect(await screen.findByText("Save Changes")).toBeInTheDocument();
    expect(screen.getByText("Bio")).toBeInTheDocument();
    expect(screen.getAllByText("Education").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Languages").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Interests").length).toBeGreaterThanOrEqual(1);
  });

  it("pre-fills form from fetched about data", async () => {
    renderWithProviders(<AboutEditor />);

    await expect(screen.findByDisplayValue("My bio text")).resolves.toBeInTheDocument();
    expect(screen.getByDisplayValue("BSc CS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("MIT")).toBeInTheDocument();
    expect(screen.getByDisplayValue("English")).toBeInTheDocument();
  });

  it("calls update on save", async () => {
    renderWithProviders(<AboutEditor />);

    await screen.findByDisplayValue("My bio text");

    const bioInput = screen.getByDisplayValue("My bio text");
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, "Updated bio");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockAboutUpdate).toHaveBeenCalled();
    });
  });

  it("shows success toast after save", async () => {
    renderWithProviders(<AboutEditor />);

    await screen.findByDisplayValue("My bio text");

    const bioInput = screen.getByDisplayValue("My bio text");
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, "Updated bio");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: "About section updated successfully" }),
      );
    });
  });

  it("shows error toast on save failure", async () => {
    mockAboutUpdate.mockRejectedValue(new Error("Network error"));

    renderWithProviders(<AboutEditor />);

    await screen.findByDisplayValue("My bio text");

    const bioInput = screen.getByDisplayValue("My bio text");
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, "Updated bio");

    await userEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ title: expect.stringContaining("Save failed"), variant: "destructive" }),
      );
    });
  });
});
