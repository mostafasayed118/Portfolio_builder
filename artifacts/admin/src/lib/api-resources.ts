/**
 * API resource definitions for the Admin CMS.
 *
 * Each resource defines typed CRUD operations that delegate to the
 * authenticated `request()` helper from `api-client.ts`. The `api`
 * object is consumed by React Query hooks and component call sites
 * throughout the admin app.
 *
 * Split from api-client.ts (365 → 250 + 115 lines) to isolate
 * endpoint definitions from the transport layer.
 */
import type {
  HeroContent, AboutContent, Skill, Project, Experience,
  Certification, Message, ContactInfo, ThemeSettings,
  TypographySettings, SeoSettings, SectionSetting, SiteSettings,
  User, BlogPost,
} from "@workspace/supabase/types";
import { request, type CvSettings } from "./request-core";

function userIdParam(userId?: string): string {
  return userId ? `?userId=${encodeURIComponent(userId)}` : "";
}

export const api = {
  users: {
    me: () => request<Pick<User, "id" | "email" | "role">>("GET", "/users/me"),
    list: () => request<User[]>("GET", "/users"),
    updateRole: (id: string, role: "user" | "superadmin") => request<User>("PATCH", `/users/${id}/role`, { role }),
  },
  hero: {
    get: () => request<HeroContent>("GET", "/hero"),
    update: (data: Partial<HeroContent>) => request<HeroContent>("PUT", "/hero", data),
  },
  about: {
    get: () => request<AboutContent>("GET", "/about"),
    update: (data: Partial<AboutContent>) => request<AboutContent>("PUT", "/about", data),
  },
  skills: {
    list: (userId?: string) => request<Skill[]>("GET", `/skills${userIdParam(userId)}`),
    create: (data: Partial<Skill>) => request<Skill>("POST", "/skills", data),
    update: (id: string, data: Partial<Skill>) => request<Skill>("PUT", `/skills/${id}`, data),
    delete: (id: string) => request("DELETE", `/skills/${id}`),
  },
  projects: {
    list: (userId?: string) => request<Project[]>("GET", `/projects${userIdParam(userId)}`),
    create: (data: Partial<Project>) => request<Project>("POST", "/projects", data),
    update: (id: string, data: Partial<Project>) => request<Project>("PUT", `/projects/${id}`, data),
    delete: (id: string) => request("DELETE", `/projects/${id}`),
  },
  experience: {
    list: (userId?: string) => request<Experience[]>("GET", `/experience${userIdParam(userId)}`),
    create: (data: Partial<Experience>) => request<Experience>("POST", "/experience", data),
    update: (id: string, data: Partial<Experience>) => request<Experience>("PUT", `/experience/${id}`, data),
    delete: (id: string) => request("DELETE", `/experience/${id}`),
  },
  certifications: {
    list: (userId?: string) => request<Certification[]>("GET", `/certifications${userIdParam(userId)}`),
    create: (data: Partial<Certification>) => request<Certification>("POST", "/certifications", data),
    update: (id: string, data: Partial<Certification>) => request<Certification>("PUT", `/certifications/${id}`, data),
    delete: (id: string) => request("DELETE", `/certifications/${id}`),
  },
  posts: {
    list: (userId?: string) => request<BlogPost[]>("GET", `/posts${userIdParam(userId)}`),
    create: (data: Partial<BlogPost>) => request<BlogPost>("POST", "/posts", data),
    update: (id: string, data: Partial<BlogPost>) => request<BlogPost>("PUT", `/posts/${id}`, data),
    delete: (id: string) => request("DELETE", `/posts/${id}`),
  },
  messages: {
    list: (userId?: string) => request<Message[]>("GET", `/messages${userIdParam(userId)}`),
    unreadCount: (userId?: string) => request<number>("GET", `/messages/unread-count${userIdParam(userId)}`),
    markRead: (id: string) => request("PATCH", `/messages/${id}/read`),
    markUnread: (id: string) => request("PATCH", `/messages/${id}/unread`),
    delete: (id: string) => request("DELETE", `/messages/${id}`),
    bulkDelete: (ids: string[]) => request("POST", "/messages/bulk-delete", { ids }),
    reply: (id: string, reply: string) => request("POST", `/messages/${id}/reply`, { reply }),
  },
  contact: {
    submit: (data: { name: string; email: string; message: string }) =>
      request("POST", "/contact", data),
  },
  contactInfo: {
    get: () => request<ContactInfo>("GET", "/contact-info"),
    update: (data: Partial<ContactInfo>) => request<ContactInfo>("PUT", "/contact-info", data),
  },
  themeSettings: {
    get: () => request<ThemeSettings>("GET", "/theme-settings"),
    update: (data: Partial<ThemeSettings>) => request<ThemeSettings>("PUT", "/theme-settings", data),
  },
  typographySettings: {
    get: () => request<TypographySettings>("GET", "/typography-settings"),
    update: (data: Partial<TypographySettings>) => request<TypographySettings>("PUT", "/typography-settings", data),
  },
  seoSettings: {
    get: () => request<SeoSettings>("GET", "/seo-settings"),
    update: (data: Partial<SeoSettings>) => request<SeoSettings>("PUT", "/seo-settings", data),
  },
  sectionSettings: {
    list: () => request<SectionSetting[]>("GET", "/section-settings"),
    update: (id: string, data: Partial<SectionSetting>) => request<SectionSetting>("PUT", `/section-settings/${id}`, data),
    reorder: (items: { id: string; sort_order: number }[]) => request("POST", "/section-settings/reorder", { items }),
  },
  images: {
    delete: (id: string) => request("DELETE", `/images/${id}`),
    reorder: (orderedIds: string[]) => request("POST", "/images/reorder", { ordered_ids: orderedIds }),
  },
  siteSettings: {
    get: () => request<SiteSettings>("GET", "/site-settings"),
    update: (data: Partial<SiteSettings>) => request<SiteSettings>("PUT", "/site-settings", data),
    updateLanguage: (data: Partial<SiteSettings>) => request<SiteSettings>("PATCH", "/site-settings/language", data),
  },
  seed: {
    run: () => request<{ summary: Record<string, number>; errors: string[] }>("POST", "/seed"),
  },
  cv: {
    getSettings: () => request<CvSettings>("GET", "/cv/settings"),
    updateSettings: (data: { objectPath: string; fileName: string }) =>
      request<CvSettings>("PUT", "/cv/settings", data),
    deleteSettings: () => request<void>("DELETE", "/cv/settings"),
  },
  preview: {
    entity: (entityType: string, entityId: string) =>
      request<Record<string, unknown>>("GET", `/preview/${entityType}/${entityId}`),
  },
  audit: {
    list: (opts?: { entityType?: string; entityId?: string; limit?: number; offset?: number }) => {
      const params = new URLSearchParams();
      if (opts?.entityType) params.set("entityType", opts.entityType);
      if (opts?.entityId) params.set("entityId", opts.entityId);
      if (opts?.limit) params.set("limit", String(opts.limit));
      if (opts?.offset) params.set("offset", String(opts.offset));
      const qs = params.toString();
      return request<{ data: unknown[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>("GET", `/audit${qs ? `?${qs}` : ""}`);
    },
  },
  analytics: {
    stats: (days?: number) => request<{
      days: number;
      pageViews: Array<{ date: string; count: number }>;
      topProjects: Array<{ slug: string; title: string; views: number }>;
      topPosts: Array<{ slug: string; title: string; views: number }>;
      cvDownloads: number;
      contactClicks: number;
      totalViews: number;
      messages: Array<{ date: string; total: number; unread: number }>;
    }>("GET", `/analytics${days ? `?days=${days}` : ""}`),
  },
  ai: {
    generateDescription: (techStack: string[], title?: string) =>
      request<{ description: string }>("POST", "/ai-assistant/generate-description", { techStack, title }),
    suggestCategories: (skillName: string) =>
      request<{ categories: string[] }>("POST", "/ai-assistant/suggest-categories", { skillName }),
    suggestTags: (techStack: string[], category?: string) =>
      request<{ tags: string[] }>("POST", "/ai-assistant/suggest-tags", { techStack, category }),
    analyzeContent: (content: string, contentType: "hero" | "about" | "project") =>
      request<{ score: number; suggestions: string[]; strengths: string[] }>("POST", "/ai-assistant/analyze-content", { content, contentType }),
  },
};
