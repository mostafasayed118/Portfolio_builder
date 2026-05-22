import { useCallback, useRef } from "react";
import { api } from "@/lib/api-client";
import { logWarn } from "@/lib/logger";

interface PrefetchCache {
  [path: string]: {
    data: unknown;
    timestamp: number;
  };
}

const PREFETCH_TTL = 30_000;

const routeDataMap: Record<string, () => Promise<unknown>> = {
  "/skills": () => api.skills.list(),
  "/projects": () => api.projects.list(),
  "/experience": () => api.experience.list(),
  "/certifications": () => api.certifications.list(),
  "/messages": () => api.messages.list(),
  "/hero": () => api.hero.get(),
  "/about": () => api.about.get(),
  "/contact-info": () => api.contactInfo.get(),
  "/theme-settings": () => api.themeSettings.get(),
  "/typography-settings": () => api.typographySettings.get(),
  "/seo-settings": () => api.seoSettings.get(),
  "/site-settings": () => api.siteSettings.get(),
  "/section-settings": () => api.sectionSettings.list(),
};

export function usePrefetch() {
  const cacheRef = useRef<PrefetchCache>({});
  const prefetchingRef = useRef<Set<string>>(new Set());

  const prefetch = useCallback((path: string) => {
    const normalizedPath = path.replace(/^\/+/, "");

    if (prefetchingRef.current.has(normalizedPath)) {
      return;
    }

    const cached = cacheRef.current[normalizedPath];
    if (cached && Date.now() - cached.timestamp < PREFETCH_TTL) {
      return;
    }

    const dataFn = routeDataMap[normalizedPath];
    if (!dataFn) {
      return;
    }

    prefetchingRef.current.add(normalizedPath);

    dataFn()
      .then((data) => {
        cacheRef.current[normalizedPath] = {
          data,
          timestamp: Date.now(),
        };
      })
      .catch((err) => {
        logWarn(`Prefetch failed for ${normalizedPath}: ${err instanceof Error ? err.message : err}`, "Prefetch");
      })
      .finally(() => {
        prefetchingRef.current.delete(normalizedPath);
      });
  }, []);

  const clearCache = useCallback((path?: string) => {
    if (path) {
      delete cacheRef.current[path.replace(/^\/+/, "")];
    } else {
      cacheRef.current = {};
    }
  }, []);

  return { prefetch, clearCache };
}