import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/hooks/use-portfolio-data", () => ({
  useAboutContent: vi.fn(),
  useSkills: vi.fn(() => ({ data: [], isLoading: false })),
}));

vi.mock("@/hooks/use-reveal", () => ({
  useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })),
}));

vi.mock("@/components/SkillMeter", () => ({
  default: ({ label }: { label: string }) => <div data-testid="skill-meter">{label}</div>,
}));

vi.mock("@/components/SectionLabel", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/use-localized", () => ({
  useLocalized: vi.fn(() => ({ localize: (v: string) => v })),
}));

import AboutSection from "@/components/AboutSection";
import { useAboutContent } from "@/hooks/use-portfolio-data";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("AboutSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton while loading", () => {
    vi.mocked(useAboutContent).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderWithProviders(<AboutSection />);
    // Skeleton section should be present with animate-pulse elements
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders bio text when data is loaded", () => {
    vi.mocked(useAboutContent).mockReturnValue({
      data: {
        bio1: "I am a data engineer",
        bio2: "I love building pipelines",
        location: "Cairo, Egypt",
        years_of_experience: 5,
        degree: "B.Sc. CS",
        school: "Cairo University",
        grade: "Excellent",
        education_years: "2018-2022",
        languages: [{ name: "English", level: 90 }],
      },
      isLoading: false,
    } as any);

    renderWithProviders(<AboutSection />);
    expect(screen.getAllByText("I am a data engineer").length).toBeGreaterThan(0);
    expect(screen.getByText("I love building pipelines")).toBeInTheDocument();
  });

  it("renders education details", () => {
    vi.mocked(useAboutContent).mockReturnValue({
      data: {
        bio1: "bio1",
        bio2: "bio2",
        location: "Cairo",
        years_of_experience: 5,
        degree: "B.Sc. Computer Science",
        school: "Cairo University",
        grade: "Very Good",
        education_years: "2018-2022",
        languages: [],
      },
      isLoading: false,
    } as any);

    renderWithProviders(<AboutSection />);
    expect(screen.getByText("B.Sc. Computer Science")).toBeInTheDocument();
    expect(screen.getByText("Cairo University")).toBeInTheDocument();
    expect(screen.getByText("Very Good")).toBeInTheDocument();
  });

  it("renders language bars", () => {
    vi.mocked(useAboutContent).mockReturnValue({
      data: {
        bio1: "bio1",
        bio2: "bio2",
        location: "Cairo",
        years_of_experience: 5,
        degree: "degree",
        school: "school",
        grade: "grade",
        education_years: "years",
        languages: [
          { name: "Arabic", level: 100 },
          { name: "English", level: 80 },
        ],
      },
      isLoading: false,
    } as any);

    renderWithProviders(<AboutSection />);
    expect(screen.getByText("Arabic")).toBeInTheDocument();
    expect(screen.getByText("Native")).toBeInTheDocument();
    expect(screen.getByText("English")).toBeInTheDocument();
    expect(screen.getByText("Fluent")).toBeInTheDocument();
  });
});
