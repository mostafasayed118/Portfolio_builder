/**
 * Admin API surface — a thin namespace adapter over the generated
 * `@workspace/api-client-react` client.
 *
 * Endpoint definitions, URL construction, and request/response types are all
 * generated from `lib/api-spec/openapi.yaml` (see `pnpm --filter
 * @workspace/api-spec codegen`). This file only maps those generated functions
 * onto the `api.<resource>.<action>` namespace the admin app and its test
 * mocks already use. It contains no endpoint URLs, no request types, and no
 * fetch logic.
 *
 * Transport concerns (API origin, Clerk bearer token, CSRF injection,
 * timeout, 401 auto-refresh, navigation abort) live in the generated client's
 * mutator and are wired up in `api-client-setup.ts`.
 */
import {
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listExperience,
  createExperience,
  updateExperience,
  deleteExperience,
  listCertifications,
  createCertification,
  updateCertification,
  deleteCertification,
  listPosts,
  createPost,
  updatePost,
  deletePost,
  listMessages,
  unreadMessageCount,
  markMessageRead,
  markMessageUnread,
  markAllMessagesRead,
  archiveMessage,
  unarchiveMessage,
  deleteMessage,
  replyMessage,
  bulkDeleteMessages,
  bulkArchiveMessages,
  bulkUnarchiveMessages,
  archiveTestSubmissions,
  restoreAllArchivedMessages,
  getHero,
  updateHero,
  getAbout,
  updateAbout,
  getContactInfo,
  updateContactInfo,
  getThemeSettings,
  updateThemeSettings,
  getTypographySettings,
  updateTypographySettings,
  getSeoSettings,
  updateSeoSettings,
  listThemePresets,
  createThemePreset,
  updateThemePreset,
  deleteThemePreset,
  listSectionSettings,
  updateSectionSetting,
  reorderSectionSettings,
  getSiteSettings,
  updateSiteSettings,
  updateSiteLanguage,
  getCurrentUser,
  listUsers,
  updateUserRole,
  getCvSettings,
  updateCvSettings,
  deleteCvSettings,
  listAudit,
  getAnalytics,
  previewEntity,
  seedData,
  generateDescription,
  suggestCategories,
  suggestTags,
  analyzeContent,
  submitContactForm,
  deleteImage,
  reorderImages,
} from "@workspace/api-client-react";

/** Map an optional viewing-user id to the generated `{ userId }` query param. */
function userIdParam(userId?: string): { userId: string } | undefined {
  return userId ? { userId } : undefined;
}

export const api = {
  users: {
    me: () => getCurrentUser(),
    list: () => listUsers(),
    updateRole: (id: string, role: "user" | "superadmin") => updateUserRole(id, { role }),
  },
  hero: {
    get: () => getHero(),
    update: (data: Parameters<typeof updateHero>[0]) => updateHero(data),
  },
  about: {
    get: () => getAbout(),
    update: (data: Parameters<typeof updateAbout>[0]) => updateAbout(data),
  },
  skills: {
    list: (userId?: string) => listSkills(userIdParam(userId)),
    create: (data: Parameters<typeof createSkill>[0]) => createSkill(data),
    update: (id: string, data: Parameters<typeof updateSkill>[1]) => updateSkill(id, data),
    delete: (id: string) => deleteSkill(id),
  },
  projects: {
    list: (userId?: string) => listProjects(userIdParam(userId)),
    create: (data: Parameters<typeof createProject>[0]) => createProject(data),
    update: (id: string, data: Parameters<typeof updateProject>[1]) => updateProject(id, data),
    delete: (id: string) => deleteProject(id),
  },
  experience: {
    list: (userId?: string) => listExperience(userIdParam(userId)),
    create: (data: Parameters<typeof createExperience>[0]) => createExperience(data),
    update: (id: string, data: Parameters<typeof updateExperience>[1]) => updateExperience(id, data),
    delete: (id: string) => deleteExperience(id),
  },
  certifications: {
    list: (userId?: string) => listCertifications(userIdParam(userId)),
    create: (data: Parameters<typeof createCertification>[0]) => createCertification(data),
    update: (id: string, data: Parameters<typeof updateCertification>[1]) => updateCertification(id, data),
    delete: (id: string) => deleteCertification(id),
  },
  posts: {
    list: (userId?: string) => listPosts(userIdParam(userId)),
    create: (data: Parameters<typeof createPost>[0]) => createPost(data),
    update: (id: string, data: Parameters<typeof updatePost>[1]) => updatePost(id, data),
    delete: (id: string) => deletePost(id),
  },
  messages: {
    /**
     * `status` mirrors the list endpoint's server-side filter — omit or pass
     * `"all"` for the default view; `"unread"`/`"read"`/`"archived"` page
     * over exactly those rows instead of a client-side slice of page one.
     * `preset` applies one of the saved compound views and is mutually
     * exclusive with `status`. `limit`/`offset` drive server-side pagination
     * (the admin fetches every matching row in batches of 200, the server's
     * MAX_LIMIT, so a view never stops at the default 50-row page).
     */
    list: (
      userId?: string,
      status?: "unread" | "read" | "archived" | "all",
      limit?: number,
      offset?: number,
      preset?: "unread_today" | "unread_or_archived" | "needs_reply",
    ) =>
      listMessages({
        ...userIdParam(userId),
        ...(status && status !== "all" ? { status } : {}),
        ...(preset ? { preset } : {}),
        ...(limit !== undefined ? { limit } : {}),
        ...(offset !== undefined ? { offset } : {}),
      }),
    unreadCount: (userId?: string) => unreadMessageCount(userIdParam(userId)),
    markRead: (id: string) => markMessageRead(id),
    markUnread: (id: string) => markMessageUnread(id),
    markAllRead: () => markAllMessagesRead(),
    archive: (id: string) => archiveMessage(id),
    unarchive: (id: string) => unarchiveMessage(id),
    delete: (id: string) => deleteMessage(id),
    bulkDelete: (ids: string[]) => bulkDeleteMessages({ ids }),
    bulkArchive: (ids: string[]) => bulkArchiveMessages({ ids }),
    bulkUnarchive: (ids: string[]) => bulkUnarchiveMessages({ ids }),
    archiveTestSubmissions: () => archiveTestSubmissions(),
    restoreAllArchived: () => restoreAllArchivedMessages(),
    reply: (id: string, reply: string) => replyMessage(id, { reply }),
  },
  contact: {
    submit: (data: Parameters<typeof submitContactForm>[0]) => submitContactForm(data),
  },
  images: {
    delete: (id: string) => deleteImage(id),
    reorder: (orderedIds: string[]) => reorderImages({ ordered_ids: orderedIds }),
  },
  contactInfo: {
    get: () => getContactInfo(),
    update: (data: Parameters<typeof updateContactInfo>[0]) => updateContactInfo(data),
  },
  themeSettings: {
    get: () => getThemeSettings(),
    update: (data: Parameters<typeof updateThemeSettings>[0]) => updateThemeSettings(data),
  },
  themePresets: {
    list: (userId?: string) => listThemePresets(userIdParam(userId)),
    create: (data: Parameters<typeof createThemePreset>[0]) => createThemePreset(data),
    update: (id: string, data: Parameters<typeof updateThemePreset>[1]) => updateThemePreset(id, data),
    delete: (id: string) => deleteThemePreset(id),
  },
  typographySettings: {
    get: () => getTypographySettings(),
    update: (data: Parameters<typeof updateTypographySettings>[0]) => updateTypographySettings(data),
  },
  seoSettings: {
    get: () => getSeoSettings(),
    update: (data: Parameters<typeof updateSeoSettings>[0]) => updateSeoSettings(data),
  },
  sectionSettings: {
    list: () => listSectionSettings(),
    update: (id: string, data: Parameters<typeof updateSectionSetting>[1]) => updateSectionSetting(id, data),
    reorder: (items: Parameters<typeof reorderSectionSettings>[0]["items"]) =>
      reorderSectionSettings({ items }),
  },
  siteSettings: {
    get: () => getSiteSettings(),
    update: (data: Parameters<typeof updateSiteSettings>[0]) => updateSiteSettings(data),
    updateLanguage: (data: Parameters<typeof updateSiteLanguage>[0]) => updateSiteLanguage(data),
  },
  seed: {
    run: () => seedData(),
  },
  cv: {
    getSettings: () => getCvSettings(),
    updateSettings: (data: Parameters<typeof updateCvSettings>[0]) => updateCvSettings(data),
    deleteSettings: () => deleteCvSettings(),
  },
  preview: {
    entity: (entityType: string, entityId: string) => previewEntity(entityType, entityId),
  },
  audit: {
    list: (opts?: Parameters<typeof listAudit>[0]) => listAudit(opts),
  },
  analytics: {
    stats: (days?: number) => getAnalytics(days ? { days } : undefined),
  },
  ai: {
    generateDescription: (techStack: string[], title?: string) =>
      generateDescription({ techStack, title }),
    suggestCategories: (skillName: string) => suggestCategories({ skillName }),
    suggestTags: (techStack: string[], category?: string) => suggestTags({ techStack, category }),
    analyzeContent: (content: string, contentType: "hero" | "about" | "project") =>
      analyzeContent({ content, contentType }),
  },
};

export { beginRequestGroup, abortAllRequests } from "@workspace/api-client-react";
export { getCsrfToken } from "./csrf";
export type { User } from "@workspace/supabase/types";
