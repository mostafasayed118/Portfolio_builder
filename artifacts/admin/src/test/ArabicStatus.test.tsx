import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./helpers";
import { ArabicContentStatus } from "@/features/settings";

const { mockGetArabicStatus } = vi.hoisted(() => ({
  mockGetArabicStatus: vi.fn(),
}));

vi.mock("@/lib/api-client", () => ({
  api: {
    arabicStatus: {
      get: mockGetArabicStatus,
    },
  },
}));

describe("ArabicContentStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches status from the admin API and renders counts with completion icons", async () => {
    mockGetArabicStatus.mockResolvedValue({
      success: true,
      data: {
        hero: true,
        about: true,
        projects: { filled: 3 },
        experience: { filled: 2 },
        certifications: { filled: 0 },
      },
    });

    renderWithProviders(<ArabicContentStatus />);

    expect(await screen.findByText(/Projects \(3\)/)).toBeInTheDocument();
    expect(screen.getByText("Hero")).toBeInTheDocument();
    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText(/Experience \(2\)/)).toBeInTheDocument();
    expect(screen.getByText(/Certifications \(0\)/)).toBeInTheDocument();
    // 3 complete rows (hero, about, projects>0, experience>0) + 2 missing
    expect(document.querySelectorAll(".text-success")).toHaveLength(4);
    expect(document.querySelectorAll(".text-destructive")).toHaveLength(1);
  });

  it("renders ? placeholders and missing rows while the request is in flight", () => {
    mockGetArabicStatus.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<ArabicContentStatus />);

    expect(screen.getByText("Projects (?)")).toBeInTheDocument();
    expect(screen.getByText("Experience (?)")).toBeInTheDocument();
    expect(screen.getByText("Certifications (?)")).toBeInTheDocument();
    expect(document.querySelectorAll(".text-destructive")).toHaveLength(5);
  });

  it("falls back to missing/unknown when the API reports failure", async () => {
    mockGetArabicStatus.mockResolvedValue({ success: false, message: "boom" });

    renderWithProviders(<ArabicContentStatus />);

    await screen.findByText("Hero");
    expect(screen.getByText("Projects (?)")).toBeInTheDocument();
    expect(document.querySelectorAll(".text-destructive")).toHaveLength(5);
    expect(document.querySelectorAll(".text-success")).toHaveLength(0);
  });
});
