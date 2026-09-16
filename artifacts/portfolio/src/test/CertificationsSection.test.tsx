import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { mockEmptyState, mockSectionLabel, mockUseReveal, renderWithProviders } from "./helpers";

vi.mock("@/hooks/usePortfolioData", () => ({
  useCertifications: vi.fn(),
}));

vi.mock("@/hooks/useReveal", () => mockUseReveal());

vi.mock("@/components/CertCard", () => ({
  CertCard: ({ cert }: { cert: { title: string; issuer: string; id: string | number } }) => (
    <div data-testid={`cert-card-${cert.id}`}>
      <span>{cert.title}</span>
      <span>{cert.issuer}</span>
    </div>
  ),
}));

vi.mock("@/components/CertFilters", () => ({
  default: () => <div data-testid="cert-filters" />,
  getFilters: () => [
    { key: "all", label: "All" },
    { key: "python", label: "Python" },
    { key: "cloud", label: "Cloud" },
  ],
}));

vi.mock("@/components/CertStats", () => ({
  default: () => <div data-testid="cert-stats">Stats</div>,
}));

vi.mock("@/components/SectionLabel", () => mockSectionLabel());

vi.mock("@/components/EmptyState", () => mockEmptyState());

import CertificationsSection from "@/components/CertificationsSection";
import { useCertifications } from "@/hooks/usePortfolioData";

describe("CertificationsSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton while loading", () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderWithProviders(<CertificationsSection />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders certification cards when data is loaded", () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [
        {
          id: "cert-db-1",
          title: "AWS Data Engineer",
          issuer: "Amazon",
          date: "2024-01",
          category: "cloud",
          image_url: null,
          cert_url: "https://example.com",
        },
        {
          id: "cert-db-2",
          title: "Python Professional",
          issuer: "Python Institute",
          date: "2023-06",
          category: "python",
          image_url: null,
          cert_url: "https://example.com",
        },
      ],
      isLoading: false,
    } as any);

    renderWithProviders(<CertificationsSection />);
    expect(screen.getAllByTestId(/^cert-card-/)).toHaveLength(2);
    expect(screen.getByText("AWS Data Engineer")).toBeInTheDocument();
    expect(screen.getByText("Python Professional")).toBeInTheDocument();
  });

  it("keeps the database row's real id on rendered cards instead of a derived index", () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [
        {
          id: "cert-db-9",
          title: "AWS Data Engineer",
          issuer: "Amazon",
          date: "2024-01",
          category: "cloud",
          image_url: null,
          cert_url: "https://example.com",
        },
      ],
      isLoading: false,
    } as any);

    renderWithProviders(<CertificationsSection />);
    expect(screen.getByTestId("cert-card-cert-db-9")).toBeInTheDocument();
    expect(screen.queryByTestId("cert-card-1")).not.toBeInTheDocument();
  });

  it("renders fallback CERTIFICATIONS data when hook returns empty array", () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderWithProviders(<CertificationsSection />);
    // Component falls back to static CERTIFICATIONS data when hook returns empty
    const cards = screen.getAllByTestId(/^cert-card-/);
    expect(cards.length).toBeGreaterThan(0);
    // Static fallback items keep their stable hardcoded ids.
    expect(screen.getByTestId("cert-card-1")).toBeInTheDocument();
  });
});
