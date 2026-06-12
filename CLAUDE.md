# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARSVINE REALM is a personal post-apocalyptic HUD-themed portfolio + blog site built with Next.js 16 (Pages Router), TypeScript, SCSS Modules, Three.js, GSAP, and MDX. Targets Node 24.x on Vercel (Node 20.9+ also works locally).

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
- **Blog** (`content/blog/*.mdx`) — MDX files with frontmatter (`title`, `date`, `excerpt`, `tags`, `pinned?`, `originLocale?`). Parsed by [lib/blog.ts](lib/blog.ts) using `gray-matter`. Reading time is computed by an in-house [estimateReadingMinutes()](lib/blog.ts) that counts CJK characters and Latin words separately at a **slow-read pace** (CJK 200 cpm, Latin 115 wpm — roughly half typical reading speed, so displayed minutes double). The slower pace accounts for code blocks / images / pause-for-thought passages — the original 400/230 values consistently underestimated real reading time. **Do not add the `reading-time` npm package back**; it counts whitespace-delimited tokens only, so any 1000-character Chinese post returned `1 min` regardless of length. Code blocks / inline code / HTML/JSX tags / MDX `import|export` lines are stripped before counting. UI strings are produced by [lib/format-reading-time.ts](lib/format-reading-time.ts) per the current UI locale (consumes `readingMinutes: number` on `BlogPostMeta`).
- **Multilingual blog content** — each post lives under `content/blog/<slug>/<locale>.mdx` (preferred) or `content/blog/<slug>.<locale>.mdx` (legacy). Site UI locales are `zh-CN | zh-TW | en` (see [i18n/config.ts](i18n/config.ts)). Posts may additionally exist in `ja | ru | fr` as content-only languages exposed via a per-post language switcher; the surrounding UI stays in the user's chosen UI locale. When a requested UI locale lacks a post variant, [lib/blog.ts](lib/blog.ts) falls back to `defaultLocale` (`zh-CN`) and marks `translationStatus: 'fallback'`.
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
  - `--mobile-hud-clearance` / `--mobile-section-scroll-offset` / `--mobile-detail-top-offset` — mobile-only top-edge gutters that include `env(safe-area-inset-top)`. Used by `.contentSection` / `.friendLinkSection` / `.detailViewWrapper` as `scroll-margin-top` / `padding-top` to keep section headings clear of the HUD on hash navigation. `scrollIntoView({ block: 'start' })` automatically honors `scroll-margin-top` per CSSOM spec, so a JS scroll-offset helper is intentionally **not** used.
- Font families (CSS variables in [styles/globals.scss](styles/globals.scss)):
  - `--font-display` — `'ZELDA Free'` (post-apocalyptic title accent; **Latin-only — no CJK/accented glyphs**, use only for short English-ish display strings; never for body, blog headers, or anything that may receive non-ASCII input)
  - `--font-hud` — `'Dosis'` (HUD numerals/labels; also used by blog post headers since 2026/06 as a safer Latin-extended sans replacing the old ZELDA Free header)
  - `--font-reading` — `'Noto Serif SC', 'Source Han Serif SC', 'Noto Sans SC', serif` (MDX body)
  - `--font-typewriter` — Courier stack for monospace/typing FX

### Self-hosted Google Fonts (`cdn.arsvine.com/fonts/`)

The site loads Google Fonts via `<link rel="stylesheet">` in [pages/_document.tsx](pages/_document.tsx) pointing at the self-hosted copy on Tencent COS, not `fonts.googleapis.com` directly (which is blocked in mainland China). Pipeline:

1. **Source of truth**: [data/site.ts](data/site.ts) `siteConfig.fonts.googleStylesheet` holds the canonical Google Fonts URL (family + weight selection). [data/site.ts](data/site.ts) `siteConfig.fonts.cdnStylesheet` holds the rewritten CSS URL on COS.
2. **Generator**: [scripts/fetch-google-fonts.mjs](scripts/fetch-google-fonts.mjs) reads the URL out of [data/site.ts](data/site.ts), fetches Google's CSS with a modern Chrome UA (otherwise Google serves bulkier `.ttf` instead of `.woff2`), downloads every `.woff2`, rewrites all `url()` to `cdn.arsvine.com/fonts/<family>/<file>`, and writes the result to `public/_fonts-staging/` (gitignored).
3. **Upload**: **manual via Tencent COS web console** — this project does **not** use the `coscli` CLI. Upload the entire `public/_fonts-staging/` directory tree to `cos://arsvine-cdn/fonts/`. See the script's tail output for the exact metadata-header steps.

**Variable Font note (critical, easy to misread):** Google's Fonts API returns Variable Fonts (VF) when multiple weights are requested in one URL. The CSS contains separate `@font-face` blocks with different `font-weight:` declarations all pointing at the **same** woff2 file. **This is correct** — the file is a VF whose `wght` axis covers a continuous range (e.g. Noto Sans SC 100–900), and the browser interpolates the right weight at render time. Do **not** "fix" this by forcing one-file-per-weight in the script; you would download 4× the bytes and end up with worse fonts. The fact that the local file is named `dosis-300-normal-000.woff2` does not mean it only contains weight 300 — the `300` is just the first weight that claimed that URL during dedup.

**COS metadata-header trap (do NOT repeat):** When configuring per-object custom headers in the COS web console, the **Key** field is the header name (e.g. `Cache-Control`) and the **Value** field is the value only (e.g. `public, max-age=31536000, immutable`). Do not paste `Cache-Control: public, ...` into the Value field — COS will emit `Cache-Control: Cache-Control: public, ...` as the response header. Firefox rejects woff2 with a malformed `Content-Type` and silently falls back to a system font, which on a Simplified-Chinese-default Windows looks like "rare Traditional Chinese characters render as tofu / broken glyphs". Required headers:

| Object | Content-Type | Cache-Control |
|---|---|---|
| `google-fonts.css` | `text/css; charset=utf-8` | `public, max-age=86400, must-revalidate` |
| `*.woff2` | `font/woff2` | `public, max-age=31536000, immutable` |

Verify with: `curl -I -H "Referer: https://arsvine.com/" https://cdn.arsvine.com/fonts/google-fonts.css` — `Content-Type:` and `Cache-Control:` must each appear exactly once.

### Favicon Layout

Icon files live in two places in `public/`:
- Root (`/favicon.ico`, `/apple-touch-icon.png`) — browsers blind-probe these; must stay at root.
- `/icons/` — the rest (favicon-16x16, favicon-32x32, android-chrome-192x192, android-chrome-512x512, site.webmanifest).

Regenerate from a transparent source with `node scripts/regen-favicons.mjs`. If the source is a white-background JPG, first run `node scripts/jpg-to-transparent-png.mjs`.

### Local Dev — COS Referer

COS `cdn.arsvine.com` only accepts Referer `*.arsvine.com`. Run `scripts/dev-host-setup.cmd` (double-click) to add `dev.arsvine.com → 127.0.0.1` to Windows hosts, start the dev server, and auto-clean on exit. See the script or README for `-HostsOnly` / `-Remove` sub-commands.

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
- Locale resolution at `/` is `NEXT_LOCALE cookie > Accept-Language > defaultLocale (zh-CN)` ([proxy.ts](proxy.ts)). Do **not** introduce IP-based geo language detection — the cookie set by `LanguageSwitcher` is the source of truth for return visits.
- All section anchors that may receive `scrollIntoView` or hash navigation on mobile must set `scroll-margin-top: var(--mobile-section-scroll-offset)` (see [styles/_sections.scss](styles/_sections.scss)). Do not add JS scroll-offset helpers — `scrollIntoView({ block: 'start' })` honors `scroll-margin-top` automatically.

## Common Gotchas (real bugs that bit us; don't re-introduce)

- **Don't reach for `reading-time` again.** It splits on whitespace, so any CJK post returns 0 minutes and the `Math.max(1, ...)` floor hides it as `1 min`. Use the in-house [estimateReadingMinutes()](lib/blog.ts) for any future blog-like content.
- **`ZELDA Free` is Latin-only.** It looks great for English HUD strings but has no CJK glyphs and incomplete accented Latin. Don't use `--font-display` on any header that may contain user-supplied or translated text — blog post titles in particular were migrated from `--font-display` to `--font-hud` (Dosis 500) for this reason. See [styles/BlogDetailView.module.scss:73-81](styles/BlogDetailView.module.scss).
- **COS custom-header Value field is value-only.** Pasting `Cache-Control: public, ...` into the Value field produces a `Cache-Control: Cache-Control: ...` response header. Firefox then rejects the woff2 silently (Net status `0x80040111` = `NS_ERROR_NOT_AVAILABLE`) and falls back to system fonts — uncommon CJK characters render as tofu. See the "Self-hosted Google Fonts" section above for the correct headers.
- **Google Fonts VF deduplication is intentional.** A `@font-face` block with `font-weight: 500` pointing at `dosis-300-normal-000.woff2` is **not** a bug — it's a Variable Font whose `wght` axis covers 200–800. Don't rewrite [scripts/fetch-google-fonts.mjs](scripts/fetch-google-fonts.mjs) to "fix" it.
- **CustomCursor `BACK` label residue.** [components/interactive/CustomCursor.tsx](components/interactive/CustomCursor.tsx) clears its hover state via a dedicated `resetHoverState()` called from `mouseleave` / `scroll` / `window.blur` / `visibilitychange` / MutationObserver unmount. If you add new hover-label semantics, route them through this helper rather than mutating `hoverEl.current` directly.
- **MusicPlayer "click implies play".** Clicking any track in the playlist must immediately enter play state — track switches set an explicit play-intent flag consumed by the `audio.load()` → `audio.play()` chain in [components/interactive/MusicPlayer.tsx](components/interactive/MusicPlayer.tsx). Don't add an "only auto-play if already playing" guard.
- **ActivationLever is a `<button>`, not a `<div>`.** It carries `data-cursor-label` and `aria-label`. The discharge lever's label flips to `FULL CHARGE REQUIRED` while battery is below threshold (see [components/layout/LeftPanel.tsx:27-31](components/layout/LeftPanel.tsx)). Keep the button semantics if you restyle it.
- **Don't shell out to `coscli` in scripts.** Earlier docs/script comments referenced `coscli sync` / `coscli cp` commands; the workflow is **web-console-only** in this project. The trailing `console.log` in [scripts/fetch-google-fonts.mjs](scripts/fetch-google-fonts.mjs) prints the web-console steps directly — keep it that way.
