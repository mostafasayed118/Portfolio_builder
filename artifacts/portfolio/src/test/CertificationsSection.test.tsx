import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/hooks/use-portfolio-data", () => ({
  useCertifications: vi.fn(),
}));

vi.mock("@/hooks/use-reveal", () => ({
  useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })),
}));

vi.mock("@/components/CertCard", () => ({
  CertCard: ({ cert }: { cert: { title: string; issuer: string } }) => (
    <div data-testid="cert-card">
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

vi.mock("@/components/SectionLabel", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/EmptyState", () => ({
  default: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

import CertificationsSection from "@/components/CertificationsSection";
import { useCertifications } from "@/hooks/use-portfolio-data";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>,
  );
}

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
          title: "AWS Data Engineer",
          issuer: "Amazon",
          date: "2024-01",
          category: "cloud",
          image_url: null,
          cert_url: "https://example.com",
        },
        {
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
    expect(screen.getAllByTestId("cert-card")).toHaveLength(2);
    expect(screen.getByText("AWS Data Engineer")).toBeInTheDocument();
    expect(screen.getByText("Python Professional")).toBeInTheDocument();
  });

  it("renders fallback CERTIFICATIONS data when hook returns empty array", () => {
    vi.mocked(useCertifications).mockReturnValue({
      data: [],
      isLoading: false,
    } as any);

    renderWithProviders(<CertificationsSection />);
    // Component falls back to static CERTIFICATIONS data when hook returns empty
    const cards = screen.getAllByTestId("cert-card");
    expect(cards.length).toBeGreaterThan(0);
  });
});
