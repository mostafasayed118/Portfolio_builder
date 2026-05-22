import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { BrandingProvider, useBranding } from "@/lib/branding";
import { HERO } from "@/data/hero";

vi.mock("@/hooks/use-portfolio-data", () => ({
  useHeroContent: vi.fn(),
}));

import { useHeroContent } from "@/hooks/use-portfolio-data";

const mockHeroData = {
  site_name: "Custom Portfolio",
  logo_url: "https://example.com/logo.png",
  favicon_url: "https://example.com/favicon.ico",
  tagline: "Custom Tagline",
  roles: ["Developer", "Designer"],
};

function wrapper({ children }: { children: React.ReactNode }) {
  return <BrandingProvider>{children}</BrandingProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BrandingProvider", () => {
  it("provides default branding context", () => {
    vi.mocked(useHeroContent).mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useBranding(), { wrapper });
    expect(result.current.siteName).toBe(HERO.name);
    expect(result.current.tagline).toBe(HERO.roles[0]);
    expect(result.current.logoUrl).toBeNull();
    expect(result.current.faviconUrl).toBeNull();
  });

  it("uses heroData values when available", () => {
    vi.mocked(useHeroContent).mockReturnValue({ data: mockHeroData } as any);

    const { result } = renderHook(() => useBranding(), { wrapper });
    expect(result.current.siteName).toBe("Custom Portfolio");
    expect(result.current.logoUrl).toBe("https://example.com/logo.png");
    expect(result.current.faviconUrl).toBe("https://example.com/favicon.ico");
    expect(result.current.tagline).toBe("Custom Tagline");
  });

  it("falls back to defaults when heroData is null", () => {
    vi.mocked(useHeroContent).mockReturnValue({ data: null } as any);

    const { result } = renderHook(() => useBranding(), { wrapper });
    expect(result.current.siteName).toBe(HERO.name);
    expect(result.current.logoUrl).toBeNull();
    expect(result.current.faviconUrl).toBeNull();
    expect(result.current.tagline).toBe(HERO.roles[0]);
  });
});
