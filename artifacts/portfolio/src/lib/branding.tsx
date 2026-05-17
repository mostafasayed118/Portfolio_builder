import { createContext, useContext } from "react";
import { useHeroContent } from "@/hooks/use-portfolio-data";
import { HERO } from "@/data/portfolio";

export type BrandingConfig = {
  siteName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  tagline: string;
};

const defaultBranding: BrandingConfig = {
  siteName: HERO.name,
  logoUrl: null,
  faviconUrl: null,
  tagline: HERO.roles[0],
};

const BrandingContext = createContext<BrandingConfig>(defaultBranding);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const { data: heroData } = useHeroContent();

  const branding: BrandingConfig = {
    siteName: heroData?.site_name ?? defaultBranding.siteName,
    logoUrl: heroData?.logo_url ?? null,
    faviconUrl: heroData?.favicon_url ?? null,
    tagline: heroData?.tagline ?? heroData?.roles?.[0] ?? defaultBranding.tagline,
  };

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export const useBranding = () => useContext(BrandingContext);
