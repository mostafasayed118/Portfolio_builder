import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TestRouter } from "@/test/test-router";
import Navbar from "@/components/Navbar";

vi.mock("@/hooks/use-throttled-scroll", () => ({
  useThrottledScroll: vi.fn(),
}));

vi.mock("@/lib/theme", () => ({
  useTheme: () => ({ theme: "light" as const, setTheme: vi.fn(), toggle: vi.fn() }),
}));

vi.mock("@/lib/branding", () => ({
  useBranding: () => ({ siteName: "Test", logoUrl: null }),
}));

vi.mock("@/lib/language", () => ({
  useLanguage: () => ({
    t: {
      nav: {
        about: "About",
        skills: "Skills",
        projects: "Projects",
        experience: "Experience",
        certifications: "Certifications",
        contact: "Contact",
      },
      common: {},
    },
    lang: "en",
    isArabic: false,
    dir: "ltr",
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/LanguageToggle", () => ({
  LanguageToggle: () => <button>T</button>,
}));

vi.mock("@/lib/theme-sync-context", () => ({
  useThemeSync: () => ({
    isSynced: false,
    mode: "light" as const,
    previousTheme: null,
    acknowledge: vi.fn(),
  }),
}));

describe("Navbar — mobile menu (UX-013 regression: backdrop overlay closes menu)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mobile menu is closed by default", () => {
    render(
      <TestRouter>
        <Navbar />
      </TestRouter>,
    );
    const menu = document.querySelector("[data-mobile-menu]");
    expect(menu).toHaveClass("max-h-0");
    expect(menu).toHaveClass("opacity-0");
  });

  it("opening the mobile menu toggles the mobile-open class and shows a clickable backdrop overlay", () => {
    render(
      <TestRouter>
        <Navbar />
      </TestRouter>,
    );
    const button = screen.getByTestId("btn-mobile-menu");
    fireEvent.click(button);

    const menu = document.querySelector("[data-mobile-menu]");
    expect(menu).toHaveClass("max-h-[calc(100dvh-4rem)]");
    expect(menu).toHaveClass("opacity-100");

    const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/40");
    expect(backdrop).toBeInTheDocument();
  });

  it("clicking the backdrop closes the mobile menu", () => {
    render(
      <TestRouter>
        <Navbar />
      </TestRouter>,
    );
    fireEvent.click(screen.getByTestId("btn-mobile-menu"));
    const backdrop = document.querySelector(".fixed.inset-0.bg-black\\/40") as HTMLElement;
    expect(backdrop).toBeTruthy();
    fireEvent.click(backdrop);

    const menu = document.querySelector("[data-mobile-menu]");
    expect(menu).toHaveClass("max-h-0");
    expect(menu).toHaveClass("opacity-0");
  });

  it("Escape key closes the mobile menu", async () => {
    render(
      <TestRouter>
        <Navbar />
      </TestRouter>,
    );
    fireEvent.click(screen.getByTestId("btn-mobile-menu"));
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      const menu = document.querySelector("[data-mobile-menu]");
      expect(menu).toHaveClass("max-h-0");
    });
  });

  it("the hamburger button toggles aria-expanded", () => {
    render(
      <TestRouter>
        <Navbar />
      </TestRouter>,
    );
    const button = screen.getByTestId("btn-mobile-menu");
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
  });
});
