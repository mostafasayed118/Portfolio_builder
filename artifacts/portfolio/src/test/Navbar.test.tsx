import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LanguageProvider } from "@/lib/language";

vi.mock("@/lib/theme", () => ({
  useTheme: vi.fn(() => ({ theme: "dark", toggle: vi.fn() })),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: vi.fn(() => ({ siteName: "Test Portfolio", logoUrl: null })),
}));

vi.mock("@/hooks/use-throttled-scroll", () => ({
  useThrottledScroll: vi.fn(),
}));

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button aria-label="Toggle language">EN</button>,
}));

import Navbar from "@/components/Navbar";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <LanguageProvider>{ui}</LanguageProvider>
    </QueryClientProvider>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders nav links", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByTestId("nav-about")).toBeInTheDocument();
    expect(screen.getByTestId("nav-skills")).toBeInTheDocument();
    expect(screen.getByTestId("nav-projects")).toBeInTheDocument();
    expect(screen.getByTestId("nav-experience")).toBeInTheDocument();
    expect(screen.getByTestId("nav-contact")).toBeInTheDocument();
  });

  it("renders language toggle", () => {
    renderWithProviders(<Navbar />);
    expect(screen.getByLabelText("Toggle language")).toBeInTheDocument();
  });

  it("renders theme toggle", () => {
    renderWithProviders(<Navbar />);
    const themeButtons = screen.getAllByLabelText("Toggle theme");
    expect(themeButtons.length).toBeGreaterThan(0);
  });
});
