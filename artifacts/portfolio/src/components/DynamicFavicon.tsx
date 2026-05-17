import { useEffect } from "react";
import { useBranding } from "@/lib/branding";

export function DynamicFavicon() {
  const { faviconUrl, siteName } = useBranding();

  useEffect(() => {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (faviconUrl) {
      link.href = faviconUrl;
    } else {
      link.href = "/favicon.ico";
    }
  }, [faviconUrl]);

  useEffect(() => {
    document.title = siteName;
  }, [siteName]);

  return null;
}
