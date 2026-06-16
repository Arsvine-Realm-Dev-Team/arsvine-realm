# AGENTS.md

This file provides guidance to Codex (codex.ai/code) when working with code in this repository. Content is shared with [CLAUDE.md](./CLAUDE.md) — both files cover the same project conventions and gotchas; either can serve as the single agent briefing.

## Project Overview

ARSVINE REALM is a personal post-apocalyptic HUD-themed portfolio + blog site built with **Next.js 16 (Pages Router)**, React 18, TypeScript, SCSS Modules, Three.js, GSAP, MDX, and **`next-intl` 4** for trilingual UI (`zh-CN | zh-TW | en`). Targets Node `24.x` on Vercel (Node 20.9+ also works locally).

## Commands

```bash
npm run dev        # Dev server via custom server.js (NOT next dev)
npm run build      # next build
npm start          # cross-env NODE_ENV=production node server.js
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
npm run test       # vitest run (single pass; no watch script)
```

Single test: `npx vitest run path/to/file.test.ts` or `npx vitest run -t "name pattern"`. Vitest config (`vitest.config.ts`) uses `jsdom` and matches `**/*.test.ts`. Tests live next to the source under `lib/` (e.g. `lib/blog-client.test.ts`, `lib/blog-post-state.test.ts`, `lib/content/access-api.test.ts`, `lib/tesseract-geometry.test.ts`).

### Lint config (`eslint.config.mjs`)

Flat config extends `eslint-config-next/core-web-vitals` and enables four React Compiler rules **as warnings**: `react-hooks/immutability`, `react-hooks/purity`, `react-hooks/refs`, `react-hooks/set-state-in-effect`. These flag legitimate patterns in animation / 3D / typewriter / cursor code (Tesseract, CustomCursor, useTypingEffect, LeftPanel avatar parallax). When touching those areas, expect warnings and prefer scoped `// eslint-disable-next-line` with a *reason* over rewriting working interaction code.

## Architecture

### Custom Server (`server.js`)

Dev and production servers both run `node server.js` — not `next dev` / `next start`. It loads `.env.local`, prepares the Next.js app, and adds graceful shutdown hooks. `npm run dev` / `npm start` rely on this; do not replace.

### Locale routing — `proxy.ts` (Next.js middleware) + `[locale]` segment

All user-facing pages live under `pages/[locale]/...`. The middleware (`proxy.ts`, exported as `proxy` with the standard Next.js middleware signature):

- Bypasses `/api`, `/_next`, `/_vercel`, common static prefixes, and any path with a file extension.
- For paths that already start with a supported locale (`zh-CN | zh-TW | en`): forwards them unchanged but injects an `x-geo-country` header (resolved via `geolocation()` from `@vercel/functions`, with `?_geo=XX` override and a `GEO_COUNTRY` cookie cache, 12h TTL). Cookie is written on the same response so SSR after a VPN switch reflects new geo on the *same* refresh.
- For bare paths (e.g. `/contact`): 308-redirects to `/<locale>/<rest>`, where locale is resolved as **`NEXT_LOCALE` cookie > `Accept-Language` > `defaultLocale` (zh-CN)**. Do **not** introduce IP-based geo language detection — the cookie set by `LanguageSwitcher` is the source of truth.
- If the first segment looks like a BCP-47 locale but isn't supported (e.g. `/fr/web/1`), it's stripped before prefixing the target locale, avoiding `/en/fr/web/1`-style 404s.

`i18n/config.ts` is the single source of truth: locales array, `defaultLocale`, `htmlLangMap`, `ogLocaleMap`, `rssLanguageMap`. Adding a locale requires updating this file, the three locale JSONs in `locales/`, the `data/<topic>/<locale>.ts` set, and the `proxy.ts` regex.

### State Management — two contexts + LayoutAnchorsContext

`contexts/AppContext.tsx` composes custom hooks into a single context:

- `useAnimationSequence` — loading screen sequence, column retract/expand phases.
- `usePowerSystem` — battery charge level, inversion toggle, Tesseract 3D activation.
- `useRealtimeStats` — wall-clock + system-uptime + current-visit-duration ticks (purely client-side; no network).
- `useFateTypingEffect` / `useEnvParamsTypingEffect` — typewriter text effects. `useFateTypingEffect` alternates `1 cycle preset tagline (en + zh)` with `1 hitokoto sentence` pulled from `/api/hitokoto`; on fetch failure the cycle silently falls back to a preset round and retries next iteration.
- `useColumnHover` — HUD text changes on navigation column hover.

`contexts/TransitionContext.tsx` — `navigateTo(url)` runs animated page transitions via Web Animations API (desktop: opacity slide + column retract/expand on home↔content; mobile: diagonal `clip-path` expand/collapse). Special-cases `goingBlogDetail` (fade out, push, fade in once `routeChangeComplete`). `setBackOverride()` lets detail views (lightboxes, etc.) intercept BACK; `handleBack()` consults the override, otherwise routes to `/<locale>`.

`contexts/LayoutAnchorsContext.tsx` — registers the active scroll container ref so deep-linked scrolling works inside the locked-height `MainLayout` instead of the document viewport.

### Page-level transition rules

- **Always** navigate via `useTransition().navigateTo()`, never `router.push()`. Direct `router.push` skips the transition animation and the column retract/expand on home↔content.
- `MainLayout` (`components/layout/MainLayout.tsx`) renders the global HUD, LeftPanel (avatar/levers/nav/env panel), MusicPlayer, RouteLoadingOverlay, and the page slot. On `isStandalone` routes (game / web / life / blog detail) the LeftPanel hides via `standaloneHide`; on others it stays visible.
- `useRouteLoadingKind(router)` decides the in-flight loading-overlay variant by the **source pathname**, not the target URL. Detail routes (`/game`, `/web/`, `/life/`, `/blog/`) use `'standalone'` (full-bleed overlay); home/content sources use `'default'` (right-side content-column overlay matching where the page body will land). See `hooks/useRouteLoadingKind.ts:18-25` and `useLayoutRouteMode.ts:18-23` — they share the standalone-pathname list.

### Routing Structure

| Path | Notes |
|---|---|
| `/[locale]` | Home: five navigation columns |
| `/[locale]/content` | All sections scrollable on one page (hash-based: `#works`, `#experience`, `#blog`, `#life`) |
| `/[locale]/{works,experience,life,friends,about,contact,tweets,copyright}` | Section/standalone pages |
| `/[locale]/blog` | 307-replace to `/[locale]/content#blog` (alias only) |
| `/[locale]/blog/[slug]` | MDX blog detail (SSG with `fallback: 'blocking'`, ISR `revalidate: 300`) |
| `/[locale]/posts.tsx` | `getServerSideProps` redirect → `/content#blog` (legacy alias) |
| `/[locale]/posts/[slug].tsx` | `getServerSideProps` redirect → `/blog/[slug]` (legacy alias) |
| `/[locale]/web/[id]` | Project detail |
| `/[locale]/life/[slug]` | Life detail |
| `/[locale]/access/[group]` | Standalone TOTP gate (used as `next` redirect target by middleware-style guards) |
| `/[locale]/license` | `getServerSideProps` 301 → `/copyright` |
| `/[locale]/copyright` | Bilingual MIT (source) + CC BY-NC-ND 4.0 (content) page |
| `/[locale]/rss.xml` | Per-locale RSS via `getServerSideProps` |
| `/sitemap.xml` | Site-wide sitemap (all locales) |
| `/robots.txt.tsx` | Dynamic from `getSiteUrl()` |

### Content System — TWO sources

**1. Bundled data (`data/<topic>/<locale>.ts`)**

Per-locale TypeScript files for projects, experience, life, skills, friend links, plus a single root `data/site.ts` (site identity, SEO, fonts, locale tokens) and `data/music.ts` (playlist). `lib/i18n-data.ts` is an explicit static registry mapping each locale to its module — adding a locale means adding both the data file and a new entry here. Avoid dynamic `require` (Next.js will warn).

**2. External content repo (`lib/content/github.ts`) — blog + tweets + TOTP**

When `GITHUB_OWNER`/`GITHUB_REPO`/`GITHUB_READ_TOKEN` are set, blog posts are loaded at runtime from a private GitHub repo via the GitHub Contents API (using the `Accept: application/vnd.github.raw` header). The repo carries:

- `blog/index.json` — `ContentBlogIndex` with per-post `slug`, `date`, `tags`, `pinned`, `availableLocales`, per-locale `variants`, and an `access: { mode: 'public' | 'totp', group? }` block. 60s in-process cache (`BLOG_INDEX_TTL_MS`).
- `blog/<slug>/<locale>.mdx` — actual post bodies, fetched on demand by `getPostBySlugAndContentLocale()`.
- Tweets in a separate repo, read via `lib/tweets/github.ts`.

`content/blog/init/` (in-tree) is the only post that ships in the repo as a fallback for fresh clones without the content repo configured.

`lib/blog.ts` parses every post via `gray-matter`, computes reading time with the in-house `estimateReadingMinutes()` (CJK 200 cpm + Latin 115 wpm slow-read pace; **do not** add the `reading-time` package back — it whitespace-tokenizes and reports `1 min` for any CJK post regardless of length). Code blocks / inline code / HTML/JSX tags / MDX `import|export` lines are stripped before counting. UI strings via `lib/format-reading-time.ts`. `BlogPostMeta` carries only `readingMinutes: number`.

**Multilingual blog content** — preferred layout is `<slug>/<locale>.mdx` per locale, plus optional content-only locales `ja | ru | fr` exposed via the per-post language switcher. When a UI locale lacks a variant, `lib/blog.ts` falls back to `defaultLocale` and marks `translationStatus: 'fallback'` so the detail page can show a banner.

### Protected blog posts (TOTP gate)

Posts with `access.mode === 'totp'` go through a runtime gate. The flow:

1. `pages/[locale]/blog/[slug].tsx` `getStaticProps` returns **sanitized meta** (empty excerpt/tags, `readingMinutes: 0`) and `mdxSource: null` for protected posts. **No ciphertext is ever placed in props** — `_next/data/<buildId>/<locale>/blog/<slug>.json` carries only sanitized meta.
2. The page renders `BlogStateShell` (loading "正在解码传输…") while the client probes `/api/grant-check?group=...`. If granted, the variant fetch effect calls `/api/post-variant?locale=<lang>&slug=<slug>` (gated server-side by `hasValidAccessGrant`) and stores the MDX in reducer state. If not, `ProtectedPostGate` renders a 6-digit TOTP input that POSTs `/api/protected-verify`; on success the access-grant cookie is set and `markAuthGranted()` advances the reducer.
3. Direct fetches of `/api/post-variant` for protected posts return 403 without the cookie.
4. Prev/next links in the footer pass `prefetch={post.access.mode === 'public'}` so `<Link>` doesn't auto-prefetch protected `_next/data` JSON.

State machine lives in `lib/blog-post-state.ts` (`blogPostStateReducer` + `BlogPostViewState` / `BlogPostAuthState`), driven by `hooks/useBlogPostState.ts`. **Two race-conditions burned us — preserve their fixes:**

- The auth-probe `useEffect` short-circuits when `state.authState !== 'checking'` and lists `state.authState` in deps. Without this, navigating between protected posts in the **same `access.group`** leaves `[access.group, requiresAuth]` referentially equal, the effect never re-fires, and the page hangs in `'authChecking'` forever. See `useBlogPostState.ts:186-227`.
- The reducer's `authResolved` action **clears `activeRequestKey` and `loadingLocale` in both branches** (granted *and* required), not just on `'required'`. Without this, public→protected navigation produces a stale render where `state.authState === 'granted'` is true but the new slug fires a variant fetch that is then aborted by `resetArticle`; the leftover `activeRequestKey` then dedups the next legitimate fetch and the page hangs. See `lib/blog-post-state.ts:161-181`.

### API routes (`pages/api/`)

| Route | Purpose |
|---|---|
| `hitokoto.ts` | Server-side proxy for `https://v1.hitokoto.cn` (categories `d|i|k`, length 10–30). 60s in-process cache, 5s `AbortController` timeout. Returns `200 { text }` or `502 { error: 'upstream_unavailable' }`. Consumed by `useFateTypingEffect`. |
| `grant-check.ts` | `GET ?group=...` → `{ granted: boolean }`. Reads access-grant cookie via `hasValidAccessGrant`. |
| `post-variant.ts` | `GET ?slug=&locale=` → MDX-serialized variant. 403 for protected posts without grant. |
| `protected-verify.ts` | `POST { group, token, next }` → verifies TOTP via `lib/content/totp.ts` (with previous-secret window for rotation). On success sets the access-grant cookie via `lib/content/access-grant.ts` (HMAC-signed payload, 1h TTL, HttpOnly). Rate-limited per `(client-ip, group)` by `lib/content/rate-limit.ts`. |
| `tweet-months.ts` | Paginated tweet months from the private tweets repo. Sets `Cache-Control: private, no-store`. |
| `revalidate.ts` / `revalidate-content.ts` | On-demand ISR triggers, gated by `REVALIDATE_SECRET`. |

### 3D Effects (Desktop Only)

- `RainMorimeEffect` — background rain particle effect.
- `TesseractExperience` — interactive 3D charging animation (activates via lever pull). Uses `@react-three/cannon` + `cannon-es` for rigid-body physics; mobile skips the WebGL canvas and charges the battery on an interval inside `MainLayout` (see `useMobileTesseractCharge`).
- Both are dynamically imported with `ssr: false` and **never unmount once ready** (avoids GPU-context destruction during transitions). Gated on `webglReady && isDesktop` in `MainLayout`.

### Avatar parallax + chromatic aberration (LeftPanel)

`components/layout/LeftPanel.tsx` ref + `useEffect` + rAF lerp writes CSS vars (`--avatar-dx`, `--avatar-dy`, `--avatar-split`) onto `.logoContainer`. Mirrors the CustomCursor pattern (window mousemove + refs + direct DOM writes — no `useState` in the loop). Gated on `useResponsive().isDesktop`. SCSS extends the existing filter chain with two `drop-shadow` layers for the cyan/magenta RGB-split (`styles/_layout.scss:119-155`), and `@media (hover: none), (pointer: coarse)` zeros everything as a belt-and-suspenders mobile guard. The parallax `transform` is written with `!important` to override the `revealLogo` keyframe's `forwards` end-state `transform: scale(1)` — without `!important` the parallax silently breaks. Color split tracks **velocity (per-frame Δ)** through a low-pass filter with asymmetric attack/release alphas (0.5 up, 0.12 down), so it appears only while the cursor moves and decays to 0 when stopped — not based on absolute offset.

### Styling

- SCSS Modules per component (`*.module.scss`).
- Shared partials: `styles/_animations.scss`, `_columns.scss`, `_layout.scss`, `_sections.scss`.
- CSS custom properties for theming live in `styles/globals.scss`:
  - `--ark-highlight-green` — primary accent color (change to retheme).
  - `--ark-inverted-*` — inverted/negative mode colors (lever toggle).
  - `--mobile-hud-clearance` / `--mobile-section-scroll-offset` / `--mobile-detail-top-offset` — mobile-only top-edge gutters that include `env(safe-area-inset-top)`. Used by `.contentSection` / `.friendLinkSection` / `.detailViewWrapper` as `scroll-margin-top` / `padding-top` so section headings stay clear of the HUD on hash navigation. `scrollIntoView({ block: 'start' })` honors `scroll-margin-top` per CSSOM spec — a JS scroll-offset helper is intentionally **not** used.
- Font CSS variables in `styles/globals.scss`:
  - `--font-display` — `'ZELDA Free'` (post-apocalyptic title accent; **Latin-only — no CJK / no full accented Latin glyphs**, use only for short English-ish display strings; never for body, blog headers, or anything that may receive non-ASCII input).
  - `--font-hud` — `'Dosis'` (HUD numerals/labels; also blog post headers as a Latin-extended-safe sans).
  - `--font-reading` — `'Noto Serif SC', 'Source Han Serif SC', 'Noto Sans SC', serif` (MDX body).
  - `--font-typewriter` — Courier stack for monospace/typing FX.

### Custom MDX components (`components/mdx/MDXComponents.tsx`)

Maps every Markdown primitive (`h1..h3`, `p`, `blockquote`, `a`, lists, `strong`, `em`, `hr`, `code`, `pre`) plus four MDX-only blocks (`Lead`, `Aside`, `Mark`, `Ref`) and two annotation primitives:

- `<Term note="...">word</Term>` — ruby annotation, always visible above the term (`components/mdx/Term.tsx`). Renders as native `<ruby><rt>` so plain-text copy and old browsers degrade to `word(note)`. For proper nouns, abbreviations, foreign-language terms — anything where a tiny inline gloss is enough.
- `<Explain note="...">phrase</Explain>` — sentence-level tooltip (`components/mdx/Explain.tsx`). Trigger uses `<span tabIndex={0}>` (NOT `<button>` — buttons are atomic inline-blocks and would force `text-align: center` plus block multi-word line wrapping). Hover/focus on desktop, click on touch; outside-pointerdown / Escape close it. Mobile (`max-width: 767px`) restyles the tooltip into a fixed bottom sheet (`styles/MDXContent.module.scss`).

### Self-hosted Google Fonts (`cdn.arsvine.com/fonts/`)

The site loads Google Fonts via `<link rel="stylesheet">` in `pages/_document.tsx` pointing at the self-hosted copy on Tencent COS, not `fonts.googleapis.com` (blocked in mainland China). Pipeline:

1. **Source of truth**: `data/site.ts` `siteConfig.fonts.googleStylesheet` (canonical Google Fonts URL — family + weight selection) and `siteConfig.fonts.cdnStylesheet` (rewritten CSS URL on COS).
2. **Generator**: `scripts/fetch-google-fonts.mjs` reads the URL, fetches Google's CSS with a modern Chrome UA (otherwise Google serves bulkier `.ttf`), downloads every `.woff2`, rewrites all `url()` to `cdn.arsvine.com/fonts/<family>/<file>`, and writes the result to `public/_fonts-staging/` (gitignored).
3. **Upload**: **manual via Tencent COS web console — this project does NOT use the `coscli` CLI.** Upload the entire `public/_fonts-staging/` tree to `cos://arsvine-cdn/fonts/`. The script's tail output prints exact metadata-header steps.

**Variable Font note (critical, easy to misread):** Google's Fonts API returns Variable Fonts (VF) when multiple weights are requested in one URL. The CSS contains separate `@font-face` blocks with different `font-weight:` values all pointing at the **same** woff2 file. **This is correct** — the file is a VF whose `wght` axis covers a continuous range; the browser interpolates the right weight at render time. Do **not** "fix" this by forcing one-file-per-weight; you would download 4× the bytes and end up with worse fonts. The fact that the local file is named `dosis-300-normal-000.woff2` does not mean it only contains weight 300 — the `300` is just the first weight that claimed that URL during dedup.

**COS metadata-header trap (do NOT repeat):** When configuring per-object custom headers in the COS web console, the **Key** field is the header name (e.g. `Cache-Control`) and the **Value** field is the value only (e.g. `public, max-age=31536000, immutable`). Pasting `Cache-Control: public, ...` into the Value field produces a `Cache-Control: Cache-Control: ...` response header. Firefox rejects woff2 with a malformed `Content-Type` and silently falls back to a system font — on Simplified-Chinese-default Windows this looks like "rare Traditional Chinese characters render as tofu". Required headers:

| Object | Content-Type | Cache-Control |
|---|---|---|
| `google-fonts.css` | `text/css; charset=utf-8` | `public, max-age=86400, must-revalidate` |
| `*.woff2` | `font/woff2` | `public, max-age=31536000, immutable` |

Verify with: `curl -I -H "Referer: https://arsvine.com/" https://cdn.arsvine.com/fonts/google-fonts.css` — `Content-Type:` and `Cache-Control:` must each appear exactly once.

### Local Dev — COS Referer

COS `cdn.arsvine.com` only accepts Referer `*.arsvine.com`. Run `scripts/dev-host-setup.cmd` (double-click, self-elevating UAC) to add `dev.arsvine.com → 127.0.0.1` to Windows hosts, start the dev server, and auto-clean on exit. Sub-commands: `-HostsOnly` (write hosts only), `-Remove` (clean up). Open `http://dev.arsvine.com:3000` — Referer becomes `dev.arsvine.com:3000`, COS lets it through.

### Favicon Layout

Icon files live in two places in `public/`:

- Root (`/favicon.ico`, `/apple-touch-icon.png`) — browsers blind-probe these; must stay at root.
- `/icons/` — the rest (`favicon-16x16`, `favicon-32x32`, `android-chrome-192x192`, `android-chrome-512x512`, `site.webmanifest`).

Regenerate from a transparent source with `node scripts/regen-favicons.mjs`. If the source is a white-background JPG, first run `node scripts/jpg-to-transparent-png.mjs`.

### Path Aliases

Configured in both `tsconfig.json` and `jsconfig.json`:

- `@/*` → project root
- `@/components/*`, `@/styles/*`, `@/hooks/*`, `@/contexts/*`, `@/data/*`, `@/types/*`, `@/lib/*`

### Environment Variables

See `.env.example` for the full set. Key variables:

- `PORT` — server port (default 3000).
- `NEXT_PUBLIC_SITE_URL` — sitemap, RSS, robots, Open Graph URLs.
- `NEXT_PUBLIC_UMAMI_SRC` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID` / `NEXT_PUBLIC_UMAMI_DOMAINS` — optional Umami analytics; injected in `pages/_document.tsx` with `defer` / `data-do-not-track="true"` / `data-exclude-search="true"`. Domain whitelist auto-skips `localhost` and Vercel preview.
- `NEXT_PUBLIC_MEDIA_CDN` — optional media CDN base URL (e.g. `https://cdn.arsvine.com`). Consumed by `data/music.ts`; when unset the music player serves files from `/public/music/` instead.
- `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` / `GITHUB_READ_TOKEN` — private content repo for blog posts. Server-side only, no `NEXT_PUBLIC_` prefix.
- `ACCESS_GRANT_SECRET` — HMAC secret for the access-grant cookie. Long random string.
- `TOTP_GROUPS_JSON` — JSON map `{ "<group>": { current, previous?, period?, digits?, window? } }`. Consumed by `lib/content/totp.ts`.
- `TWEETS_GITHUB_*` — separate private repo for tweets.
- `REVALIDATE_SECRET` — gates `/api/revalidate*` ISR triggers.
- `TWEETS_STRESS_TEST=1` (+ `TWEETS_STRESS_YEARS` / `_MONTHS_PER_YEAR` / `_TWEETS_PER_MONTH`) — dev-only synthetic tweet generation; bypasses the real repo.

### Development Scripts

| Script | Purpose |
|---|---|
| `scripts/dev-host-setup.cmd` (.ps1) | Windows hosts/proxy management + dev server bootstrap (COS Referer compatibility). Self-elevates via UAC. |
| `scripts/convert-images.mjs` | Batch image conversion (webp/jpg/png/avif), output to `scripts/images/out/`. |
| `scripts/regen-favicons.mjs` | Regenerate the full favicon set from a transparent-source image. |
| `scripts/jpg-to-transparent-png.mjs` | Alpha-unmix a white-background JPG to a true-transparency PNG. |
| `scripts/make-white.mjs` | Force-white a transparent PNG (preprocessor for some COS/Twitter previews). |
| `scripts/fetch-google-fonts.mjs` | Refresh self-hosted Google Fonts staging under `public/_fonts-staging/`. Follow the manual COS web-console upload steps printed at the end of the run; never invoke `coscli`. |

## Key Conventions

- Pages Router (not App Router). All pages are in `pages/`.
- Components use a mix of default exports and named exports; pages use default exports.
- `strict: false` in tsconfig — some files use implicit any; don't tighten it without a sweep.
- Navigation always goes through `useTransition().navigateTo()` instead of `router.push()` to preserve animated transitions.
- Three.js / WebGL components are dynamically imported with `ssr: false` and never unmount once ready (avoids GPU-context destruction).
- Locale resolution at `/` is `NEXT_LOCALE cookie > Accept-Language > defaultLocale (zh-CN)` (`proxy.ts`). No IP-based geo language detection.
- All section anchors that may receive `scrollIntoView` or hash navigation on mobile must set `scroll-margin-top: var(--mobile-section-scroll-offset)` (see `styles/_sections.scss`). No JS scroll-offset helpers.

## Common Gotchas (real bugs that bit us; don't re-introduce)

- **Don't reach for `reading-time` again.** It splits on whitespace, so any CJK post returns 0 minutes and the `Math.max(1, ...)` floor hides it as `1 min`. Use the in-house `estimateReadingMinutes()` in `lib/blog.ts`.
- **`ZELDA Free` is Latin-only.** It looks great for English HUD strings but has no CJK glyphs and incomplete accented Latin. Don't use `--font-display` on any header that may contain user-supplied or translated text — blog post titles in particular were migrated from `--font-display` to `--font-hud` (Dosis 500). See `styles/BlogDetailView.module.scss`.
- **COS custom-header Value field is value-only.** Pasting `Cache-Control: public, ...` into the Value field produces a `Cache-Control: Cache-Control: ...` response header. Firefox then rejects the woff2 silently and falls back to system fonts — uncommon CJK characters render as tofu. See "Self-hosted Google Fonts" above.
- **Google Fonts VF deduplication is intentional.** A `@font-face` block with `font-weight: 500` pointing at `dosis-300-normal-000.woff2` is **not** a bug — it's a Variable Font whose `wght` axis covers 200–800. Don't rewrite `scripts/fetch-google-fonts.mjs` to "fix" it.
- **Don't shell out to `coscli` in scripts.** Earlier docs/script comments referenced `coscli sync` / `coscli cp`; the workflow is **web-console-only** in this project. The trailing `console.log` in `scripts/fetch-google-fonts.mjs` prints the web-console steps directly.
- **CustomCursor `BACK` label residue.** `components/interactive/CustomCursor.tsx` clears its hover state via a dedicated `resetHoverState()` called from `mouseleave` / `scroll` / `window.blur` / `visibilitychange` / MutationObserver unmount. If you add new hover-label semantics, route them through this helper rather than mutating `hoverEl.current` directly.
- **MusicPlayer "click implies play".** Clicking any track in the playlist must immediately enter play state — track switches set an explicit play-intent flag consumed by the `audio.load()` → `audio.play()` chain in `components/interactive/MusicPlayer.tsx`. Don't add an "only auto-play if already playing" guard.
- **MusicPlayer doesn't auto-open on mobile.** It only auto-opens after 1.5s on desktop (`!useResponsive().isMobile`). Touch users open it via the HUD button. If you reintroduce auto-open behavior, keep this guard — a draggable panel covering 60–70% of a phone screen on first paint is not okay.
- **ActivationLever is a `<button>`, not a `<div>`.** It carries `data-cursor-label` and `aria-label`. The discharge lever's label flips to `FULL CHARGE REQUIRED` while battery is below threshold (`components/layout/LeftPanel.tsx`). Keep button semantics if you restyle it.
- **Blog reveal-animation must clear `transform` on `transitionend`.** `pages/[locale]/blog/[slug].tsx` reveals MDX paragraphs with `IntersectionObserver` + `transform: translateY(20px) → translateY(0)`. After the transition completes, the listener sets `transform: 'none'` (NOT `''` — empty string would fall back to the SCSS initial `translateY(20px)`). The reason is subtle: any non-`none` `transform` creates a CSS stacking context, which traps `<Explain>`'s absolute-positioned tooltip inside its own paragraph — the next sibling paragraph then layers on top of it regardless of `z-index`. Preserve the post-transition `transform: none` step if you rewrite this.
- **`<AnimatedTitleChars>` defaults to UPPERCASE.** `components/shared/AnimatedTitleChars.tsx` is shared by web/life detail heroes (which want uppercase) and blog post headers (which don't). Blog must pass `uppercase={false}` — otherwise `"The Moon Does Not Have to Be Full Every Night"` becomes `"THE MOON ..."`. The component also wraps non-CJK words in a `wordWrapperClassName` span (`white-space: nowrap`) to keep long Latin words intact at narrow widths; CJK runs are left unwrapped so they break by character. Always pass `wordWrapperClassName={styles.wordWrapper}` and define a `.wordWrapper { display: inline-block; white-space: nowrap }` rule in the matching SCSS module.
- **Protected-post hangs (two distinct races, both fixed — preserve the fixes).** See "Protected blog posts" above. (1) Auth-probe effect in `useBlogPostState.ts` must short-circuit on `state.authState !== 'checking'` and depend on `state.authState`; (2) reducer's `authResolved` must clear `activeRequestKey` and `loadingLocale` in *both* branches.
- **Loading overlay placement is source-driven, not target-driven.** `useRouteLoadingKind` reads `router.pathname` (the page you're leaving) to decide `'standalone'` vs `'default'` overlay. blog→blog must be standalone (LeftPanel is hidden); home→blog must be default (right side, since LeftPanel is still visible). Don't flip this to a target-based decision — it'll regress one direction or the other.
- **Avatar parallax `transform` needs `!important`.** `revealLogo` keyframe has `forwards` fill mode and locks `transform: scale(1)` after the entry animation. The mousemove rAF writes `transform` via `style.setProperty('transform', ..., 'important')` to override this. If you switch to `style.transform =`, the parallax silently breaks while the keyframe is still cached.
