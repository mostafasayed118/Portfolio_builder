import { useEffect } from "react";
import { createPortal } from "react-dom";
import { HERO, PROJECTS, CONTACT } from "@/data/portfolio";
import { useBranding } from "@/lib/branding";
import { useLanguage } from "@/lib/language";

const SITE_URL = import.meta.env.VITE_SITE_URL ?? "https://mustafasayed.replit.app";
const DEFAULT_IMAGE = `${SITE_URL}/opengraph.jpg`;
const TWITTER_HANDLE = import.meta.env.VITE_TWITTER_HANDLE ?? "";

const JOB_TITLE = "Data Engineer";

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile";
  schemas?: Record<string, unknown>[];
  publishedTime?: string;
  tags?: string[];
}

function SEOContent({
  title,
  description,
  image = DEFAULT_IMAGE,
  url = SITE_URL,
  type = "website",
  schemas,
  publishedTime,
  tags,
}: SEOProps) {
  const { siteName } = useBranding();
  const { lang } = useLanguage();
  const fullTitle = title ? `${title} — ${siteName}` : `${siteName} — ${JOB_TITLE}`;
  const metaDescription =
    description ||
    `Portfolio of ${HERO.name}, ${JOB_TITLE} from Cairo, Egypt. ${HERO.description}`;

  useEffect(() => {
    const doc = document;

    doc.title = fullTitle;

    let descMeta = doc.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!descMeta) {
      descMeta = doc.createElement("meta");
      descMeta.name = "description";
      doc.head.appendChild(descMeta);
    }
    descMeta.content = metaDescription;

    const ogTags: { property: string; content: string }[] = [
      { property: "og:type", content: type },
      { property: "og:url", content: url },
      { property: "og:title", content: fullTitle },
      { property: "og:description", content: metaDescription },
      { property: "og:image", content: image },
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: lang === "ar" ? "ar_SA" : "en_US" },
    ];

    if (type === "article" && publishedTime) {
      ogTags.push({ property: "article:published_time", content: publishedTime });
    }

    if (type === "article" && tags) {
      tags.forEach((tag) => {
        ogTags.push({ property: "article:tag", content: tag });
      });
    }

    if (type === "article") {
      ogTags.push({ property: "article:author", content: HERO.name });
    }

    ogTags.forEach(({ property, content }) => {
      let tag = doc.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = doc.createElement("meta");
        tag.setAttribute("property", property);
        doc.head.appendChild(tag);
      }
      tag.content = content;
    });

    const twitterTags: { name: string; content: string }[] = [
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: url },
      { name: "twitter:title", content: fullTitle },
      { name: "twitter:description", content: metaDescription },
      { name: "twitter:image", content: image },
      { name: "twitter:site", content: TWITTER_HANDLE ? `@${TWITTER_HANDLE}` : "" },
      { name: "twitter:creator", content: TWITTER_HANDLE ? `@${TWITTER_HANDLE}` : "" },
    ];

    twitterTags.forEach(({ name, content }) => {
      let tag = doc.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = doc.createElement("meta");
        tag.setAttribute("name", name);
        doc.head.appendChild(tag);
      }
      tag.content = content;
    });

    let canonicalLink = doc.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalLink) {
      canonicalLink = doc.createElement("link");
      canonicalLink.rel = "canonical";
      doc.head.appendChild(canonicalLink);
    }
    canonicalLink.href = url;

    const defaultSchemas = schemas ?? [
      {
        "@context": "https://schema.org",
        "@type": "Person",
        name: HERO.name,
        jobTitle: JOB_TITLE,
        url: SITE_URL,
        email: CONTACT.email,
        address: {
          "@type": "PostalAddress",
          addressLocality: "Cairo",
          addressCountry: "EG",
        },
        sameAs: [CONTACT.github, CONTACT.linkedin],
        knowsAbout: HERO.roles,
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: siteName,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ];

    defaultSchemas.forEach((schema, i) => {
      const id = `schema-org-jsonld-${i}`;
      let script = doc.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = doc.createElement("script");
        script.id = id;
        script.type = "application/ld+json";
        doc.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema);
    });

    const existingScripts = doc.head.querySelectorAll("script[id^='schema-org-jsonld-']");
    for (let i = defaultSchemas.length; i < existingScripts.length; i++) {
      existingScripts[i]?.remove();
    }
  }, [fullTitle, metaDescription, image, url, type, publishedTime, tags, lang]);

  return null;
}

function SEO(props: SEOProps) {
  return createPortal(<SEOContent {...props} />, document.head);
}

export default SEO;

export function generateProjectSchema(slug: string) {
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) return null;

  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: project.title,
    description: project.shortDescription,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: `${SITE_URL}/projects/${slug}`,
    image: DEFAULT_IMAGE,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Person",
      name: HERO.name,
      url: SITE_URL,
    },
  };
}