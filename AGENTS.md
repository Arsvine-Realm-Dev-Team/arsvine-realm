# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

ARSVINE REALM is a personal post-apocalyptic HUD-themed portfolio + blog site built with Next.js 16 (Pages Router), TypeScript, SCSS Modules, Three.js, GSAP, and MDX. Targets Node 22.x on Vercel (Node 20.9+ also works locally).

## Commands

```bash
npm run dev      # Start dev server via custom server.js (not next dev)
npm run build    # Production build (next build)
npm start        # Production server (cross-env NODE_ENV=production node server.js)
npm run lint     # ESLint flat config (eslint .)
```

No test framework is configured. There are no `test` scripts.

### Lint config (`eslint.config.mjs`)

Flat config extends `eslint-config-next/core-web-vitals` and enables four React Compiler rules as warnings: `react-hooks/immutability`, `react-hooks/purity`, `react-hooks/refs`, `react-hooks/set-state-in-effect`. These flag legitimate patterns in animation/3D/typewriter code (Tesseract, CustomCursor, useTypingEffect) — when touching those areas, expect warnings and prefer scoped `// eslint-disable-next-line` with a reason over rewriting working interaction code.

## Architecture

### Custom Server (`server.js`)

The dev and production servers both use `server.js`, not Next.js's built-in server. This server provides:
- SSE endpoint at `/api/sse/stats` — pushes online visitor count and total visits to connected clients
- REST endpoint at `/api/stats` — returns accumulated runtime and visit count
- Stats persistence in `.stats.json` by default, or `process.env.STATS_FILE` when set
- Graceful shutdown that flushes stats

Do not replace `server.js` with `next dev` or `next start` — the SSE stats system depends on it.

### API Routes (`pages/api/`)

- `pages/api/hitokoto.ts` — server-side proxy for `https://v1.hitokoto.cn` (categories `d|i|k`, length 10–30). 60s in-process cache, 5s `AbortController` timeout. Returns `200 { text }` (fresh or cached) or `502 { error: 'upstream_unavailable' }` on upstream failure/timeout/empty body. Consumed by `useFateTypingEffect`.

### State Management

All global state flows through two React contexts:

- **AppContext** (`contexts/AppContext.tsx`) — composes six custom hooks into a single context:
  - `useAnimationSequence` — loading screen sequence, column retract/expand phases
  - `usePowerSystem` — battery charge level, inversion toggle, Tesseract 3D activation
  - `useRealtimeStats` — SSE-driven live visitor stats
  - `useFateTypingEffect` / `useEnvParamsTypingEffect` — typewriter text effects. `useFateTypingEffect` alternates `1 cycle preset tagline (en + zh)` with `1 hitokoto sentence` pulled from `/api/hitokoto`; on fetch failure the cycle silently falls back to a preset round and retries next iteration.
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
- `/copyright` — Bilingual Copyright & License page (MIT for source, CC BY-NC-ND 4.0 for original content). Layout/article copy live directly in `pages/copyright.tsx`; only the `<title>` / `<meta description>` are sourced from `siteConfig.pages.copyright`.
- `/license` — `getServerSideProps` 301 redirect to `/copyright` (kept for short, intuitive URL).
- `/sitemap.xml`, `/rss.xml` — Auto-generated from blog posts
- `/robots.txt` — Generated dynamically from `getSiteUrl()`

### Content System

- **Data files** (`data/*.ts`) — TypeScript arrays/config for site identity (`data/site.ts`), music playlist (`data/music.ts`), projects, experience, life items, skills, friend links, and project-detail copyable tokens. These are the primary way to maintain site content.
- **Blog** (`content/blog/*.mdx`) — MDX files with frontmatter (`title`, `date`, `excerpt`, `tags`). Parsed by `lib/blog.ts` using gray-matter + reading-time. Rendered via next-mdx-remote.
- **Custom MDX components** — `components/mdx/MDXComponents.tsx`
- **Media hosting** — Music tracks (and future post images/gallery/assets) live on **Tencent COS** (Hong Kong bucket `arsvine-cdn`, region `ap-hongkong`, public-read / private-write) and are served via `cdn.arsvine.com` (DNSPod CNAME → COS origin; no Tencent CDN in front). `data/music.ts` builds each `src` by prefixing `process.env.NEXT_PUBLIC_MEDIA_CDN` to `/music/<file>`; when the env is unset the player falls back to the relative `/music/...` path under `public/` so local dev works without COS. `cdn.arsvine.com` is whitelisted in `config/image-hosts.js` for `next/image`, but post images are expected to render via `next/image` with `unoptimized={true}` (or a plain `<img>`) to bypass Vercel's Image Optimization quota — COS direct origin (no `/_next/image` rewrite) also avoids burning the COS outbound-traffic package via Vercel-side re-fetches.

### 3D Effects (Desktop Only)

- `RainMorimeEffect` — background rain particle effect
- `TesseractExperience` — interactive 3D charging animation (activates via lever pull). Uses `@react-three/cannon` + `cannon-es` for rigid-body physics (gravity, restitution, ground plane); mobile skips the WebGL canvas and charges the battery on an interval inside `MainLayout` instead.
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
- `NEXT_PUBLIC_SITE_URL` — used for sitemap, RSS, robots, and Open Graph URLs
- `NEXT_PUBLIC_UMAMI_SRC` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID` — optional Umami analytics script config
- `NEXT_PUBLIC_MEDIA_CDN` — optional media CDN base URL (e.g. `https://cdn.arsvine.com`, backed by Tencent COS Hong Kong bucket `arsvine-cdn`). Consumed by `data/music.ts`; when unset the music player serves files from `/public/music/` instead.
- `STATS_FILE` — optional server-side stats persistence file path

## Key Conventions

- Pages Router (not App Router). All pages are in `pages/`.
- Components use a mix of default exports and named exports; pages use default exports.
- `strict: false` in tsconfig — some files use implicit any.
- Navigation always goes through `useTransition().navigateTo()` instead of `router.push()` to preserve animated transitions.
- Three.js/WebGL components are dynamically imported with `ssr: false` and never unmount once ready (avoids GPU context destruction).
