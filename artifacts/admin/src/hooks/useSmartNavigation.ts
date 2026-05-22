import { useCallback, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { usePrefetch } from "./usePrefetchRoutes";

export function useSmartNavigation() {
  const [, setLocation] = useLocation();
  const [currentRoute] = useRoute("*");
  const { prefetch } = usePrefetch();

  const navigate = useCallback((path: string, options?: { preload?: boolean }) => {
    if (options?.preload !== false) {
      prefetch(path);
    }
    setLocation(path);
  }, [setLocation, prefetch]);

  const preloadOnHover = useCallback((path: string) => {
    prefetch(path);
  }, [prefetch]);

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a[data-preload]');
      if (link) {
        const href = link.getAttribute("href");
        if (href) {
          prefetch(href);
        }
      }
    };

    const handleGlobalLinkHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (link && !link.hasAttribute("data-preload")) {
        const href = link.getAttribute("href");
        if (href && href.startsWith("/")) {
          prefetch(href);
        }
      }
    };

    document.addEventListener("mouseover", handleMouseOver);
    document.addEventListener("mouseover", handleGlobalLinkHover);

    return () => {
      document.removeEventListener("mouseover", handleMouseOver);
      document.removeEventListener("mouseover", handleGlobalLinkHover);
    };
  }, [prefetch]);

  return { navigate, preloadOnHover, currentRoute };
}

export function useSmartLink(path: string) {
  const { navigate, preloadOnHover } = useSmartNavigation();

  return {
    href: path,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(path);
    },
    onMouseEnter: () => preloadOnHover(path),
  };
}