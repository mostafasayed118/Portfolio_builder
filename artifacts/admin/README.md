# Admin — CMS Dashboard

The admin CMS dashboard for managing portfolio content. Built with Vite + React 19 + Clerk auth + Supabase.

## Quick Start

```bash
# Copy env file
cp .env.example .env

# Fill in all required variables
# Start dev server
pnpm --filter @workspace/admin dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (admin operations) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `VITE_SITE_URL` | No | Admin site URL (default localhost:5174) |
| `APP_ADMIN_EMAILS` | Yes | Comma-separated admin email allowlist |

## Admin Pages

| Page | Route | Description |
|---|---|---|
| Overview | `/` | Dashboard with stats and charts |
| Hero Editor | `/hero` | Edit hero section content with live preview |
| Hero Manager | `/hero/manage` | Manage hero content history |
| About Editor | `/about` | Edit about section with live preview |
| About Manager | `/about/manage` | Manage about content |
| Skills Manager | `/skills` | CRUD skills with category grouping |
| Projects Manager | `/projects` | CRUD projects with image upload |
| Experience Manager | `/experience` | CRUD experience timeline entries |
| Certifications Manager | `/certs` | CRUD certifications with grid |
| Messages Viewer | `/messages` | Contact message inbox with read/delete |
| CV Manager | `/cv` | CV file upload and download settings |
| Theme Manager | `/theme` | Theme color customization |
| Typography Manager | `/typography` | Font and typography settings |
| SEO Manager | `/seo` | SEO meta tags and preview |
| Site Settings | `/settings` | Site name, tagline, footer |
| Contact Manager | `/contact` | Contact info and social links |
| Section Order Manager | `/sections` | Section visibility and ordering |
