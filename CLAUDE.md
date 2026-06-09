# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Post-apocalyptic HUD-themed portfolio + blog template built with Next.js 14 (Pages Router), TypeScript, SCSS Modules, Three.js, GSAP, and MDX.

## Commands

```bash
npm run dev      # Start dev server via custom server.js (not next dev)
npm run build    # Production build (next build)
npm start        # Production server (cross-env NODE_ENV=production node server.js)
npm run lint     # ESLint (next lint)
```

No test framework is configured. There are no `test` scripts.

## Architecture

### Custom Server (`server.js`)

The dev and production servers both use `server.js`, not Next.js's built-in server. This server provides:
- SSE endpoint at `/api/sse/stats` — pushes online visitor count and total visits to connected clients
- REST endpoint at `/api/stats` — returns accumulated runtime and visit count
- Stats persistence in `.stats.json` (root, gitignored)
- Graceful shutdown that flushes stats

Do not replace `server.js` with `next dev` or `next start` — the SSE stats system depends on it.

### State Management

All global state flows through two React contexts:

- **AppContext** (`contexts/AppContext.tsx`) — composes six custom hooks into a single context:
  - `useAnimationSequence` — loading screen sequence, column retract/expand phases
  - `usePowerSystem` — battery charge level, inversion toggle, Tesseract 3D activation
  - `useRealtimeStats` — SSE-driven live visitor stats
  - `useFateTypingEffect` / `useEnvParamsTypingEffect` — typewriter text effects
  - `useColumnHover` — HUD text changes on navigation column hover

- **TransitionContext** (`contexts/TransitionContext.tsx`) — handles page transitions with Web Animations API:
  - Desktop: slide-in/slide-out between pages, column retract/expand on home↔content
  - Mobile: diagonal clip-path expand/collapse
  - `navigateTo(url)` replaces `router.push` for animated transitions
  - `handleBack()` respects detail-view overrides (lightbox, etc.)

All pages consume state via `useApp()` and `useTransition()`.

### Routing Structure

- `/` — Home: five navigation columns (works, experience, blog, life, contact/about)
- `/content` — All sections scrollable on one page (hash-based: `#works`, `#experience`, etc.)
- `/works`, `/experience`, `/life`, `/blog` — Section pages
- `/web/[id]` — Work detail view (dynamic)
- `/life/[slug]` — Life detail view (dynamic)
- `/blog/[slug]` — Blog post view (MDX)
- `/friends` — Friend links page
- `/about`, `/contact` — Standalone pages
- `/sitemap.xml`, `/rss.xml` — Auto-generated from blog posts

### Content System

- **Data files** (`data/*.ts`) — TypeScript arrays for projects, experience, life items, skills, friend links. These are the primary way to customize site content.
- **Blog** (`content/blog/*.mdx`) — MDX files with frontmatter (`title`, `date`, `excerpt`, `tags`). Parsed by `lib/blog.ts` using gray-matter + reading-time. Rendered via next-mdx-remote.
- **Custom MDX components** — `components/mdx/MDXComponents.tsx`

### 3D Effects (Desktop Only)

- `RainMorimeEffect` — background rain particle effect
- `TesseractExperience` — interactive 3D charging animation (activates via lever pull)
- Both use `@react-three/fiber` and are dynamically imported with `ssr: false`
- Controlled by `usePowerSystem` hook; battery charges during Tesseract interaction

### Styling

- SCSS Modules per component (`*.module.scss`)
- Shared partials in `styles/_animations.scss`, `_columns.scss`, `_layout.scss`, `_sections.scss`
- CSS custom properties for theming in `styles/globals.scss`:
  - `--ark-highlight-green` — primary accent color (change to retheme)
  - `--ark-inverted-*` — inverted/negative mode colors (lever toggle)
- Custom fonts: ZELDA Free (display), Dosis (HUD), Noto Sans/Serif SC (reading)

### Path Aliases

Configured in both `tsconfig.json` and `jsconfig.json`:
- `@/*` → project root
- `@/components/*`, `@/styles/*`, `@/hooks/*`, `@/contexts/*`, `@/data/*`, `@/types/*`, `@/lib/*`

### Environment Variables

See `.env.example`:
- `PORT` — server port (default 3000)
- `NEXT_PUBLIC_SITE_URL` — used for sitemap and RSS generation

## Key Conventions

- Pages Router (not App Router). All pages are in `pages/`.
- Components use a mix of default exports and named exports; pages use default exports.
- `strict: false` in tsconfig — some files use implicit any.
- Navigation always goes through `useTransition().navigateTo()` instead of `router.push()` to preserve animated transitions.
- Three.js/WebGL components are dynamically imported with `ssr: false` and never unmount once ready (avoids GPU context destruction).
