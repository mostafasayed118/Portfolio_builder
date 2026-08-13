export const queryKeys = {
  hero: ["hero"] as const,
  about: ["about"] as const,
  skills: {
    all: ["skills"] as const,
    list: (userId?: string) => ["skills", userId] as const,
  },
  projects: {
    all: ["projects"] as const,
    list: (userId?: string) => ["projects", userId] as const,
  },
  experience: {
    all: ["experience"] as const,
    list: (userId?: string) => ["experience", userId] as const,
  },
  certifications: {
    all: ["certifications"] as const,
    list: (userId?: string) => ["certifications", userId] as const,
  },
  messages: {
    all: ["messages"] as const,
    list: (userId?: string) => ["messages", userId] as const,
    unreadCount: (userId?: string) => ["unreadCount", userId] as const,
  },
  contactInfo: ["contactInfo"] as const,
  themeSettings: ["themeSettings"] as const,
  typographySettings: ["typographySettings"] as const,
  seoSettings: ["seoSettings"] as const,
  sectionSettings: ["sectionSettings"] as const,
  siteSettings: ["siteSettings"] as const,
  cvSettings: ["cv-settings"] as const,
  arabicContentStatus: ["arabic-content-status"] as const,
  adminUsers: ["admin-users"] as const,
} as const;
