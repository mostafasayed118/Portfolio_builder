import type {
  HeroContent, AboutContent, Skill, Project, Experience,
  Certification, Message, ContactInfo, ThemeSettings,
  TypographySettings, SeoSettings, SectionSetting, SiteSettings,
} from "@workspace/supabase/types";
import { getClerkToken } from "./auth-token";

const API_BASE = import.meta.env.VITE_API_URL;
if (!API_BASE && import.meta.env.PROD) {
  console.warn("VITE_API_URL is not set in production - using fallback");
}
const apiBase = API_BASE ?? "http://localhost:3001";
const ADMIN_API_KEY = import.meta.env.VITE_ADMIN_API_KEY as string | undefined;

async function getCsrfToken(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${apiBase}/api/v1/csrf-token`, {
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`CSRF fetch failed (${res.status})`);
    const data = await res.json();
    if (!data.csrfToken) throw new Error("No CSRF token in response");
    return data.csrfToken;
  } catch (err) {
    clearTimeout(timeoutId);
    throw new Error("Unable to establish secure session — please refresh the page");
  }
}

type ApiResult<T> =
  | { success: true; data?: T; count?: number }
  | { success: false; message: string };

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const clerkToken = await getClerkToken();
  if (clerkToken) {
    headers["Authorization"] = `Bearer ${clerkToken}`;
  } else if (ADMIN_API_KEY) {
    // Fallback to API key auth for local dev when Clerk token is unavailable
    headers["x-admin-key"] = ADMIN_API_KEY;
  }

  if (body && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
    const csrfToken = await getCsrfToken();
    headers["x-csrf-token"] = csrfToken;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${apiBase}/api/v1/admin${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try {
        const errData = await res.json();
        if (errData.message) message = errData.message;
        else if (errData.errors) {
          const fieldErrors = Object.entries(errData.errors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join("; ");
          message = fieldErrors || message;
        }
      } catch { /* response wasn't JSON */ }
      return { success: false, message };
    }
    return await res.json();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    if (message.includes("aborted")) {
      return { success: false, message: "Request timed out" };
    }
    return { success: false, message };
  }
}

export interface User {
  id: string;
  clerk_id: string;
  email: string;
  name: string;
  role: "user" | "superadmin";
  created_at: string;
}

function userIdParam(userId?: string): string {
  return userId ? `?userId=${encodeURIComponent(userId)}` : "";
}

export const api = {
  users: {
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
  messages: {
    list: (userId?: string) => request<Message[]>("GET", `/messages${userIdParam(userId)}`),
    unreadCount: (userId?: string) => request<number>("GET", `/messages/unread-count${userIdParam(userId)}`),
    markRead: (id: string) => request("PATCH", `/messages/${id}/read`),
    markUnread: (id: string) => request("PATCH", `/messages/${id}/unread`),
    delete: (id: string) => request("DELETE", `/messages/${id}`),
    bulkDelete: (ids: string[]) => request("POST", "/messages/bulk-delete", { ids }),
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
  siteSettings: {
    get: () => request<SiteSettings>("GET", "/site-settings"),
    update: (data: Partial<SiteSettings>) => request<SiteSettings>("PUT", "/site-settings", data),
    updateLanguage: (data: Partial<SiteSettings>) => request<SiteSettings>("PATCH", "/site-settings/language", data),
  },
  seed: {
    run: () => request<{ summary: Record<string, number>; errors: string[] }>("POST", "/seed"),
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
