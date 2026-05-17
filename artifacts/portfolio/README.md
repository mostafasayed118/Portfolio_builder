# Portfolio — Public Site

The public-facing portfolio SPA for Mustafa Sayed. Built with Vite + React 19 + TailwindCSS v4.

## Quick Start

```bash
# Copy env file
cp .env.example .env

# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# Start dev server
pnpm --filter @workspace/portfolio dev
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_SITE_URL` | No | Public site URL (default localhost:5173) |

## Folder Structure

```
src/
├── components/     # React components (HeroSection, Navbar, Footer, etc.)
├── pages/          # Route pages (Home, not-found)
├── hooks/          # Custom hooks (use-typewriter, use-throttled-scroll, etc.)
├── lib/            # Utilities (theme, supabase-provider, branding)
├── data/           # Static fallback data (portfolio.ts)
└── test/           # Test files
```

## Features

- Hero section with typewriter effect and social links
- Skills, Projects, Experience, Certifications sections
- Contact form
- Dark/light theme toggle
- Dynamic favicon and branding
- CV download
- Supabase-backed content (with static fallback)
