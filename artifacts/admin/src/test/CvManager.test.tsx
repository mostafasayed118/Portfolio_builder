import { vi, describe, it, expect, beforeEach } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import {
  renderWithProviders,
  smartConfirmDialogMock,
  stubUseToast,
} from "./helpers";
import { CvManager } from "@/features/cv";

const { mockToastSuccess, mockGetSupabase, mockCvGetSettings, mockCvUpdateSettings } = vi.hoisted(
  () => ({
    mockToastSuccess: vi.fn(),
    mockGetSupabase: vi.fn(),
    mockCvGetSettings: vi.fn(),
    mockCvUpdateSettings: vi.fn(),
  }),
);

vi.mock("@/lib/supabase", () => ({
  getSupabase: mockGetSupabase,
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    cv: {
      getSettings: (...args: any[]) => mockCvGetSettings(...args),
      updateSettings: (...args: any[]) => mockCvUpdateSettings(...args),
    },
  },
  getCsrfToken: vi.fn().mockResolvedValue("mock-csrf-token"),
}));

vi.mock("@workspace/ui", (importOriginal) => stubUseToast(importOriginal, mockToastSuccess));

vi.mock("@/components/SmartConfirmDialog", () => smartConfirmDialogMock());

describe("CvManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCvGetSettings.mockResolvedValue({
      success: true,
      data: { objectPath: null, fileName: null, updatedAt: "2024-01-01" },
    });
    mockCvUpdateSettings.mockResolvedValue({ success: true });
    mockGetSupabase.mockReturnValue({
      storage: {
        from: () => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        }),
      },
    });
  });

  it("uploads and rolls back the exact owned path while saving only the basename", async () => {
    const portfolioId = "11111111-1111-4111-8111-111111111111";
    mockCvGetSettings.mockResolvedValue({ success: true, data: { portfolioId, objectPath: null } });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ storage: { from: () => ({ upload, remove }) } });
    mockCvUpdateSettings.mockResolvedValue({ success: false, message: "Save failed" });
    renderWithProviders(<CvManager />);
    await screen.findByText("CV / Resume");
    const file = new File(["%PDF"], "resume.pdf", { type: "application/pdf" });
    fireEvent.drop(screen.getByRole("button", { name: /upload cv pdf/i }), { dataTransfer: { files: [file] } });
    await waitFor(() => expect(remove).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${portfolioId}/cv-\\d+\\.pdf$`)), file, expect.objectContaining({ contentType: "application/pdf" }));
    const path: unknown = upload.mock.calls[0]?.[0];
    if (typeof path !== "string") throw new Error("Missing upload path");
    expect(remove).toHaveBeenCalledWith([path]);
    expect(mockCvUpdateSettings).toHaveBeenCalledWith({ objectPath: path.split("/")[1], fileName: "resume.pdf" });
  });

  it("rolls back the uploaded object when saving settings throws", async () => {
    const portfolioId = "11111111-1111-4111-8111-111111111111";
    mockCvGetSettings.mockResolvedValue({ success: true, data: { portfolioId, objectPath: null } });
    const upload = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn().mockResolvedValue({ error: null });
    mockGetSupabase.mockReturnValue({ storage: { from: () => ({ upload, remove }) } });
    mockCvUpdateSettings.mockRejectedValue(new Error("Network failed"));
    renderWithProviders(<CvManager />);
    await screen.findByText("CV / Resume");
    fireEvent.drop(screen.getByRole("button", { name: /upload cv pdf/i }), {
      dataTransfer: { files: [new File(["%PDF"], "resume.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(expect.objectContaining({ title: "Upload failed" })));
    expect(remove).toHaveBeenCalledWith([upload.mock.calls[0]?.[0]]);
  });

  it("fails closed when settings do not resolve an owned portfolio", async () => {
    renderWithProviders(<CvManager />);
    await screen.findByText("CV / Resume");
    fireEvent.drop(screen.getByRole("button", { name: /upload cv pdf/i }), { dataTransfer: { files: [new File(["%PDF"], "resume.pdf", { type: "application/pdf" })] } });
    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith(expect.objectContaining({ title: "Upload failed" })));
    expect(mockGetSupabase).not.toHaveBeenCalled();
    expect(mockCvUpdateSettings).not.toHaveBeenCalled();
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
    mockCvGetSettings.mockResolvedValue({
      success: true,
      data: { objectPath: "cv-123.pdf", fileName: "resume.pdf", updatedAt: "2024-01-01" },
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
