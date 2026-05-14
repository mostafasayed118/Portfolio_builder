# Portfolio Fixer - Comprehensive Memory Bank

> **Generated:** 2026-05-12
> **Project Type:** Full-stack Portfolio CMS with Convex Backend
> **Primary User:** Mustafa Sayed (Data Engineer, Cairo, Egypt)

---

## 1. Core Functionality Overview

### 1.1 Dual-Artifact Architecture

| Artifact           | Path                   | Purpose                                 | Status      |
| ------------------ | ---------------------- | --------------------------------------- | ----------- |
| Portfolio Frontend | `artifacts/portfolio/` | Static React SPA with TailwindCSS       | Implemented |
| Convex Backend     | `convex/`              | Serverless database + mutations/queries | Implemented |

### 1.2 Data Flow Architecture

```
Static React Frontend (Vite)
       ↓ (reads static data from src/data/portfolio.ts)
Static Content (no backend integration currently)

↓ Separately ↓

Convex Backend (convex/)
       ↓ (database tables)
All CMS data (theme, skills, projects, experience, etc.)
```

**Note:** The portfolio frontend is a static site that doesn't currently consume the Convex API. The Convex backend provides a complete CMS for managing portfolio content programmatically.

---

## 2. Data Models (Convex Schema)

### 2.1 Core Tables

#### `themeSettings`

| Field                | Type              | Default       | Description                    |
| -------------------- | ----------------- | ------------- | ------------------------------ |
| mode                 | "light" \| "dark" | "light"       | Theme mode                     |
| lightPrimary         | string            | "204 92% 42%" | Light mode primary color (HSL) |
| lightAccent          | string            | "189 90% 38%" | Light mode accent color        |
| lightBackground      | string            | "220 30% 97%" | Light background               |
| lightForeground      | string            | "222 40% 10%" | Light foreground               |
| lightCard            | string            | "0 0% 100%"   | Light card background          |
| lightBorder          | string            | "220 18% 84%" | Light border                   |
| lightMuted           | string            | "220 20% 91%" | Light muted                    |
| lightMutedForeground | string            | "220 15% 42%" | Light muted foreground         |
| lightRing            | string            | "204 92% 45%" | Light ring color               |
| darkPrimary          | string            | "204 92% 62%" | Dark mode primary              |
| darkAccent           | string            | "189 95% 53%" | Dark mode accent               |
| darkBackground       | string            | "222 48% 6%"  | Dark background                |
| darkForeground       | string            | "210 30% 96%" | Dark foreground                |
| darkCard             | string            | "222 40% 9%"  | Dark card                      |
| darkBorder           | string            | "220 22% 18%" | Dark border                    |
| darkMuted            | string            | "222 32% 12%" | Dark muted                     |
| darkMutedForeground  | string            | "215 18% 72%" | Dark muted foreground          |
| darkRing             | string            | "204 92% 62%" | Dark ring                      |
| radius               | string            | "0.9rem"      | Border radius                  |
| updatedAt            | number            | -             | Timestamp                      |

#### `typographySettings`

| Field             | Type    | Default       |
| ----------------- | ------- | ------------- |
| bodyFont          | string  | "Spline Sans" |
| displayFont       | string  | "Unbounded"   |
| bodyFontUrl       | string? | -             |
| displayFontUrl    | string? | -             |
| baseFontSize      | string  | "16px"        |
| lineHeight        | string  | "1.6"         |
| letterSpacing     | string  | "0em"         |
| headingScale      | string  | "1.25"        |
| fontWeightBody    | string  | "400"         |
| fontWeightHeading | string  | "700"         |
| updatedAt         | number  | -             |

#### `siteSettings`

| Field         | Type              | Default                                        |
| ------------- | ----------------- | ---------------------------------------------- |
| siteName      | string            | "Mustafa Sayed"                                |
| siteTagline   | string            | "Data Engineer"                                |
| footerText    | string            | "Built with ❤️ and a lot of coffee."           |
| copyrightText | string            | "© {year} Mustafa Sayed. All rights reserved." |
| logoText      | string            | "MS"                                           |
| defaultTheme  | "light" \| "dark" | "dark"                                         |
| updatedAt     | number            | -                                              |

#### `seoSettings`

| Field           | Type   |
| --------------- | ------ |
| title           | string |
| description     | string |
| keywords        | string |
| ogTitle         | string |
| ogDescription   | string |
| ogImage?        | string |
| canonicalUrl    | string |
| twitterCard     | string |
| twitterCreator? | string |
| updatedAt       | number |

#### `heroContent`

| Field       | Type     | Default                                                                  |
| ----------- | -------- | ------------------------------------------------------------------------ |
| heading     | string   | "Hi, I'm"                                                                |
| name        | string   | "Mustafa Sayed"                                                          |
| roles       | string[] | ["Data Engineer", "ETL Developer", "Pipeline Architect", "BI Developer"] |
| description | string   | Bio description                                                          |
| githubUrl   | string   | "https://github.com/mustafasayed"                                        |
| linkedinUrl | string   | "https://linkedin.com/in/mustafasayed"                                   |
| email       | string   | "mustafasayedsaeed@outlook.com"                                          |
| available   | boolean  | true                                                                     |
| cvFileName? | string   | "Mustafa_Sayed_Resume.pdf"                                               |
| isPublished | boolean  | true                                                                     |
| updatedAt   | number   | -                                                                        |

#### `aboutContent`

| Field             | Type                 |
| ----------------- | -------------------- |
| bio1              | string               |
| bio2              | string               |
| location          | string               |
| yearsOfExperience | number               |
| degree            | string               |
| school            | string               |
| grade             | string               |
| educationYears    | string               |
| languages         | `{ lang: string, level: string, pct: number }[]` |
| isPublished       | boolean              |
| updatedAt         | number               |

#### `skills` (Indexed by category)

| Field       | Type           |
| ----------- | -------------- |
| name        | string         |
| category    | string         |
| proficiency | number (0-100) |
| icon?       | string         |
| sortOrder?  | number         |
| isVisible?  | boolean        |
| createdAt?  | number         |
| updatedAt   | number         |

#### `projects`

| Field        | Type     |
| ------------ | -------- |
| title        | string   |
| description  | string   |
| techStack?   | string[] |
| category?    | string   |
| featured?    | boolean  |
| githubUrl?   | string   |
| liveUrl?     | string   |
| slug?        | string   |
| metrics?     | string[] |
| sortOrder?   | number   |
| isPublished? | boolean  |
| imageUrl?    | string   |
| tags?        | string[] |
| createdAt?   | number   |
| updatedAt    | number   |

#### `experience`

| Field        | Type                                           |
| ------------ | ---------------------------------------------- |
| title        | string                                         |
| company      | string                                         |
| location     | string                                         |
| period       | string                                         |
| description  | string[]                                       |
| technologies | string[]                                       |
| type         | "internship" \| "certification" \| "volunteer" |
| sortOrder?   | number                                         |
| isPublished? | boolean                                        |
| current?     | boolean                                        |
| createdAt?   | number                                         |
| updatedAt    | number                                         |
| order?       | number                                         |

#### `certifications`

| Field          | Type     |
| -------------- | -------- |
| title          | string   |
| issuer         | string   |
| issuerLogo?    | string   |
| date           | string   |
| dateSort?      | string   |
| category?      | string   |
| credentialUrl? | string   |
| credentialId?  | string   |
| sortOrder?     | number   |
| isPublished?   | boolean  |
| skills?        | string[] |
| createdAt?     | number   |
| updatedAt      | number   |

#### `contactInfo`

| Field               | Type              |
| ------------------- | ----------------- |
| email?              | string            |
| phone?              | string            |
| location?           | string            |
| address?            | string            |
| github?             | string            |
| linkedin?           | string            |
| whatsapp?           | string            |
| mapEmbedUrl?        | string            |
| availabilityStatus? | string            |
| workingHours?       | string            |
| socialLinks?        | {platform, url}[] |
| updatedAt           | number            |

#### `messages` (Contact Form)

| Field            | Type                              | Index      |
| ---------------- | --------------------------------- | ---------- |
| name             | string                            | -          |
| email            | string                            | -          |
| message          | string                            | -          |
| status?          | "unread" \| "read" \| "archived"  | by_status  |
| replyEmailDraft? | string                            | -          |
| repliedAt?       | number                            | -          |
| createdAt        | number                            | by_created |

#### `sectionSettings` (Indexed)

| Field     | Type    | Index           |
| --------- | ------- | --------------- |
| key       | string  | by_key, by_sort |
| label     | string  | -               |
| isVisible | boolean | -               |
| sortOrder | number  | -               |
| updatedAt | number  | -               |

#### `auditLogs` (Indexed)

| Field      | Type   |
| ---------- | ------ |
| entityType | string |
| entityId   | string |
| action     | string |
| before?    | any    |
| after?     | any    |
| summary    | string |
| userLabel? | string |
| createdAt  | number |

> **Indexes:** `by_entity` (entityType, entityId), `by_created` (createdAt)

#### `themePresets` (Indexed)

| Field           | Type              |
| --------------- | ----------------- |
| name            | string            |
| slug            | string            |
| isActive        | boolean           |
| isDefault?      | boolean           |
| mode            | "light" \| "dark" |
| light*/dark*    | string            |
| surfaceStyle?   | string            |
| shadowStyle?    | string            |
| buttonStyle?    | string            |
| density?        | string            |
| createdAt       | number            |
| updatedAt       | number            |

> **Indexes:** `by_slug` (slug), `by_active` (isActive)
>
> **Note:** Includes all `light*` and `dark*` color fields from `themeSettings` plus `radius`.

#### `typographyPresets` (Indexed)

| Field             | Type    |
| ----------------- | ------- |
| name              | string  |
| slug              | string  |
| isActive          | boolean |
| bodyFont          | string  |
| headingFont       | string  |
| bodyFontUrl?      | string  |
| headingFontUrl?   | string  |
| baseFontSize      | string  |
| lineHeight        | string  |
| letterSpacing     | string  |
| headingScale      | string  |
| fontWeightBody    | string  |
| fontWeightHeading | string  |
| createdAt         | number  |
| updatedAt         | number  |

> **Indexes:** `by_slug` (slug), `by_active` (isActive)

#### `sectionVariants` (Indexed)

| Field        | Type    |
| ------------ | ------- |
| sectionKey   | string  |
| variantKey   | string  |
| label        | string  |
| isActive     | boolean |
| config       | any     |
| previewNote? | string  |
| updatedAt    | number  |

> **Indexes:** `by_section` (sectionKey), `by_active` (sectionKey, isActive)

#### `analyticsEvents` (Indexed)

| Field       | Type   |
| ----------- | ------ |
| type        | string |
| path?       | string |
| sectionKey? | string |
| projectId?  | string |
| presetId?   | string |
| referrer?   | string |
| device?     | string |
| createdAt   | number |

> **Indexes:** `by_type` (type), `by_created` (createdAt)

#### `cvSettings`

| Field      | Type   |
| ---------- | ------ |
| objectPath | string |
| fileName   | string |
| updatedAt  | number |

#### `contentSnapshots` (Indexed)

| Field      | Type   |
| ---------- | ------ |
| entityType | string |
| entityId   | string |
| version    | number |
| data       | any    |
| changedBy? | string |
| createdAt  | number |

> **Indexes:** `by_entity` (entityType, entityId), `by_version` (entityType, entityId, version)

#### `contentHealthReports` (Indexed)

| Field           | Type   |
| --------------- | ------ |
| scope           | string |
| issues          | any    |
| criticalCount   | number |
| warningCount    | number |
| suggestionCount | number |
| generatedAt     | number |

> **Indexes:** `by_scope` (scope), `by_generated` (generatedAt)

---

## 3. API Endpoints

### 3.1 Hero Content

| Function       | Type     | Args        | Returns     | Auth  |
| -------------- | -------- | ----------- | ----------- | ----- |
| `get`          | query    | {}          | heroContent | No    |
| `upsert`       | mutation | hero fields | Id          | Admin |
| `seedDefaults` | mutation | {}          | Id          | Admin |

### 3.2 About Content

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `get`          | query    | No    |
| `upsert`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.3 Skills

| Function         | Type     | Auth  |
| ---------------- | -------- | ----- |
| `list`           | query    | No    |
| `listByCategory` | query    | No    |
| `create`         | mutation | Admin |
| `update`         | mutation | Admin |
| `remove`         | mutation | Admin |
| `seedDefaults`   | mutation | Admin |

### 3.4 Projects

| Function        | Type     | Auth  |
| --------------- | -------- | ----- |
| `list`          | query    | No    |
| `listPublished` | query    | No    |
| `create`        | mutation | Admin |
| `update`        | mutation | Admin |
| `remove`        | mutation | Admin |
| `seedDefaults`  | mutation | Admin |

### 3.5 Experience

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `list`         | query    | No    |
| `create`       | mutation | Admin |
| `update`       | mutation | Admin |
| `remove`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.6 Certifications

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `list`         | query    | No    |
| `create`       | mutation | Admin |
| `update`       | mutation | Admin |
| `remove`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.7 Theme Settings

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `get`          | query    | No    |
| `upsert`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.8 Typography Settings

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `get`          | query    | No    |
| `upsert`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.9 Site Settings

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `get`          | query    | No    |
| `upsert`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.10 SEO Settings

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `get`          | query    | No    |
| `upsert`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.11 Contact Info

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `get`          | query    | No    |
| `upsert`       | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.12 Messages (Contact Form)

| Function      | Type     | Auth        |
| ------------- | -------- | ----------- |
| `list`        | query    | No          |
| `unreadCount` | query    | No          |
| `send`        | mutation | No (public) |
| `markRead`    | mutation | Admin       |
| `markAllRead` | mutation | Admin       |
| `remove`      | mutation | Admin       |
| `replyEmail`  | mutation | Admin       |

### 3.13 Section Settings

| Function       | Type     | Auth  |
| -------------- | -------- | ----- |
| `list`         | query    | No    |
| `update`       | mutation | Admin |
| `reorder`      | mutation | Admin |
| `seedDefaults` | mutation | Admin |

### 3.14 CV Settings

| Function    | Type     | Auth  |
| ----------- | -------- | ----- |
| `getLatest` | query    | No    |
| `upsert`    | mutation | Admin |

### 3.15 Audit Logs

| Function       | Type     | Auth                   |
| -------------- | -------- | ---------------------- |
| `list`         | query    | Admin, optional filter |
| `listByEntity` | query    | Admin                  |
| `log`          | mutation | Admin                  |

### 3.16 Theme Presets

| Function    | Type     | Auth  |
| ----------- | -------- | ----- |
| `list`      | query    | No    |
| `getActive` | query    | No    |
| `create`    | mutation | Admin |
| `update`    | mutation | Admin |
| `remove`    | mutation | Admin |
| `setActive` | mutation | Admin |

### 3.17 Typography Presets

| Function    | Type     | Auth  |
| ----------- | -------- | ----- |
| `list`      | query    | No    |
| `getActive` | query    | No    |
| `create`    | mutation | Admin |
| `setActive` | mutation | Admin |
| `remove`    | mutation | Admin |

### 3.18 Seed Function

| Function  | Type     | Auth  | Returns             |
| --------- | -------- | ----- | ------------------- |
| `seedAll` | mutation | Admin | `{ success: true }` |

---

## 4. Authentication & Authorization

### 4.1 Provider Configuration

- **Provider:** Clerk
- **Domain:** `https://nearby-koi-38.clerk.accounts.dev`
- **Application ID:** `convex`
- **Integration:** JWT-based authentication via Convex Auth

### 4.2 Admin Authorization

```typescript
// convex/lib/auth.ts
const ADMIN_EMAILS: string[] = [
  "mustafasayedsaeed@outlook.com",
  "mustafasayed20002@gmail.com",
];
```

**Mechanism:** `requireAdmin()` function validates that authenticated user's email is in the admin list. Throws `Error("Authentication required")` or `Error("Unauthorized: ...")` if not.

---

## 5. Environment Configuration

### 5.1 Convex Deployment

| Variable | Value                                      |
| -------- | ------------------------------------------ |
| Project  | `portfolio-cms`                            |
| Team     | `personal`                                 |
| URL      | `https://proficient-bass-377.convex.cloud` |
| Site URL | `https://proficient-bass-377.convex.site`  |

### 5.2 Environment Variables

```bash
# .env
VITE_CONVEX_URL=https://proficient-bass-377.convex.cloud
CLERK_JWT_ISSUER_DOMAIN=https://nearby-koi-38.clerk.accounts.dev
CONVEX_DEPLOY_KEY=dev:proficient-bass-377|...

# .env.local
CONVEX_DEPLOYMENT=dev:proficient-bass-377
CONVEX_URL=https://proficient-bass-377.convex.cloud
CONVEX_SITE_URL=https://proficient-bass-377.convex.site
```

---

## 6. Tech Stack

### 6.1 Backend

| Technology | Version | Purpose                         |
| ---------- | ------- | ------------------------------- |
| Convex     | ^1.17.4 | Serverless database + functions |
| Clerk      | -       | Authentication provider         |
| TypeScript | ~5.9.2  | Type safety                     |

### 6.2 Frontend (Portfolio Artifact)

| Technology            | Version   | Configured In     |
| --------------------- | --------- | ----------------- |
| React                 | 19.1.0    | catalog           |
| React DOM             | 19.1.0    | catalog           |
| Vite                  | ^7.3.2    | catalog           |
| TailwindCSS           | ^4.1.14   | catalog           |
| wouter                | ^3.3.5    | catalog (routing) |
| lucide-react          | ^0.545.0  | catalog           |
| @tanstack/react-query | ^5.90.21  | catalog           |
| framer-motion         | ^12.23.24 | catalog           |

### 6.3 Workspace Configuration

- **Package Manager:** pnpm
- **Minimum Release Age:** 1440 minutes (1 day supply-chain protection)
- **Node Version:** nodejs-24

---

## 7. Project Roadmap & Migration History

### 7.1 Migrations

Three migration files exist for field name changes:

1. `migrateFieldNames.ts` - `order` → `sortOrder`, `published` → `isPublished`
2. `cleanupLegacyFields.ts` - Removes legacy field references
3. `migrateFieldNamesFinal.ts` - Final cleanup of duplicate fields

### 7.2 Known Gaps

| Feature                                 | Priority | Effort |
| --------------------------------------- | -------- | ------ |
| Contact form wired to email service     | High     | Low    |
| Real credential verification URLs       | High     | Low    |
| GitHub/LinkedIn handle confirmation     | High     | Low    |
| OG image URL update post-deploy         | High     | Low    |
| Profile photo in place of "MS" monogram | Medium   | Low    |

---

## 8. Default Data Seed

### 8.1 Skills (23 total)

Categories: Languages, Big Data, Orchestration, Transformation, Cloud DW, Cloud, DevOps, BI & Viz, Databases, Python Libs

### 8.2 Projects (4 seeded)

1. Real-Time Sales Pipeline (Data Engineering, featured)
2. E-Commerce Analytics DWH (Data Warehouse, featured)
3. Customer 360 ETL (ETL)
4. Financial Data Quality Framework (Data Quality)

### 8.3 Experience (2 seeded)

1. Data Engineering Intern at Inova Technologies
2. Data Science Trainee at Egyptian Banks Company

### 8.4 Certifications (5 seeded)

1. AWS Certified Cloud Practitioner
2. Google Data Analytics Professional
3. dbt Fundamentals
4. Snowflake SnowPro Core
5. Apache Kafka Fundamentals

### 8.5 Section Settings (7 sections)

Hero, About, Skills, Projects, Experience, Certifications, Contact

---

## 9. File Structure Reference

```
portfolio-fixer/
├── convex/
│   ├── schema.ts              # Database schema
│   ├── auth.config.ts         # Clerk auth config
│   ├── convex.json            # Deployment config
│   ├── seed.ts                # Master seed function
│   ├── lib/
│   │   └── auth.ts            # Admin authorization
│   ├── aboutContent.ts
│   ├── heroContent.ts
│   ├── skills.ts
│   ├── projects.ts
│   ├── experience.ts
│   ├── certifications.ts
│   ├── themeSettings.ts
│   ├── typographySettings.ts
│   ├── siteSettings.ts
│   ├── seoSettings.ts
│   ├── contactInfo.ts
│   ├── messages.ts
│   ├── sectionSettings.ts
│   ├── cvSettings.ts
│   ├── auditLogs.ts
│   ├── themePresets.ts
│   ├── typographyPresets.ts
│   └── _generated/
│       ├── api.d.ts
│       ├── server.d.ts
│       └── dataModel.d.ts
├── artifacts/
│   └── portfolio/
│       ├── src/
│       │   ├── pages/
│       │   │   ├── Home.tsx
│       │   │   └── not-found.tsx
│       │   ├── lib/
│       │   │   ├── theme.tsx
│       │   │   ├── convex-provider.tsx
│       │   │   └── utils.ts
│       │   └── index.css
│       ├── vite.config.ts
│       └── index.html
├── lib/
│   └── api-client-react/
│       ├── src/
│       │   ├── generated/
│       │   │   ├── api.ts
│       │   │   └── api.schemas.ts
│       │   ├── custom-fetch.ts
│       │   └── index.ts
│       └── package.json
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.json
├── tsconfig.base.json
├── .env
├── .env.local
└── FEATURE_INVENTORY.md
```

---

## 10. Business Logic Rules

### 10.1 Content Publishing

- All content tables have `isPublished` boolean field
- Public queries filter by `isPublished: true` where applicable
- Published content is visible on the frontend

### 10.2 Theme & Typography Presets

- Only one preset can be active at a time
- `setActive` function deactivates all others when activating one

### 10.3 Skill Categories

- Indexed for efficient querying
- Proficiency values 0-100

### 10.4 Experience Types

- Valid values: "internship", "certification", "volunteer"
- Each type has distinct icon and color coding

### 10.5 Section Ordering

- `sortOrder` field controls display order
- `sectionSettings` provides drag-and-drop reordering

---

## 11. Security Considerations

1. **Admin-only mutations:** All write operations require admin authentication
2. **Public queries:** Read operations are generally public
3. **Public messages:** Contact form submissions don't require auth
4. **Supply chain protection:** 1-day minimum release age for npm packages
5. **No secrets in repo:** Deploy keys managed via Convex dashboard

---

## 12. Technical Debt & Known Issues

### 12.1 TypeScript Errors

| File                        | Line | Issue                                                                                                               |
| --------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------- |
| `convex/migrationVerify.ts` | 55   | `ctx.runQuery` uses string instead of `FunctionReference` - should use `internal.migrationVerify.countLegacyFields` |

### 12.2 Architecture Decoupling

- Portfolio frontend (`artifacts/portfolio/`) uses static data from `src/data/portfolio.ts`
- Convex backend provides CMS API but is not consumed by frontend
- This creates two separate data sources that need synchronization

### 12.3 Migration Files Orphaned Fields

- `experience`, `projects`, `certifications` tables may have both old (`order`, `published`) and new (`sortOrder`, `isPublished`) field names
- Migration functions exist but may need to be run manually
