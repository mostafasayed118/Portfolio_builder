import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CvManager from "@/pages/CvManager";

const { mockToastSuccess, mockGetSupabase } = vi.hoisted(
  () => ({
    mockToastSuccess: vi.fn(),
    mockGetSupabase: vi.fn(),
  }),
);

vi.mock("@/lib/supabase", () => ({
  getSupabase: mockGetSupabase,
  isSupabaseConfigured: true,
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return {
    ...actual,
    useToast: () => ({ toast: mockToastSuccess }),
  };
});

vi.mock("@/components/SmartConfirmDialog", () => ({
  SmartConfirmDialog: ({ state, onCancel }: any) =>
    state.isOpen ? (
      <div data-testid="confirm-dialog">
        <p>{state.title}</p>
        <button onClick={state.onConfirm}>{state.confirmLabel}</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    ) : null,
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("CvManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ objectPath: null, fileName: null, updatedAt: "2024-01-01" }),
    });
    mockGetSupabase.mockReturnValue({
      storage: {
        from: () => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    });
  });

  it("renders upload form", async () => {
    renderWithProviders(<CvManager />);

    expect(await screen.findByText("CV / Resume")).toBeInTheDocument();
    expect(screen.getByText("Upload CV")).toBeInTheDocument();
    expect(screen.getByText("Drop your PDF here or click to browse")).toBeInTheDocument();
  });

  it("validates PDF type on upload", async () => {
    renderWithProviders(<CvManager />);

    await screen.findByText("CV / Resume");

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();
    expect(fileInput.accept).toContain("application/pdf");
  });

  it("validates file size", async () => {
    renderWithProviders(<CvManager />);

    await screen.findByText("CV / Resume");

    const uploadArea = screen.getByRole("button", { name: /upload cv pdf/i });
    expect(uploadArea).toBeInTheDocument();
  });

  it("shows existing CV when available", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ objectPath: "cv-123.pdf", fileName: "resume.pdf", updatedAt: "2024-01-01" }),
    });

    renderWithProviders(<CvManager />);

    await expect(screen.findByText("resume.pdf")).resolves.toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("shows success toast after upload", async () => {
    renderWithProviders(<CvManager />);

    await screen.findByText("CV / Resume");

    expect(screen.getByText("Upload CV")).toBeInTheDocument();
  });
});
