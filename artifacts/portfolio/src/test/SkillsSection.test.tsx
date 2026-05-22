import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/hooks/use-portfolio-data", () => ({
  useSkills: vi.fn(),
  groupSkillsByCategory: vi.fn((skills: any[]) => {
    const grouped: Record<string, any[]> = {};
    for (const s of skills) {
      if (s.is_visible === false) continue;
      const cat = s.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        name: s.name,
        proficiency: s.proficiency,
        level: s.proficiency >= 90 ? "Expert" : s.proficiency >= 75 ? "Advanced" : "Intermediate",
      });
    }
    return Object.entries(grouped).map(([key, skills]) => ({
      key: key.toLowerCase().replace(/\s+/g, "-"),
      label: key,
      color: "blue",
      skills: skills.sort((a: any, b: any) => b.proficiency - a.proficiency),
    }));
  }),
}));

vi.mock("@/hooks/use-reveal", () => ({
  useReveal: vi.fn(() => ({ ref: vi.fn(), revealed: true })),
}));

vi.mock("@/components/SectionLabel", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/EmptyState", () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}));

import SkillsSection from "@/components/SkillsSection";
import { useSkills } from "@/hooks/use-portfolio-data";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("SkillsSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows skeleton while loading", () => {
    vi.mocked(useSkills).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any);

    const { container } = renderWithProviders(<SkillsSection />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("renders categories with filter buttons", () => {
    vi.mocked(useSkills).mockReturnValue({
      data: [
        { name: "Python", proficiency: 95, category: "Languages", is_visible: true },
        { name: "React", proficiency: 80, category: "Frameworks", is_visible: true },
      ],
      isLoading: false,
    } as any);

    renderWithProviders(<SkillsSection />);
    expect(screen.getByTestId("skills-filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("skills-filter-languages")).toBeInTheDocument();
    expect(screen.getByTestId("skills-filter-frameworks")).toBeInTheDocument();
  });

  it("renders skill tags", () => {
    vi.mocked(useSkills).mockReturnValue({
      data: [
        { name: "Python", proficiency: 95, category: "Languages", is_visible: true },
        { name: "TypeScript", proficiency: 85, category: "Languages", is_visible: true },
      ],
      isLoading: false,
    } as any);

    renderWithProviders(<SkillsSection />);
    expect(screen.getByText("Python")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });
});
