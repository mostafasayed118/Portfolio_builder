const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/api/v1/csrf-token`, { credentials: "include" });
  const data = await res.json();
  return data.csrfToken;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ success: true; data?: T; count?: number } | { success: false; message: string }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const clerkToken = (window as any).__clerk?.session?.getToken();
  if (clerkToken) {
    headers["Authorization"] = `Bearer ${clerkToken}`;
  }

  if (body && (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE")) {
    const csrfToken = await getCsrfToken();
    headers["x-csrf-token"] = csrfToken;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/admin${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });
    return await res.json();
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Network error" };
  }
}

export const api = {
  hero: {
    get: () => request<any>("GET", "/hero"),
    update: (data: any) => request("PUT", "/hero", data),
  },
  about: {
    get: () => request<any>("GET", "/about"),
    update: (data: any) => request("PUT", "/about", data),
  },
  skills: {
    list: () => request<any[]>("GET", "/skills"),
    create: (data: any) => request("POST", "/skills", data),
    update: (id: string, data: any) => request("PUT", `/skills/${id}`, data),
    delete: (id: string) => request("DELETE", `/skills/${id}`),
  },
  projects: {
    list: () => request<any[]>("GET", "/projects"),
    create: (data: any) => request("POST", "/projects", data),
    update: (id: string, data: any) => request("PUT", `/projects/${id}`, data),
    delete: (id: string) => request("DELETE", `/projects/${id}`),
  },
  experience: {
    list: () => request<any[]>("GET", "/experience"),
    create: (data: any) => request("POST", "/experience", data),
    update: (id: string, data: any) => request("PUT", `/experience/${id}`, data),
    delete: (id: string) => request("DELETE", `/experience/${id}`),
  },
  certifications: {
    list: () => request<any[]>("GET", "/certifications"),
    create: (data: any) => request("POST", "/certifications", data),
    update: (id: string, data: any) => request("PUT", `/certifications/${id}`, data),
    delete: (id: string) => request("DELETE", `/certifications/${id}`),
  },
  messages: {
    list: () => request<any[]>("GET", "/messages"),
    unreadCount: () => request<any>("GET", "/messages/unread-count"),
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
    get: () => request<any>("GET", "/contact-info"),
    update: (data: any) => request("PUT", "/contact-info", data),
  },
  themeSettings: {
    get: () => request<any>("GET", "/theme-settings"),
    update: (data: any) => request("PUT", "/theme-settings", data),
  },
  typographySettings: {
    get: () => request<any>("GET", "/typography-settings"),
    update: (data: any) => request("PUT", "/typography-settings", data),
  },
  seoSettings: {
    get: () => request<any>("GET", "/seo-settings"),
    update: (data: any) => request("PUT", "/seo-settings", data),
  },
  sectionSettings: {
    list: () => request<any[]>("GET", "/section-settings"),
    update: (id: string, data: any) => request("PUT", `/section-settings/${id}`, data),
    reorder: (items: { id: string; sort_order: number }[]) => request("POST", "/section-settings/reorder", { items }),
  },
  siteSettings: {
    get: () => request<any>("GET", "/site-settings"),
    update: (data: any) => request("PUT", "/site-settings", data),
    updateLanguage: (data: any) => request("PATCH", "/site-settings/language", data),
  },
};
