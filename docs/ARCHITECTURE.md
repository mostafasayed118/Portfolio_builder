# Architecture

## Overview

Monorepo with 3 apps sharing 2 library packages:

```
                    ┌─────────────────────┐
                    │     Supabase         │
                    │  (PostgreSQL + S3)   │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
        ┌─────┴─────┐  ┌──────┴──────┐  ┌──────┴──────┐
        │ Portfolio  │  │   Admin     │  │ API Server  │
        │  (React)   │  │   (React)   │  │  (Express)  │
        │ anon key   │  │ service key │  │ service key │
        │ public RLS │  │ bypass RLS  │  │ bypass RLS  │
        └─────┬─────┘  └──────┬──────┘  └──────┬──────┘
              │                │                │
        ┌─────┴─────┐  ┌──────┴──────┐         │
        │ @workspace│  │ @workspace  │         │
        │ /supabase │  │    /db      │         │
        │ client.ts │  │ skills.ts   │         │
        │ admin.ts  │  │ projects.ts │         │
        │ types.ts  │  │ messages.ts │         │
        └───────────┘  │ ... (14)    │         │
                       └─────────────┘         │
                                               │
                               ┌───────────────┘
                               │
                        ┌──────┴──────┐
                        │  Supabase   │
                        │  Storage    │
                        │ (cv bucket) │
                        └─────────────┘
```

## Data Flow

### Portfolio (Public)

```
Browser → React Query → @workspace/db → @workspace/supabase/client → Supabase REST API
                                                                         │
                                                                   RLS allows SELECT
                                                                   (public_read policies)
                                                                   RLS allows INSERT
                                                                   (messages only)
```

### Admin CMS

```
Browser → Clerk Auth → React Query → @workspace/db → @workspace/supabase/admin → Supabase REST API
                                                                                    │
                                                                              Service role key
                                                                              bypasses all RLS
```

### Admin CMS (via API Server — used for image uploads, AI assistant, CV, audit)

```
Browser → Clerk Auth → api-client.ts → /api/v1/* → Express → adminAuth middleware → ...
                                                                          │
                                                                   Clerk JWT verification
                                                                   + email allowlist check
```

### CV Download

```
Browser → /api/cv → Express → Supabase Storage (service role) → download as Buffer
           │
      Content-Disposition: attachment
           │
      Browser saves the file
```

## Auth Architecture (Admin App)

The admin auth layer has evolved through several iterations. The current architecture is multi-layered:

```
┌───────────────────────────────────────────────────────────────┐
│  ClerkProvider + ClerkAuthBridge                               │
│  (root of the provider tree, always mounted)                  │
│                                                               │
│  ├── setAuthTokenGetter(() => getToken({ template: 'admin' }))│
│  │   Sets the module-level token getter in auth-token.ts      │
│  │   Uses JWT template so the token includes the email claim  │
│  │                                                            │
│  ├── setAuthReady(isSignedIn)                                 │
│  │   Arms/disarms the auth-missing handler gate               │
│  │   Only arms when Clerk confirms isLoaded && isSignedIn     │
│  │                                                            │
│  ├── auth-missing handler (registered once, no cleanup)       │
│  │   Signs out + navigates to /sign-in on session expiry      │
│  │   Uses refs for latest clerkSignOut and navigate           │
│  │                                                            │
│  └── fetches /users/me for role (isSuperadmin check)          │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│  ProtectedRoute                                               │
│  (wraps all authenticated routes)                             │
│                                                               │
│  1. loading → "Loading…" screen                               │
│  2. !user → <Redirect to="/sign-in" /> (no redirectUrl)       │
│  3. !isAdmin → "Access Denied" screen with user's email       │
│  4. isAdmin → renders children                                │
│                                                               │
│  Extra: bfcache pageshow listener forces reload on restore     │
│  Extra: useEffect watches (isLoaded && !isSignedIn) → navigate │
└───────────────────────────────┬───────────────────────────────┘
                                │
┌───────────────────────────────▼───────────────────────────────┐
│  auth-token.ts (module-level singleton)                       │
│                                                               │
│  ├── getClerkToken()                                          │
│  │   Called by api-client.ts on every authenticated request   │
│  │   Waits up to 750ms for getter, retries once on null       │
│  │   Defensive shape check (isTokenLikelyValid)               │
│  │   No client-side JWT expiration check                      │
│  │                                                            │
│  ├── fireAuthMissing(reason)                                  │
│  │   Gated by _authReady                                      │
│  │   Debounced 1s per burst                                   │
│  │   Kill-switchable via AUTH_MISSING_KILL_SWITCH             │
│  │                                                            │
│  └── fireAuthMissingFromApiClient()                           │
│      Called from api-client.ts on server-side 401             │
│      Reason: "server_returned_401"                            │
└───────────────────────────────────────────────────────────────┘
```

## RLS Policy Strategy

**Public-read tables** (hero_content, skills, projects, etc.):

- `public_read` → `FOR SELECT USING (true)` — anyone can read
- `admin_*` → `FOR * USING (is_admin())` — only admin can modify

**Admin-only tables** (messages, cv_settings, etc.):

- `admin_*` → `FOR * USING (is_admin())` — admin only
- `public_insert_messages` → `FOR INSERT WITH CHECK (true)` — anyone can submit

The `is_admin()` function (migration 039+) checks `auth.jwt() ->> 'email'` against `app.admin_emails`. Falls back to legacy GUC only when `app.allow_guc_admin_fallback = 'on'`. Since admin uses service role key (bypasses RLS), the email check only applies to anonymous requests.

## Error Handling

### Server (API)

- **`lib/route-helpers.ts`** — shared pagination, user-scoping, `logSupabaseError`, `runCollectionQuery`
- **`lib/safe-error.ts`** — maps Supabase/PostgREST error codes to user-safe messages
- **`lib/api-response.ts`** — standard response helpers (`ok`, `created`, `badRequest`, `serverError`, etc.)
- **Middleware error handler** catches unhandled exceptions, returns JSON `{ success: false }`
- **Rate limiting** on all paths (general, admin, contact form, images)

### Client (Portfolio + Admin)

- **React Query** handles retry, caching, and error state
- **Error boundaries** at app root + per-page as needed
- **`ApiHealthCheck`** component (both apps) — pings `/api/healthz` on mount, shows banner if unreachable
- **Logging** via `@workspace/logging` — dev mode: console output; production: structured JSON `console.error`

## Key Architecture Decisions

### Navbar modularity

The portfolio `Navbar` component was split from 260→85 lines by extracting `ThemeSyncBanner`, `NavLinks`, and `MobileMenu` into `components/navbar/`. Each sub-component owns its markup and behavior, with the parent composing them.

### Seed route extracted

The admin seed endpoint (253→45 lines) was refactored by extracting data definitions and per-entity insertion logic into `api-server/src/lib/seed-data.ts`. Each entity (hero, about, skills, projects, experience, certifications) has a standalone `seed*` function, plus `softDeleteAll` for force mode.

### Auth middleware split

The 281-line `adminAuth` middleware had user-sync logic (`syncUserFromClerk`, `getDefaultAdminUser`, `isIgnorable`) extracted into `api-server/src/lib/user-sync.ts`, reducing the middleware to 120 lines.

### Auth hardening layers (June 2026)

Multiple auth fixes were applied in sequence:

1. **Kill switch** — emergency escape hatch for false-positive sign-outs
2. **Auth-ready gate** — prevents handler from firing during Clerk hydration
3. **bfcache defense** — `pageshow` listener forces reload on bfcache restore
4. **JWT template** — frontend uses `getToken({ template: 'admin' })` to include email claim
5. **Server-401 detection** — api-client fires handler when server returns 401
6. **No client-side JWT expiry check** — removed false-positive-prone `isTokenExpired()`
7. **Handler cleanup removed** — handler registered once app-wide, no cleanup that could leave a gap during re-renders

### Consistent error handling (queryOrThrow)

All 13 `lib/db` modules now use `queryOrThrow` from `lib/db/src/query.ts` instead of manual `if (error) throw error` patterns. Errors are annotated with `[table.operation]` prefix for easier log triage.

## App Structure — Feature-Based Organization

Both portfolio and admin apps use a **feature-based folder structure** under `src/features/`. Each feature owns its components, hooks, types, and barrel exports.

### Portfolio Features

```
features/
  hero/          HeroSection, HeroAvatar, HeroBackground, HeroTypewriter, HeroCTAButtons, HeroSocialLinks
  skills/        SkillsSection, SkillTag, SkillsSkeleton, useSkills hook
  projects/      ProjectsSection, ProjectCard, ProjectsSkeleton, useProjects hook
  contact/       ContactSection, ContactForm, ContactInfoPanel, useContact hook
  about/         AboutSection, AboutSkeleton, useAbout hook
  navbar/        ThemeSyncBanner, NavLinks, MobileMenu
```

### Admin Features

```
features/
  auth/              ProtectedRoute, SignInPage, AdminProviders
  hero-content/      HeroEditor, HeroLivePreview
  about-content/     AboutEditor, AboutLivePreview, InterestsEditor
  skills/            SkillsManager, useSkills hook, types
  projects/          ProjectsManager, ProjectEditor, useProjects hook
  experience/        ExperienceManager
  certifications/    CertificationsManager
  messages/          MessagesManager, MessageCard, MessageFilterBar, MessagePagination
  contact-info/      ContactManager
  cv/                CvManager, CvUploadZone
  settings/          ThemeManager, ThemeColorFields, ThemePreview, TypographyManager, TypographyPreview,
                     SiteSettingsManager, ArabicStatus, SeoManager, SectionOrderManager
```

### Shared Components (admin)

The following shared admin components live in `components/` and are used across multiple features:

- `AdminLayout`, `Header`, `Sidebar` — layout shell
- `SmartConfirmDialog`, `SmartEmptyState`, `SmartError` — reusable state components
- `ImageUploader`, `ImageWithFallback` — file handling
- `ErrorBoundary`, `PageState`, `ContentSkeleton` — loading/error states
- `StatsBar`, `StatsCard`, `SeedDialog` — dashboard widgets
- `CommandPalette`, `UserSwitcher`, `EditorSkeletons` — utility components

### Import Convention

All feature imports use barrel files:

```tsx
// ✅ Correct
import { HeroSection } from "@/features/hero";
import { SkillsManager } from "@/features/skills";

// ❌ Avoid
import HeroSection from "@/features/hero/components/HeroSection";
```

### 250-Line Rule

No single file should exceed 250 lines. Large files are split into:

- `Component.tsx` — main composition (under 100 lines)
- `SubComponent.tsx` — extracted UI blocks
- `hooks/useFeature.ts` — data fetching and business logic
- `types.ts` — TypeScript interfaces and constants

## Package Dependencies

```
@workspace/portfolio
  ├── @workspace/supabase (client)
  ├── @workspace/db
  └── @supabase/supabase-js

@workspace/admin
  ├── @workspace/supabase (admin)
  ├── @workspace/db
  ├── @su pabase/supabase-js
  └── @clerk/clerk-react

@workspace/api-server
  ├── @workspace/supabase (server)
  ├── @workspace/db
  └── @supabase/supabase-js
```
