# Product Specification Document — Portfolio-Fixer

> **Version:** 1.0  
> **Last Updated:** 2026-05-16  
> **Status:** Draft

---

## 1. Executive Summary

Portfolio-Fixer is a full-stack **portfolio Content Management System (CMS)** for Mustafa Sayed, a Data Engineer based in Cairo, Egypt. It serves dual purpose: a **public-facing portfolio website** to showcase skills, projects, experience, and certifications to recruiters and visitors, and a **private admin dashboard** for the owner to manage all content, track analytics, and handle contact inquiries.

The system is built as a pnpm workspace monorepo with three deployable artifacts sharing a common data access layer, connected to a Supabase PostgreSQL database with storage for media assets.

---

## 2. Product Overview

### 2.1 Purpose

Provide a centralized platform to:
- Present a professional portfolio to the world with zero-touch deployment
- Allow non-technical content management through a visual admin dashboard
- Track visitor engagement through lightweight analytics
- Handle contact form submissions with read/reply workflow
- Support multiple content types: projects, skills, experience, certifications, hero section, about section, contact information

### 2.2 Target Users

| User | Role | Needs |
|------|------|-------|
| **Portfolio Visitor** | Recruiter, hiring manager, peer | Browse projects, view certifications, assess skills, download CV, send contact message |
| **Admin (Portfolio Owner)** | Mustafa Sayed | Manage all content, respond to messages, view analytics, update SEO, customize theme/typography |

### 2.3 Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Professional presentation | Visitor engagement (page views, CV downloads) |
| Easy content management | Time-to-publish for new content |
| Lead generation | Contact form submissions |
| SEO visibility | Search engine ranking for relevant keywords |
| Performance | Lighthouse score > 90 on all pages |

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (User)                         │
├──────────────────────┬──────────────────────────────────────┤
│   Portfolio SPA      │          Admin CMS SPA              │
│   (React 19 + Vite)  │   (React 19 + Vite, Clerk Auth)     │
└──────────┬───────────┴─────────────┬────────────────────────┘
           │                         │
           │   @workspace/db (Data Access Layer)               │
           │   @workspace/supabase (Client Factories)          │
           ▼                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Platform                        │
├──────────────────────┬──────────────────────────────────────┤
│   PostgreSQL 15      │          Storage Buckets             │
│   (18 tables)        │   (cv, projects, certifications,     │
│                      │    documents)                        │
└──────────────────────┴──────────────────────────────────────┘
           ▲
           │   Express 5 API Server
           │   (CV download proxy, image serving)
           │
┌──────────┴───────────┐
│    API Server         │
│   (artifacts/api-     │
│    server)            │
└──────────────────────┘
```

### 3.2 Artifacts

| Artifact | Path | Purpose | Port |
|----------|------|---------|------|
| Portfolio | `artifacts/portfolio` | Public-facing SPA | 5173 |
| Admin CMS | `artifacts/admin` | Private management dashboard | 5174 |
| API Server | `artifacts/api-server` | Express 5 backend for CV/image serving | 3001 |

### 3.3 Shared Libraries

| Package | Path | Purpose |
|---------|------|---------|
| `@workspace/supabase` | `lib/supabase` | Supabase client factories (client, server, admin) + DB types |
| `@workspace/db` | `lib/db` | Data access layer: 20 modules with CRUD functions |
| `@workspace/validation` | `lib/validation` | Zod validation schemas |
| `@workspace/api-zod` | `lib/api-zod` | API response validation schemas |
| `@workspace/api-spec` | `lib/api-spec` | OpenAPI specification |

---

## 4. Technology Stack

### 4.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.0 | UI framework |
| TypeScript | 5.9.2 | Type safety |
| Vite | 7.3.2 | Build tool & dev server |
| Tailwind CSS | 4.1.14 | Utility-first styling |
| wouter | 3.3.5 | Client-side routing |
| TanStack Query | 5.90.21 | Server state management |
| framer-motion | 12.23.24 | Animations |
| lucide-react | 0.545.0 | Icon library |
| react-hook-form | 7.55.0 | Form management (admin) |
| zod | 3.25.76 | Schema validation |
| sonner | 2.0.7 | Toast notifications |
| recharts | 2.15.2 | Charts & analytics |
| class-variance-authority | latest | UI component variants |
| clsx + tailwind-merge | latest | Class name utilities |

### 4.2 Backend & Infrastructure

| Technology | Version | Purpose |
|------------|---------|---------|
| Express | 5 | HTTP server framework |
| Supabase JS | 2.105.4 | Database & storage client |
| PostgreSQL | 15 | Relational database |
| pino | 9+ | Logging |
| Clerk | 5.61.3 | Admin authentication |
| pnpm | latest | Package manager |

### 4.3 Admin-Specific Additions

| Technology | Purpose |
|------------|---------|
| @clerk/clerk-react | Admin authentication provider |
| @uppy/core + @uppy/dashboard | File upload widget (images) |
| @uppy/aws-s3 | S3-compatible upload target |

---

## 5. Features & Functionality

### 5.1 Public Portfolio

#### 5.1.1 Navigation

| Feature | Details |
|---------|---------|
| Fixed navbar | Glassmorphism on scroll, dark/light toggle, hamburger menu on mobile |
| Sections | Hero, About, Skills, Projects, Experience, Certifications, Contact |
| Smooth scroll | Anchor-based navigation with active section highlighting |
| Mobile menu | Escape key closes, smooth open/close transition |

#### 5.1.2 Hero Section

| Feature | Details |
|---------|---------|
| Availability badge | "Available for Work" with animated status dot |
| Typewriter animation | Cycles through 6 role titles |
| CTAs | Get In Touch, View Projects, Download CV |
| Social links | GitHub, LinkedIn, Email with icons |
| Ambient blobs | CSS-animated floating background elements |
| Avatar card | Monogram display with role subtitle |
| Scroll indicator | Progress bar + down arrow |

#### 5.1.3 About Section

| Feature | Details |
|---------|---------|
| Bio | Two-paragraph professional summary |
| Education card | Degree, school, grade, years with icon |
| Language bars | Arabic (native), English (advanced) with animated proficiency fill |
| Skills meters | 6 key skills with animated progress bars |
| Stats grid | Project count, experience years, skill count, certification count |
| Scroll reveal | IntersectionObserver-based fade-up animation |

#### 5.1.4 Skills Section

| Feature | Details |
|---------|---------|
| Category tabs | All + 5 categories: Languages, Frameworks, Cloud, Analytics, Tools |
| Interactive tag cloud | Proficiency-sized tags with color-coded dots |
| Hover tooltip | Shows mini progress bar, level badge, category |
| Level summary row | 4-cell grid with skill counts per level |
| Empty state | Animated illustration when no skills exist |
| Responsive | Scrollable tabs, wrap tags, adapts to mobile |

#### 5.1.5 Projects Section

| Feature | Details |
|---------|---------|
| Filter tabs | All + auto-detected categories |
| Masonry grid | CSS columns layout, 1/2/3 columns responsive |
| Project cards | Featured badge, category badge, tech stack tags, performance metrics |
| Click navigation | Card click navigates to `/projects/:slug` |
| GitHub links | Per-card link to repository |
| Empty state | Animated illustration when no projects exist |
| Responsive | 1 column mobile, 2 tablet, 3 desktop |

#### 5.1.6 Project Detail Page

| Route | `/projects/:slug` |
|-------|-------------------|
| Overview | Back link, title, featured/category/date badges |
| Content | Full description, challenges, outcome panels |
| Tech stack | Tag list with icons |
| Metrics | Performance metrics display |
| Related projects | Same-category project grid |
| Loading state | Skeleton placeholders |
| Static fallback | Renders from local data when DB unavailable |

#### 5.1.7 Experience Section

| Feature | Details |
|---------|---------|
| Timeline layout | Vertical spine with gradient, scroll-reveal, staggered delays |
| Type icons | Briefcase (internship), Award (certification), Heart (volunteer) |
| Color coding | Type-specific badge colors |
| Details | Company, location, period, bullet-point descriptions |
| Tech tags | Technology list per entry |
| Empty state | Animated illustration when no experience exists |

#### 5.1.8 Certifications Section

| Feature | Details |
|---------|---------|
| Category filters | Python, Data Engineering, AI & Cloud, Cloud, Database |
| Month-grouped timeline | Newest-to-oldest, month headers with cert counts |
| Card layout | 2-column desktop grid, per-card scroll-reveal |
| Issuer badges | Color-coded (DataCamp green, IBM blue, Microsoft sky, HackerRank emerald) |
| External links | "View" credential links with URL sanitization |
| Issuer summary row | Count per organization |
| Empty state | Animated illustration when no certifications exist |

#### 5.1.9 Contact Section

| Feature | Details |
|---------|---------|
| Contact details | Email, Phone, Location, GitHub, LinkedIn with icons |
| Map embed | OpenStreetMap Cairo location (lazy-loaded iframe) |
| Contact form | Name, Email, Message fields |
| Validation | Client-side Zod validation, inline error messages |
| States | Loading spinner during submit, success message with "Send Another" |
| Analytics | Tracks contact clicks |

#### 5.1.10 Footer

| Feature | Details |
|---------|---------|
| Branding | Monogram, role, location |
| Social links | GitHub, LinkedIn, Email |
| Attribution | "Built with" credit |
| Back-to-top | Appears after 600px scroll threshold |

#### 5.1.11 SEO

| Feature | Details |
|---------|---------|
| Meta tags | Title, description, keywords |
| Open Graph | og:title, description, image, type, url |
| Twitter Card | Card type, creator |
| JSON-LD | Person schema structured data |
| Canonical URL | Canonical link tag |
| Sitemap | `/sitemap.xml` |
| Manifest | `/manifest.json` PWA manifest |

#### 5.1.12 First-Visit Experience

| Feature | Details |
|---------|---------|
| Welcome toast | Sonner toast 1.5s after first page load, once per browser session (`sessionStorage`) |
| Empty states | Animated illustration + description + optional CTA on all content sections when DB has no data |

### 5.2 Admin CMS

#### 5.2.1 Authentication

| Feature | Details |
|---------|---------|
| Provider | Clerk (email + social OAuth) |
| Access control | Email whitelist (`VITE_ADMIN_EMAILS`) |
| Protected routes | All admin pages behind `<ProtectedRoute>` |
| Login redirect | `/admin/login` → Clerk hosted UI → redirect back |

#### 5.2.2 Dashboard (Overview)

| Route | `/admin` |
|-------|----------|
| Stats bar | Unread messages, skills count, projects count, live status |
| Module grid | Grouped by Appearance, Content, Inbox, Site |
| Seed data | "Import Static Data" dialog with progress indicators |
| Onboarding | Full-page banner when all content is empty, with quick-links to each manager, dismissible (localStorage) |

#### 5.2.3 Dashboard (Portfolio Admin)

| Route | `/admin` (portfolio version) |
|-------|------------------------------|
| Stat cards | Projects, Skills, Experience, Unread Messages counts |
| Quick actions | Grid of 6 buttons linking to Hero, About, Projects, Skills, Experience, Certs |
| Recent messages | Last 5 messages with read/unread badges, click to navigate to inbox |
| Analytics charts | Page views (7d/14d/30d selector), weekly messages bar chart, top projects bar chart |
| Stats row | Total views, CV downloads, contact clicks, weekly messages |
| Onboarding banner | Shown when all counts are zero, with quick-links (localStorage dismiss) |

#### 5.2.4 Theme Manager

| Route | `/admin/theme` |
|-------|----------------|
| Color palette | Light and dark mode HSL values for 9 design tokens (primary, accent, background, foreground, card, border, muted, ring, popover) |
| Radius control | Border radius slider |
| Live preview | Theme applied to demo UI elements |

#### 5.2.5 Typography Manager

| Route | `/admin/typography` |
|-------|---------------------|
| Font selection | Body font + display font with Google Fonts URL |
| Sizing | Base font size, heading scale |
| Spacing | Line height, letter spacing |
| Weights | Body weight, heading weight |

#### 5.2.6 Section Order Manager

| Route | `/admin/sections` |
|-------|-------------------|
| Reordering | Drag-and-drop section list |
| Visibility | Show/hide toggle per section |
| Persistence | Saves to `section_settings` table |

#### 5.2.7 Hero Editor

| Route | `/admin/hero` |
|-------|---------------|
| Fields | Name, subtitle, bio, avatar URL, CV URL |
| Typewriter lines | Dynamic list with add/remove |
| Social links | GitHub, LinkedIn, Twitter, Email + custom links |
| Stats | Label/value pair list |
| Image upload | Avatar + CV upload with progress bar |
| Live preview | Side panel showing rendered hero |

#### 5.2.8 About Editor

| Route | `/admin/about` |
|-------|----------------|
| Bio | Textarea for full bio |
| Education | Dynamic list (degree, institution, year, description) via `useFieldArray` |
| Languages | Name + proficiency slider |
| Interests | Tag input component |
| Live preview | Side panel showing rendered about section |

#### 5.2.9 Skills Manager

| Route | `/admin/skills` |
|-------|-----------------|
| CRUD | Create, read, update, delete skills |
| Categories | Tab-based filtering with item counts |
| Proficiency | Slider 0-100 |
| Visibility | Published/unpublished toggle |
| Sort order | Drag-and-drop reordering (HTML5 DnD) |
| Duplicate detection | Warns on duplicate skill name |
| Empty state | Animated illustration when no skills exist |

#### 5.2.10 Projects Manager

| Route | `/admin/projects` |
|-------|-------------------|
| CRUD | Create, read, update, delete projects |
| Table view | Thumbnail, title, category, tags, featured toggle, actions |
| Sheet form | All fields including completed_at, challenges, outcome, full_description |
| Slug generation | Auto-generates URL-safe slug from title |
| Image upload | Multi-image with slug folder organization |
| Featured toggle | Inline toggle from table |
| Tech stack | Tag input |
| Metrics | Text array for performance metrics |
| Empty state | Animated illustration when no projects exist |

#### 5.2.11 Experience Manager

| Route | `/admin/experience` |
|-------|---------------------|
| CRUD | Create, read, update, delete experience entries |
| Timeline view | Vertical timeline with dot + connecting line |
| Sheet form | Title, company, location, period, description, technologies, type |
| Type selector | Internship, Certification, Volunteer |
| Published toggle | Show/hide on portfolio |
| Current toggle | Marks as current position |
| Empty state | Animated illustration when no experience exists |

#### 5.2.12 Certifications Manager

| Route | `/admin/certifications` |
|-------|-------------------------|
| CRUD | Create, read, update, delete certifications |
| Card grid | Visual card display with issuer logo |
| Search + filter | Search bar + category pill filters |
| Dialog form | Title, issuer, category, date, credential URL, image URL, credential ID |
| URL sanitization | Sanitizes cert_url, image_url, credential_id before save |
| Empty state | Animated illustration when no certifications exist |

#### 5.2.13 Contact Manager

| Route | `/admin/contact` |
|-------|------------------|
| Fields | Email, phone, location, address, GitHub, LinkedIn, WhatsApp |
| Map | Map embed URL |
| Availability | Status toggle, working hours |

#### 5.2.14 Messages Viewer (Inbox)

| Route | `/admin/messages` |
|-------|-------------------|
| Filter tabs | All, Unread, Read, Archived |
| Table | Name, email, subject, date, read status |
| Bulk select | Checkbox selection for bulk operations |
| Expanded panel | Inline panel shows full message on row click |
| Mark read/unread | Toggle message status |
| Delete | Single and bulk delete with confirmation |
| Auto-mark read | Marks message read when expanded |
| Empty state | Animated illustration when no messages exist |

#### 5.2.15 SEO Manager

| Route | `/admin/seo` |
|-------|--------------|
| Meta | Title, description, keywords |
| Open Graph | OG title, OG description, OG image, canonical URL |
| Twitter | Twitter card, Twitter creator |

#### 5.2.16 Site Settings

| Route | `/admin/settings` |
|-------|-------------------|
| Fields | Site name, tagline, footer text, copyright text, logo text |
| Default theme | Light/Dark mode default |

#### 5.2.17 CV Manager

| Route | `/admin/cv` |
|-------|-------------|
| Upload | Drag-and-drop or file picker, PDF only |
| Progress | Upload progress bar (XHR-based) |
| Current status | Shows uploaded CV with date |
| Delete | Remove CV from storage |
| Import seed | "Import Static Data" button |

#### 5.2.18 Seed Data Import

| Feature | Details |
|---------|---------|
| Trigger | "Import Static Data" button on Overview or CV Manager |
| Progress | Per-entity progress indicators |
| Entities | Seeds hero, about, skills, projects, experience, certifications |
| Data source | Hardcoded static data matching portfolio.ts |
| Toast | Success/error feedback per entity |

### 5.3 API Server

#### 5.3.1 Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/healthz` | GET | Health check |
| `/api/cv` | GET | Download CV PDF from Supabase Storage |
| `/api/cv/settings` | GET | Get CV metadata (path, filename, updatedAt) |
| `/api/cv/settings` | PUT | Update CV metadata after upload |
| `/api/images/*` | GET | Serve uploaded images |

### 5.4 Analytics

| Feature | Details |
|---------|---------|
| Events | Page views, project views, CV downloads, contact clicks |
| Storage | `analytics_events` table (fire-and-forget, never blocks UI) |
| Dashboard | Page views chart (7d/14d/30d), messages chart, top projects |
| Stats | Total views, CV downloads, contact clicks, weekly messages |

---

## 6. Data Model

### 6.1 Database Schema (18 Tables)

#### Singleton Tables (single row, upsert pattern)

| Table | Key Fields | Description |
|-------|------------|-------------|
| **theme_settings** | `mode` (enum: light/dark), 9 light HSL values, 9 dark HSL values, `radius` | Design system colors and border radius |
| **typography_settings** | `body_font`, `display_font`, `base_font_size`, `line_height`, `letter_spacing`, `heading_scale`, font weights | Font configuration |
| **site_settings** | `site_name`, `site_tagline`, `footer_text`, `copyright_text`, `logo_text`, `default_theme` | General site metadata |
| **seo_settings** | `title`, `description`, `keywords`, OG fields, `canonical_url`, Twitter fields | SEO/metadata configuration |
| **hero_content** | `heading`, `name`, `roles` (text[]), `description`, social URLs, `avatar_url`, `cv_url`, `stats` (jsonb), `is_published` | Hero section content |
| **about_content** | `bio1`, `bio2`, `bio`, `education` (jsonb[]), `languages` (jsonb[]), `interests` (text[]), `is_published` | About section content |
| **contact_info** | `email`, `phone`, `location`, `address`, social URLs, `map_embed_url`, `availability_status`, `working_hours` | Contact information |
| **cv_settings** | `object_path`, `file_name` | CV file reference in Storage |

#### Collection Tables (multiple rows)

| Table | Key Fields | Description |
|-------|------------|-------------|
| **skills** | `name`, `category`, `proficiency` (int 0-100), `sort_order`, `is_visible` | Skills with categories |
| **projects** | `title`, `description`, `full_description`, `challenges`, `outcome`, `completed_at`, `tech_stack` (text[]), `category`, `featured`, `github_url`, `live_url`, `slug`, `metrics` (text[]), `sort_order`, `is_published`, `image_url` | Portfolio projects |
| **experience** | `title`, `company`, `location`, `period`, `description` (text[]), `technologies` (text[]), `type` (enum), `sort_order`, `is_published`, `current` | Work experience |
| **certifications** | `title`, `issuer`, `issuer_logo`, `date`, `date_sort`, `category`, `credential_url`, `credential_id`, `sort_order`, `is_published` | Certifications |
| **contact_messages** | `name`, `email`, `subject`, `message`, `is_read`, `created_at` | Contact form submissions |
| **section_settings** | `key` (unique), `label`, `is_visible`, `sort_order` | Section visibility & ordering |
| **analytics_events** | `type`, `path`, `section_key`, `project_id`, `referrer`, `device`, `created_at` | Visitor interaction tracking |

#### Storage Tables (internal)

| Table | Purpose |
|-------|---------|
| **image_metadata** | Image registry: path, dimensions, blur_hash, dominant_color, alt_text |
| **image_variants** | Image variant tracking (thumbnails, resized versions) |
| **content_snapshots** | Version history for content entities |
| **content_health_reports** | Data quality check results |

### 6.2 Enums

```sql
CREATE TYPE theme_mode AS ENUM ('light', 'dark');
CREATE TYPE msg_status AS ENUM ('unread', 'read', 'archived');
CREATE TYPE exp_type AS ENUM ('internship', 'certification', 'volunteer');
```

### 6.3 Storage Buckets

| Bucket | Purpose | Access |
|--------|---------|--------|
| `cv` | CV PDF files | Admin write, public read |
| `projects` | Project images | Admin write, public read |
| `certifications` | Certification badge images | Admin write, public read |
| `documents` | General documents | Admin write, public read |

### 6.4 Row Level Security

- **Public tables**: SELECT policies allow unauthenticated reads (anon key)
- **Admin tables**: All operations require `is_admin()` check via JWT email claim
- **Messages & analytics**: Public INSERT allowed (for contact form, tracking), SELECT/UPDATE/DELETE restricted to admin

---

## 7. User Flows

### 7.1 Portfolio Visitor Flow

```
Land on Home Page
    │
    ├── Scroll through sections (Hero → About → Skills → Projects → Experience → Certs → Contact)
    │       │
    │       ├── Click project card → View project detail page
    │       │       └── Click "Back to Projects" → Return to projects section
    │       │
    │       ├── Click "Download CV" → Download PDF via API server
    │       │
    │       ├── Click social links → Open GitHub/LinkedIn in new tab
    │       │
    │       └── Fill contact form → Submit → See success toast
    │
    ├── First visit → See welcome toast (once per browser session)
    │
    └── Navigate via navbar → Smooth scroll to section
```

### 7.2 Admin Content Management Flow

```
Login via Clerk (email whitelist)
    │
    ├── Dashboard → See stats, recent messages, onboarding banner (first visit)
    │
    ├── Content Management:
    │   ├── Projects → Add/Edit/Delete → Sheet form → Save → Toast success
    │   ├── Skills → Add/Edit/Delete → Dialog form → Save → Toast success
    │   ├── Experience → Add/Edit/Delete → Sheet form → Save → Toast success
    │   ├── Certifications → Add/Edit/Delete → Dialog form → Save → Toast success
    │   ├── Hero → Edit form → Save → Toast success
    │   └── About → Edit form → Save → Toast success
    │
    ├── Messages → View/Filter → Click to expand → Mark read/delete → Reply via mailto
    │
    ├── Settings:
    │   ├── Theme → Adjust colors → Live preview → Save
    │   ├── Typography → Adjust fonts → Save
    │   ├── Section Order → Drag & drop → Save
    │   ├── SEO → Update meta tags → Save
    │   ├── Contact Info → Update details → Save
    │   └── CV → Upload PDF → Progress bar → Save
    │
    └── View Site → Click "View Site" link → Open portfolio in new tab
```

### 7.3 Data Import Flow

```
Admin clicks "Import Static Data"
    │
    ├── Progress dialog opens
    │
    ├── System seeds 6 entities sequentially:
    │   ├── Hero content
    │   ├── About content
    │   ├── Skills (35 skills, 5 categories)
    │   ├── Projects (8 projects)
    │   ├── Experience (3 entries)
    │   └── Certifications (11 certs)
    │
    └── Success toast per entity → Dashboard reflects new counts
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Requirement | Target |
|-------------|--------|
| Lighthouse Performance | ≥ 90 |
| First Contentful Paint | ≤ 1.5s |
| Largest Contentful Paint | ≤ 2.5s |
| Time to Interactive | ≤ 3.0s |
| Bundle size (portfolio) | ≤ 300KB gzipped |
| API response time | ≤ 200ms (p50) |
| Image loading | Lazy loading + skeleton placeholders |

### 8.2 Security

| Requirement | Implementation |
|-------------|---------------|
| Admin auth | Clerk with email whitelist |
| DB access | RLS policies (public read, admin write) |
| Admin DB access | Service role key (bypasses RLS) |
| URL sanitization | `sanitizeUrl` helper at form + DB layer |
| Input validation | Zod schemas on all forms |
| File upload | PDF only for CV, XHR progress tracking |
| XSS protection | React DOM escaping |
| HTTPS | Enforced at deployment |

### 8.3 Accessibility

| Requirement | Implementation |
|-------------|---------------|
| Reduced motion | All animations respect `prefers-reduced-motion` via CSS media queries |
| Keyboard navigation | All interactive elements focusable, Escape key closes modals/menus |
| Screen readers | Semantic HTML, aria labels on icon buttons |
| Color contrast | Theme system ensures sufficient contrast ratios |

### 8.4 Responsiveness

| Breakpoint | Target |
|------------|--------|
| Mobile (< 640px) | Single column, hamburger menu, full-width sheets |
| Tablet (640-1024px) | 2-column grids, compact layout |
| Desktop (> 1024px) | 3-column grids, sidebar navigation (admin) |

### 8.5 Reliability

| Requirement | Implementation |
|-------------|---------------|
| Static fallback | Portfolio renders from local data when Supabase unavailable |
| Error boundaries | React error boundaries per section |
| Loading states | Skeleton components (not spinners) |
| Empty states | Animated illustrations with CTAs |
| Optimistic updates | TanStack Query mutations with optimistic UI |
| Fire-and-forget analytics | Never blocks UI, errors caught internally |

### 8.6 Browser Support

- Modern browsers: Chrome, Firefox, Safari, Edge (last 2 major versions)
- Progressive enhancement works without JavaScript (basic HTML)

---

## 9. Migration History

| Migration | Purpose |
|-----------|---------|
| `001_init.sql` | Core schema: 18 tables, enums, indexes, RLS policies |
| `002_constraints.sql` | NOT VALID check constraints on content tables |
| `002_fix_rls_policies.sql` | RLS policy corrections |
| `004_images.sql` | Image metadata and variant tables |
| `005_contact_messages.sql` | Contact messages table |
| `006_hero_fields.sql` | Hero content additional fields |
| `007_about_fields.sql` | About content additional fields |
| `008_projects_missing_fields.sql` | Projects missing fields |
| `009_storage_buckets.sql` | Storage buckets + RLS (cv, projects, certifications, documents) |
| `011_sort_order.sql` | Initialize sort_order values + data cleanup for NOT VALID constraints |
| `012_fix_cert_url_constraint.sql` | Relax chk_cert_url to allow empty strings |

---

## 10. Future Roadmap

| Feature | Description | Priority |
|---------|-------------|----------|
| Image optimization | Server-side image resizing, WebP conversion, responsive srcset | High |
| Dark mode toggle sync | Persist theme preference across devices via DB | Medium |
| Blog/Articles | Add blog section with markdown editor | Medium |
| Multi-language | i18n support for Arabic/English | Low |
| Portfolio themes | Multiple pre-built theme templates | Low |
| Export/Import | JSON export/import of all content for backup | Low |
| Contact form email | Forward contact submissions to admin email via Supabase Edge Functions | Medium |
| Rate limiting | Prevent contact form spam | Medium |
| Audit log | Track admin content changes with diff history | Low |
| Test coverage | Unit + integration tests for all DB functions and components | High |

---

## 11. Environment Variables

| Variable | Required | Used By | Description |
|----------|----------|---------|-------------|
| `VITE_SUPABASE_URL` | Yes | portfolio, admin | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | portfolio, admin | Anon key for client-side queries |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Admin | admin | Service role key (bypasses RLS) |
| `SUPABASE_URL` | API server | api-server | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | API server | api-server | Service role key for server ops |
| `VITE_CLERK_PUBLISHABLE_KEY` | Admin | admin | Clerk auth publishable key |
| `VITE_ADMIN_EMAILS` | Admin | admin | Comma-separated admin email addresses |

---

## 12. Development Commands

```bash
# Install all dependencies
pnpm install

# TypeScript type-check all packages
pnpm run typecheck

# Run all tests
pnpm run test

# Build all packages
pnpm run build

# Portfolio dev server (port 5173)
pnpm --filter @workspace/portfolio run dev

# Admin CMS dev server (port 5174)
pnpm --filter @workspace/admin run dev

# API Server dev (port 3001)
pnpm --filter @workspace/api-server run dev

# Portfolio typecheck only
cd artifacts/portfolio && npx tsc --noEmit
```
