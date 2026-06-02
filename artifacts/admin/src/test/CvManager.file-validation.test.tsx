import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderAdmin } from "./helpers";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CvManager from "@/pages/CvManager";

const { mockToast, mockUpdateSettings, mockGetSettings } = vi.hoisted(() => ({
  mockToast: vi.fn(),
  mockUpdateSettings: vi.fn(),
  mockGetSettings: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    cv: {
      getSettings: mockGetSettings,
      updateSettings: mockUpdateSettings,
    },
  },
  getCsrfToken: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabase: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      })),
    },
  })),
  isSupabaseConfigured: true,
}));

vi.mock("@/components/SmartConfirmDialog", () => ({
  SmartConfirmDialog: () => null,
}));

vi.mock("@workspace/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui")>();
  return { ...actual, useToast: () => ({ toast: mockToast }) };
});

describe("CvManager — UX-019 regression: file type + size validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetSettings.mockResolvedValue({ success: true, data: { objectPath: null, fileName: null, updatedAt: null } });
    mockUpdateSettings.mockResolvedValue({ success: true });
  });

  it("renders the upload dropzone with PDF instructions", async () => {
    renderAdmin(<CvManager />);
    expect(await screen.findByText(/Drop your PDF here/i)).toBeInTheDocument();
  });

  it("rejects a non-PDF file with a destructive toast", async () => {
    renderAdmin(<CvManager />);
    await screen.findByText(/Drop your PDF here/i);

    const file = new File(["hello"], "resume.docx", { type: "application/msword" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/PDF/i), variant: "destructive" }),
    );
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });

  it("rejects a file larger than 10MB with a destructive toast", async () => {
    renderAdmin(<CvManager />);
    await screen.findByText(/Drop your PDF here/i);

    const big = new File([new Uint8Array(11 * 1024 * 1024)], "huge.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [big] } });

    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "File too large", variant: "destructive" }),
    );
  });

  it("uploads a valid PDF and calls updateSettings + success toast", async () => {
    renderAdmin(<CvManager />);
    await screen.findByText(/Drop your PDF here/i);

    const pdf = new File(["%PDF-1.4 content"], "Mustafa_Resume.pdf", { type: "application/pdf" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [pdf] } });

    await waitFor(() => {
      expect(mockUpdateSettings).toHaveBeenCalled();
    });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringMatching(/uploaded/i) }),
    );
  });
});
