# Feature Inventory — Mustafa Sayed Portfolio

> **Project type:** Static single-page portfolio website  
> **Stack:** React 18 · Vite · TailwindCSS v4 · wouter · lucide-react  
> **Artifact path:** `artifacts/portfolio/`  
> **Preview path:** `/` (root)  
> **Data layer:** 100 % static — all content lives in `src/data/portfolio.ts`  
> **Last audited:** 2026-05-03

---

## Executive Summary

A fully client-rendered, zero-backend portfolio website for Mustafa Sayed Saeed Ibrahim (Data Engineer, Cairo, Egypt). The site covers seven content sections — Hero, About, Skills, Projects, Experience, Certifications, Contact — plus a persistent Navbar and Footer. All data is static TypeScript constants; there is no API server, no database, and no authentication layer. The site is production-ready for deployment to a `.replit.app` domain.

---

## 1. Architecture & Infrastructure

| Aspect | Detail |
|---|---|
| Runtime | Browser-only (CSR) |
| Build tool | Vite 7 with `vite.config.ts` |
| CSS engine | TailwindCSS v4 with `tw-animate-css` |
| Routing | `wouter` with `BASE_URL`-aware router |
| Theme | React Context + `localStorage` persistence |
| Fonts | Google Fonts CDN — Spline Sans (body) + Unbounded (display) |
| Icons | `lucide-react` |
| Static assets | `artifacts/portfolio/public/` |
| Toast system | Shadcn/UI `Toaster` (wired but not actively triggered) |
| Backend | None — the separate `api-server` artifact is not consumed |

---

## 2. Feature Inventory by Module

---

### 2.1 Global Shell

**Status: Implemented**

#### Navbar (`src/components/Navbar.tsx`)

| Feature | Status | Notes |
|---|---|---|
| Fixed top navigation bar | ✅ Implemented | `position: fixed`, `z-50` |
| Glassmorphism scroll effect | ✅ Implemented | Switches to `glass-strong` class when `scrollY > 20` |
| Logo click → smooth scroll to `#hero` | ✅ Implemented | |
| Six nav links with smooth scroll | ✅ Implemented | About · Skills · Projects · Experience · Certs · Contact |
| Dark/light mode toggle button | ✅ Implemented | Moon/Sun icon swap |
| Hamburger mobile menu | ✅ Implemented | Opens a dropdown drawer; closes on link click |
| Mobile theme toggle in hamburger bar | ✅ Implemented | Separate from desktop toggle |

**Navigation links wired:**
```
#about → #skills → #projects → #experience → #certifications → #contact
```

---

#### Footer (`src/components/Footer.tsx`)

| Feature | Status | Notes |
|---|---|---|
| Branding line (MS monogram + role + location) | ✅ Implemented | |
| GitHub icon link | ✅ Implemented | `target="_blank"` |
| LinkedIn icon link | ✅ Implemented | `target="_blank"` |
| Email icon link | ✅ Implemented | `mailto:` |
| Copyright / built-with line | ✅ Implemented | "Built with ❤️ in Cairo, Egypt · 2025" |

---

### 2.2 Theme System (`src/lib/theme.tsx`)

| Feature | Status | Notes |
|---|---|---|
| `ThemeProvider` React context | ✅ Implemented | Wraps entire app |
| `useTheme()` hook | ✅ Implemented | Exposes `{ theme, toggle }` |
| `localStorage` persistence | ✅ Implemented | Key: `"theme"` |
| `document.documentElement` class toggle | ✅ Implemented | Adds/removes `.dark` |
| Light mode CSS token set | ✅ Implemented | Full HSL palette in `:root` |
| Dark mode CSS token set | ✅ Implemented | Full HSL palette in `.dark` |
| Default mode | Light | Falls back to `"light"` if no stored preference |

**Design tokens defined (both modes):**
`--background`, `--foreground`, `--muted`, `--muted-foreground`, `--card`, `--border`, `--primary`, `--primary-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--ring`, `--radius`, `--shadow-soft`, `--shadow-card`, `--shadow-float`, `--chart-1..5`, sidebar tokens.

---

### 2.3 Hero Section (`src/components/HeroSection.tsx`)

**Status: Implemented**

| Feature | Status | Notes |
|---|---|---|
| "Available for Work" badge with pulse dot | ✅ Implemented | Green animated dot |
| Full name headline | ✅ Implemented | "Hi, I'm Mustafa Sayed" — name in primary colour |
| Typewriter role animation | ✅ Implemented | Cycles 6 roles via `useTypewriter` hook |
| Location chip (Cairo, Egypt) | ✅ Implemented | MapPin icon |
| Bio paragraph | ✅ Implemented | From `HERO.description` |
| "Get In Touch" CTA → scroll to `#contact` | ✅ Implemented | Solid primary button |
| "View Projects" CTA → scroll to `#projects` | ✅ Implemented | Outlined button |
| "Download CV" button | ✅ Implemented | Downloads `Mustafa_Sayed_Resume.pdf` from `/public` |
| GitHub / LinkedIn / Email social icon links | ✅ Implemented | Three glass-style icon buttons |
| Floating ambient background blobs | ✅ Implemented | CSS `animate-float` on 2 gradient blobs |
| "MS / Data Engineer" avatar card | ✅ Implemented | Glassmorphism card with emoji decorators |
| "Scroll Down" indicator | ✅ Implemented | Bouncing ArrowDown, smooth-scrolls to `#about` |
| Fade-up entrance animation | ✅ Implemented | `animate-fade-up` with staggered delay on avatar |

**Data source:** `HERO` constant in `data/portfolio.ts`

---

### 2.4 About Section (`src/components/AboutSection.tsx`)

**Status: Implemented**

| Feature | Status | Notes |
|---|---|---|
| Section reveal animation on scroll | ✅ Implemented | `useReveal()` IntersectionObserver hook |
| Bio paragraphs (×2) | ✅ Implemented | |
| Education card (degree, school, grade, years) | ✅ Implemented | GraduationCap icon |
| Language proficiency bars (Arabic + English) | ✅ Implemented | Inline progress bars |
| Location chip | ✅ Implemented | |
| Years-of-experience chip | ✅ Implemented | |
| Animated skill bar meters (×6) | ✅ Implemented | `SkillMeter` component, IntersectionObserver-triggered |
| Stats grid (Projects · Experience · Skills · Certs) | ✅ Implemented | 2×2 glass cards |

**Sub-component:** `SkillMeter` (`src/components/SkillMeter.tsx`)
- Per-bar IntersectionObserver — fills width only when in viewport
- CSS transition `width 1.2s cubic-bezier(0.4, 0, 0.2, 1)`

**Data sources:** `ABOUT`, `SKILLS`, `STATS` constants

---

### 2.5 Skills Section (`src/components/SkillsSection.tsx`)

**Status: Implemented**

| Feature | Status | Notes |
|---|---|---|
| Section reveal animation | ✅ Implemented | |
| Category filter tabs (All + 5 categories) | ✅ Implemented | Languages · Frameworks · Cloud · Analytics · Tools |
| Interactive skill tag cloud | ✅ Implemented | 35 skills total |
| Tag sizing by proficiency | ✅ Implemented | `text-sm` ≥90%, `text-xs` otherwise |
| Proficiency level dot on each tag | ✅ Implemented | Blue=Expert, Cyan=Advanced, Amber=Intermediate |
| Hover tooltip with mini progress bar | ✅ Implemented | Shows skill name, level badge, %, progress bar |
| Tag scale + shadow on hover | ✅ Implemented | `hover:scale-105` |
| Proficiency level summary row | ✅ Implemented | 4-cell grid: Expert · Advanced · Intermediate · Familiar counts |
| Active category count in filter buttons | ✅ Implemented | e.g. "Languages (8)" |

**Proficiency levels:**
| Level | Threshold | Colour |
|---|---|---|
| Expert | ≥ 90% | `--primary` (blue) |
| Advanced | ≥ 75% | `--accent` (cyan) |
| Intermediate | ≥ 60% | `--chart-3` (violet) |
| Familiar | < 60% | `--muted-foreground` |

**Data source:** `SKILL_CATEGORIES` — 5 categories × avg 7 skills, typed as `SkillCategory[]`

---

### 2.6 Projects Section (`src/components/ProjectsSection.tsx` + `ProjectCard.tsx`)

**Status: Implemented**

| Feature | Status | Notes |
|---|---|---|
| Section reveal animation | ✅ Implemented | |
| Category filter tabs (All + 4 categories) | ✅ Implemented | Cloud/ETL · Web Scraping · Web Apps · Mobile |
| Masonry CSS grid layout | ✅ Implemented | 1 col mobile → 2 col tablet → 3 col desktop |
| Project cards with hover border + shadow | ✅ Implemented | |
| "Featured" badge | ✅ Implemented | On 3 of 8 projects |
| Category badge on each card | ✅ Implemented | |
| Project title, description | ✅ Implemented | |
| Tech stack badge list | ✅ Implemented | |
| Performance metrics badges | ✅ Implemented | Cyan accent colour |
| GitHub icon link per card | ✅ Implemented | `target="_blank"` |
| Title colour change on hover | ✅ Implemented | Transitions to `--primary` |

**Projects in data (8 total):**
| # | Title | Category | Featured |
|---|---|---|---|
| 1 | DEPI Azure Data Engineering Capstone | cloud | ✅ |
| 2 | AqarMap Real Estate Scraper & Analysis | scraping | ✅ |
| 3 | Isagha E-Commerce Data Pipeline | scraping | |
| 4 | YalaKora Sports News Scraper | scraping | |
| 5 | Aloustaz Store — POS System | web | ✅ |
| 6 | Al-Hakim Store — E-Commerce Platform | web | |
| 7 | Home Management — Property System | web | |
| 8 | ChatterBox AI Chat App | mobile | |

**Data source:** `PROJECTS` constant — typed as array of `{ id, title, description, techStack, category, featured?, githubUrl, metrics? }`

---

### 2.7 Experience Section (`src/components/ExperienceSection.tsx` + `TimelineItem.tsx`)

**Status: Implemented**

| Feature | Status | Notes |
|---|---|---|
| Section reveal animation | ✅ Implemented | |
| Vertical timeline layout | ✅ Implemented | Left-aligned line with gradient fade |
| Per-item reveal with staggered delay | ✅ Implemented | `transitionDelay: index * 100ms` |
| Icon per experience type | ✅ Implemented | Briefcase=Internship, Award=Certification, Heart=Volunteer |
| Colour-coded type badge | ✅ Implemented | Blue / Cyan / Violet per type |
| Company, location, period display | ✅ Implemented | |
| Bullet-point description list | ✅ Implemented | |
| Technology tag list | ✅ Implemented | |
| Hover border highlight | ✅ Implemented | `hover:border-primary/20` |

**Experience entries (3 total):**
| # | Title | Company | Type |
|---|---|---|---|
| 1 | Data Engineer Trainee | Microsoft DEPI Scholarship | internship |
| 2 | Google Data Analytics Certificate | Coursera — Google | certification |
| 3 | Volunteer — Data & Technology Community | GDSC Obour · IEEE BUB SB | volunteer |

**Data source:** `EXPERIENCE` constant — typed with `type: "internship" | "certification" | "volunteer"`

---

### 2.8 Certifications Section (`src/components/CertificationsSection.tsx`)

**Status: Implemented**

| Feature | Status | Notes |
|---|---|---|
| Section reveal animation | ✅ Implemented | |
| Category filter tabs (All + 5 categories) | ✅ Implemented | Python · Data Engineering · AI & Data Science · Cloud · Database |
| Per-filter item counts in buttons | ✅ Implemented | |
| Month-grouped timeline | ✅ Implemented | Sorted newest → oldest; grouped by `dateSort` (YYYY-MM) |
| Two-column desktop grid | ✅ Implemented | `md:grid-cols-2` |
| Per-card scroll-reveal with stagger | ✅ Implemented | |
| Timeline dot per card | ✅ Implemented | Circular issuer-logo dot on left spine |
| Gradient timeline spine | ✅ Implemented | Fades from `primary/40` to transparent |
| Issuer badge (colour-coded per org) | ✅ Implemented | DataCamp=green, IBM=blue, Microsoft=sky, HackerRank=emerald |
| Category badge per card | ✅ Implemented | Colour-coded |
| Issue date display | ✅ Implemented | |
| "View →" external credential link | ✅ Implemented | Opens issuer site in new tab |
| Month section header with cert count | ✅ Implemented | Divider + count pill |
| Issuer summary row (4 orgs) | ✅ Implemented | Logo + count per org |

**Certifications (11 total):**
| # | Title | Issuer | Date | Category |
|---|---|---|---|---|
| 1 | Intermediate Python for Developers | DataCamp | Apr 2026 | python |
| 2 | Introduction to Python for Developers | DataCamp | Apr 2026 | python |
| 3 | Understanding Cloud Computing | DataCamp | Apr 2026 | cloud |
| 4 | Python for Data Engineering | IBM | Mar 2026 | data-engineering |
| 5 | Python for Data Science, AI & Development | IBM | Mar 2026 | ai |
| 6 | Introduction to Data Engineering | IBM | Dec 2025 | data-engineering |
| 7 | AI & Data Science — Microsoft Data Engineer | Microsoft DEPI | Dec 2025 | ai |
| 8 | Microsoft Data Engineer Associate | Microsoft | Dec 2025 | data-engineering |
| 9 | Python Basics | HackerRank | Sep 2025 | python |
| 10 | Database Fundamentals | Maharatech | Sep 2025 | database |
| 11 | Introduction to SQL (Basic) | HackerRank | Apr 2025 | database |

**Data source:** `CERTIFICATIONS` constant — typed as `Certificate[]` with `category` union type

---

### 2.9 Contact Section (`src/components/ContactSection.tsx`)

**Status: Implemented (UI-only form — no backend submission)**

| Feature | Status | Notes |
|---|---|---|
| Section reveal animation | ✅ Implemented | |
| Contact details sidebar (5 items) | ✅ Implemented | Email · Phone · Location · GitHub · LinkedIn |
| Clickable email link (`mailto:`) | ✅ Implemented | |
| Clickable phone link (`tel:`) | ✅ Implemented | |
| Clickable GitHub / LinkedIn links | ✅ Implemented | `target="_blank"` |
| OpenStreetMap Cairo embed (iframe) | ✅ Implemented | `loading="lazy"`, scrollable map |
| Contact form (Name · Email · Message) | ✅ Implemented | |
| Client-side form validation | ✅ Implemented | Name ≥2 chars, valid email regex, message ≥10 chars |
| Inline field error messages | ✅ Implemented | Red text below field |
| Success state (CheckCircle + "Message Sent!") | ✅ Implemented | Replaces form on submit |
| "Send Another" button resets state | ✅ Implemented | |
| Form submission backend | ⚠️ Not implemented | Form is UI-only; no email service or API hooked up |

---

## 3. Custom Hooks

| Hook | File | Purpose | Status |
|---|---|---|---|
| `useTypewriter` | `hooks/use-typewriter.ts` | Cycles through strings with type/pause/delete phases using `requestAnimationFrame` | ✅ Implemented |
| `useReveal` | `hooks/use-reveal.ts` | IntersectionObserver-based scroll reveal; fires once then disconnects | ✅ Implemented |
| `useTheme` | `lib/theme.tsx` | Reads + toggles theme from context | ✅ Implemented |
| `useMobile` | `hooks/use-mobile.tsx` | Detects `max-width: 768px` via `matchMedia` | ✅ Implemented (unused in current components) |
| `useToast` | `hooks/use-toast.ts` | Shadcn toast queue manager | ✅ Implemented (wired to `<Toaster>`, not triggered) |

---

## 4. Design System & CSS

### Glassmorphism Utilities (`src/index.css`)

| Class | Effect | Used in |
|---|---|---|
| `.glass` | `backdrop-filter: blur(12px)` + 70 % card background | Cards, skill tags, avatar, contact sidebar |
| `.glass-strong` | `backdrop-filter: blur(20px)` + 90 % card background | Navbar on scroll, mobile menu |

### Animation Classes

| Class / Keyframe | Effect | Used in |
|---|---|---|
| `.animate-fade-up` | Slide up + fade in, 0.7 s | Hero content blocks |
| `.animate-fade-in` | Fade in, 0.5 s | General transitions |
| `.animate-float` | Vertical bob 6 s loop | Hero background blobs |
| `.typewriter-cursor::after` | Blinking `|` at 1 s | Typewriter component |
| `.section-reveal` + `.revealed` | Opacity 0→1 + translateY 24→0, 0.6 s | All section content blocks |
| `.skill-bar-fill` | Width transition 1.2 s cubic-bezier | Skill meters |
| `.masonry-grid` | CSS columns layout | Projects section |

### Responsive Breakpoints

| Breakpoint | Columns |
|---|---|
| Default (mobile) | 1-column masonry; stacked hero |
| `sm` (640 px) | 2-column masonry |
| `md` (768 px) | 2-column section grids; horizontal hero |
| `lg` (1024 px) | 3-column masonry |

---

## 5. Routing

| Route | Component | Status |
|---|---|---|
| `/` | `pages/Home.tsx` | ✅ Implemented |
| `*` (catch-all) | `pages/not-found.tsx` | ✅ Implemented |

Router uses `wouter` with `BASE_URL` base to support subdirectory deployment.

---

## 6. Static Assets (`artifacts/portfolio/public/`)

| File | Purpose | Status |
|---|---|---|
| `favicon.svg` | Browser tab icon | ✅ Present |
| `opengraph.jpg` | Social share preview image | ✅ Present |
| `Mustafa_Sayed_Resume.pdf` | Downloadable CV (via Hero button) | ✅ Present |

---

## 7. SEO & Discoverability (`index.html`)

| Meta Tag Group | Status | Notes |
|---|---|---|
| `<title>` with keywords | ✅ Implemented | "Mustafa Sayed — Data Engineer \| Python · Azure · ETL" |
| `<meta name="description">` | ✅ Implemented | 160-char recruiter-friendly description |
| `<meta name="keywords">` | ✅ Implemented | 12 keywords |
| `<meta name="author">` | ✅ Implemented | |
| `<meta name="robots">` | ✅ Implemented | `index, follow` |
| `<link rel="canonical">` | ✅ Implemented | Points to `mustafasayed.replit.app` — **update after deploy** |
| Open Graph tags (`og:*`) | ✅ Implemented | type, url, title, description, image, dimensions, alt, site_name, locale |
| Twitter / X Card tags | ✅ Implemented | `summary_large_image`, creator |
| `<meta name="theme-color">` | ✅ Implemented | `#0284c7` (primary blue) |
| `<meta name="color-scheme">` | ✅ Implemented | `light dark` |
| JSON-LD `Person` schema | ✅ Implemented | name, jobTitle, url, email, phone, address, sameAs, knowsAbout, alumniOf |
| OG image absolute URL | ⚠️ Placeholder | Uses `mustafasayed.replit.app` — must be updated post-deploy |

---

## 8. Data Model (`src/data/portfolio.ts`)

| Export | Type | Records |
|---|---|---|
| `HERO` | Object | 1 — name, roles (6), description, social links |
| `ABOUT` | Object | 1 — bio (×2), education, languages (×2), location, years |
| `SKILLS` | Array | 6 — label + value (%) for About section meters |
| `SKILL_CATEGORIES` | `SkillCategory[]` | 5 categories × 35 skills total |
| `PROJECTS` | Array | 8 — id, title, description, techStack, category, featured, githubUrl, metrics |
| `EXPERIENCE` | Array | 3 — id, title, company, location, period, description[], technologies[], type |
| `CERTIFICATIONS` | `Certificate[]` | 11 — id, title, issuer, issuerLogo, date, dateSort, category, credentialUrl |
| `CONTACT` | Object | 1 — email, phone, location, github, linkedin |
| `STATS` | Array | 4 — Projects 8+, Experience 1yr, Skills 35+, Certifications 11 |

**TypeScript types exported:** `SkillLevel`, `Skill`, `SkillCategory`, `Certificate`

---

## 9. Cross-Section User Flows

```
Visitor lands on page
  └─ Hero: reads intro, role typewriter, clicks…
       ├─ "Download CV"        → downloads PDF
       ├─ "Get In Touch"       → scrolls to Contact
       ├─ "View Projects"      → scrolls to Projects
       ├─ Social icon links    → opens GitHub / LinkedIn / Email
       └─ Navbar link          → jumps to any section
            ├─ About           → reads bio, sees skill bars animate on scroll
            ├─ Skills          → filters tag cloud by category, hovers for %
            ├─ Projects        → filters by category, clicks GitHub link
            ├─ Experience      → reads timeline, sees staggered reveal
            ├─ Certs           → filters by issuer/type, clicks "View →"
            └─ Contact         → fills form, sees validation, success state
                                  or clicks contact detail links directly
```

---

## 10. Incomplete / Partial Features

| Feature | Status | Gap |
|---|---|---|
| Contact form submission | ⚠️ UI-only | No backend, email service (e.g. EmailJS, Resend), or API endpoint — form shows success state but sends nothing |
| Credential links | ⚠️ Placeholder | `credentialUrl` values point to issuer homepages, not actual credential verification URLs |
| GitHub profile URL | ⚠️ Placeholder | `https://github.com/mustafa-sayed` — confirm this is the correct handle |
| LinkedIn profile URL | ⚠️ Placeholder | `https://www.linkedin.com/in/mustafa-sayed` — confirm handle |
| OG image URL | ⚠️ Placeholder | Hardcoded to `mustafasayed.replit.app` — update after first deployment |
| Canonical URL | ⚠️ Placeholder | Same domain placeholder — update post-deploy |
| `useMobile` hook | ⚠️ Implemented but unused | Available in `hooks/use-mobile.tsx`, not consumed by any component |
| `useToast` / `<Toaster>` | ⚠️ Wired but inactive | Toaster is mounted in `App.tsx`; no feature currently fires a toast |
| 60+ Shadcn/UI components | ⚠️ Available but unused | Full Shadcn library present in `components/ui/`; only `toaster/toast` are mounted |

---

## 11. Security & Privacy

| Concern | Status | Notes |
|---|---|---|
| No backend = no auth surface | ✅ N/A | Purely static site |
| No user data stored | ✅ N/A | Only `"theme"` key in `localStorage` |
| Contact form data | ✅ Never transmitted | Form is UI-only; data stays in React state |
| External links | ✅ `rel="noopener noreferrer"` | Applied on all `target="_blank"` anchors |
| CV file served from same origin | ✅ Safe | PDF served from Vite's public directory |

---

## 12. Feature Master List

| Feature | Module | Status | Notes |
|---|---|---|---|
| Glassmorphism design system | Global | ✅ Implemented | `.glass` / `.glass-strong` utilities |
| Dark / light mode toggle | Global | ✅ Implemented | localStorage-persisted |
| Smooth scroll navigation | Global | ✅ Implemented | All nav links + CTA buttons |
| Mobile hamburger menu | Navbar | ✅ Implemented | |
| Typewriter role animation | Hero | ✅ Implemented | 6 roles, rAF-based |
| Ambient floating blobs | Hero | ✅ Implemented | CSS animation |
| Download CV button | Hero | ✅ Implemented | PDF served from public/ |
| Social links (GitHub, LinkedIn, Email) | Hero + Footer | ✅ Implemented | |
| Scroll-reveal animations | All sections | ✅ Implemented | IntersectionObserver |
| Bio + Education card | About | ✅ Implemented | |
| Language proficiency bars | About | ✅ Implemented | |
| Animated skill meter bars | About | ✅ Implemented | Viewport-triggered fill |
| Stats counters grid | About | ✅ Implemented | |
| 35-skill interactive tag cloud | Skills | ✅ Implemented | |
| Category filter tabs | Skills | ✅ Implemented | 5 categories |
| Hover proficiency tooltip | Skills | ✅ Implemented | Mini bar + % |
| Proficiency level summary | Skills | ✅ Implemented | Expert/Advanced/Intermediate/Familiar counts |
| 8-project masonry grid | Projects | ✅ Implemented | |
| Project category filter | Projects | ✅ Implemented | 4 categories |
| "Featured" badge | Projects | ✅ Implemented | 3 projects |
| Tech stack + metrics badges | Projects | ✅ Implemented | |
| Vertical experience timeline | Experience | ✅ Implemented | 3 entries |
| Type-coded timeline icons | Experience | ✅ Implemented | Internship / Cert / Volunteer |
| Staggered timeline reveal | Experience | ✅ Implemented | |
| 11-certificate timeline | Certifications | ✅ Implemented | |
| Month-grouped cert sections | Certifications | ✅ Implemented | |
| Cert category filter tabs | Certifications | ✅ Implemented | 5 categories |
| Issuer colour coding | Certifications | ✅ Implemented | DataCamp / IBM / Microsoft / HackerRank |
| Credential "View →" links | Certifications | ⚠️ Placeholder URLs | Need real credential links |
| Issuer summary row | Certifications | ✅ Implemented | |
| Contact details sidebar | Contact | ✅ Implemented | 5 items |
| Cairo OpenStreetMap embed | Contact | ✅ Implemented | Lazy-loaded iframe |
| Contact form with validation | Contact | ✅ Implemented | Client-side only |
| Form success state | Contact | ✅ Implemented | |
| Form email submission | Contact | ⚠️ Not implemented | UI-only |
| Primary SEO meta tags | SEO | ✅ Implemented | title, description, keywords, canonical |
| Open Graph tags | SEO | ✅ Implemented | Full og:* set |
| Twitter Card tags | SEO | ✅ Implemented | summary_large_image |
| JSON-LD Person schema | SEO | ✅ Implemented | |
| 404 Not Found page | Routing | ✅ Implemented | |
| `useTypewriter` hook | Hooks | ✅ Implemented | |
| `useReveal` hook | Hooks | ✅ Implemented | |
| `useMobile` hook | Hooks | ✅ Implemented but unused | |
| `useToast` hook | Hooks | ✅ Implemented but inactive | |

---

## 13. "What Can This Site Do Today?"

The portfolio is **fully presentable to recruiters** right now:

- Communicates identity, role, and availability at a glance
- Demonstrates 35 skills with proficiency context
- Shows 8 real projects with tech stacks and GitHub links
- Lists 3 experience entries on a polished timeline
- Showcases 11 verifiable certifications from IBM, DataCamp, and Microsoft
- Provides multiple direct contact methods (email, phone, LinkedIn, GitHub)
- Lets recruiters download the CV in one click
- Renders a proper link-preview card on LinkedIn and WhatsApp (once deployed and OG URL updated)

---

## 14. "What's Missing to Feel Complete?"

| Gap | Priority | Effort |
|---|---|---|
| Contact form wired to a real email service (EmailJS / Resend) | High | Low |
| Real credential verification URLs in Certifications | High | Low (data update only) |
| Confirmed GitHub + LinkedIn profile handles | High | Low (data update only) |
| OG image URL + canonical updated to real deployed domain | High | Low (post-deploy edit) |
| Actual profile photo in place of "MS" monogram | Medium | Low |
| Framer Motion entrance animations (currently CSS-only) | Low | Medium |
| Blog / writing section | Low | High |
