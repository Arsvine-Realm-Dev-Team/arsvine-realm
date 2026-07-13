# Architecture Notes

This document explains the current architecture of **ARSVINE REALM**. It is intended for development agents and maintainers who need to change behavior without breaking established conventions.

## Technical baseline

- Next.js 16 with **Pages Router**.
- React 19.
- TypeScript.
- SCSS Modules plus shared SCSS partials.
- `next-intl` 4 for UI localization.
- MDX through `next-mdx-remote`.
- Three.js / `@react-three/fiber` / `@react-three/drei` / `@react-three/cannon` for desktop effects.
- GSAP and Web Animations API for interaction and transitions.
- Vitest with `jsdom` for core logic tests.
- Custom Node.js server through `server.js`.

The project intentionally remains on Pages Router. Do not introduce App Router folders unless the project is explicitly migrated.

## Route model

All user-facing route adapters live under `src/pages/[locale]/...`. They parse route input and own SSG/ISR contracts; feature UI and server loaders live under `src/features/`.

| Route | Purpose |
|---|---|
| `/[locale]` | HUD home page with primary navigation columns. |
| `/[locale]/content` | Content aggregation page with hash sections such as `#works`, `#experience`, `#blog`, `#life`. |
| `/[locale]/{works,experience,life,friends,about,contact,tweets,copyright}` | Canonical section or standalone pages. |
| `/[locale]/blog/[slug]` | Blog detail page; SSG with `fallback: 'blocking'` and ISR. |
| `/[locale]/web/[id]` | Work/project detail page. |
| `/[locale]/life/[slug]` | Life detail page. |
| `/[locale]/access/[group]` | Standalone TOTP gate. |
| `/[locale]/rss.xml` | Per-locale RSS. |
| `/sitemap.xml` | Site-wide sitemap. |
| `/robots.txt` | Dynamic robots response. |

## Locale middleware

`proxy.ts` handles locale routing plus `GEO_COUNTRY` cookie management for UI-only geo hints.

Rules:

1. Skip API, Next internals, Vercel internals, static asset prefixes, and file-extension paths.
2. If the path already starts with a supported locale, forward it unchanged.
3. If the path is bare, redirect to `/<locale>/<rest>`.
4. Locale selection order is `NEXT_LOCALE cookie > Accept-Language > zh-CN`.
5. Do not use IP-based geolocation for language selection.
6. If the first segment looks like an unsupported BCP-47 locale, strip it before adding the selected locale to avoid paths like `/en/fr/web/1`.

`src/app/i18n/config.ts` is the source of truth for supported locales, HTML language tags, Open Graph locales, and RSS language values.

## State and layout contexts

### `features/hud/model/HudProvider.tsx`

Composes site-wide interactive state and effects:

- loading sequence;
- power/battery/inversion state;
- real-time client-side stats;
- home-page typing effects;
- column hover copy/state.

### `features/navigation/model/TransitionProvider.tsx`

Controls animated navigation. Internal navigation should use:

```ts
useTransition().navigateTo(url)
```

instead of `router.push()`. This preserves home/content/detail transitions, column retract/expand behavior, and blog-detail fade behavior.

It also supports `setBackOverride()` so detail views and lightboxes can intercept BACK behavior.

### `features/navigation/model/LayoutAnchorsContext.tsx`

Registers the active scroll container. This is required because the layout uses a locked-height content container; deep-link scrolling must target that container rather than the document viewport.

## Route loading overlay

`useRouteLoadingKind(router)` decides the loading overlay variant from the **source pathname**, not the target URL.

This matters because:

- home/content → blog detail should use the right-side/default overlay because the left panel is still visible;
- blog detail → blog detail should use the standalone overlay because the left panel is hidden.

Do not flip this logic to target-based selection; it regresses one of the two directions.

## Content sources

The project has two content sources.

### 1. Bundled typed data

Structured site data is co-located with its owning feature, while global site
configuration lives in `src/shared/config/`:

```text
src/features/portfolio/contracts/data/
src/features/experience/contracts/data/
src/features/life/contracts/data/
src/features/profile/contracts/{skills,friendLinks}/
src/shared/config/site.ts
```

Each trilingual topic generally has:

```text
index.ts   # zh-CN fallback
en.ts
zh-TW.ts
```

`src/app/i18n/data.ts` maps `(topic, locale)` to modules through an explicit static registry. This is intentional. Dynamic `require` is not used.

### 2. External GitHub content repository

When configured through server-side environment variables, blog posts and tweets are loaded from an external private content repository:

```env
GITHUB_OWNER=ArsvineZhu
GITHUB_REPO=arsvine-content
GITHUB_BRANCH=main
GITHUB_READ_TOKEN=github_pat_xxx
```

Expected repository shape:

```text
blog-index.json
blog/<slug>/
  zh-CN.mdx
  zh-TW.mdx
  en.mdx
  ja.mdx   # optional content-only locale
  ru.mdx   # optional content-only locale
  fr.mdx   # optional content-only locale
tweets/
  index.json
  YYYY-MM.json
```

If the external repository is not configured, the site falls back to the bundled `content/blog/init/` post and the tweets page resolves to an empty state.

Tweet pages can also be rendered from synthetic stress data in development when `TWEETS_STRESS_TEST=1` is set.

## Blog parsing and reading time

`features/blog/server/blog.ts` parses post frontmatter, MDX, translation fallback state, and reading-time estimates.

Reading time uses an in-house estimator tuned for mixed CJK and Latin text. It strips code, inline code, HTML/JSX tags, and MDX import/export lines before counting.

Do not reintroduce `reading-time`; whitespace-tokenized estimators report meaningless values for CJK posts.

## Multilingual blog behavior

UI locales are `zh-CN`, `zh-TW`, and `en`.

Blog content can also expose optional content-only locales such as `ja`, `ru`, and `fr`. These do not change the UI language; they are selected inside the blog detail language switcher.

When a requested UI locale lacks a post variant, the blog layer falls back to the post's default/source locale and marks the translation state so the detail page can show a fallback banner.

## Protected posts

Protected posts use TOTP access and must not expose MDX content during static generation.

Configuration is stored in the external content index and server environment:

```json
{
  "access": { "mode": "totp", "group": "friends-a" }
}
```

```env
ACCESS_GRANT_SECRET=<long-random-string>
TOTP_GROUPS_JSON={"friends-a":{"current":"JBSWY3DPEHPK3PXP","period":30,"digits":6,"window":1}}
```

Flow:

1. `getStaticProps` returns sanitized metadata and `mdxSource: null` for protected posts.
2. The browser renders a loading shell and probes `/api/grant-check?group=...`.
3. If already granted, the client requests `/api/post-variant?slug=&locale=`.
4. If not granted, the TOTP gate posts to `/api/protected-verify`.
5. On success, the server signs an HttpOnly access-grant cookie.
6. The client then fetches the gated MDX body through `/api/post-variant`.
7. Direct unauthenticated protected-post variant fetches return `403`.

Important invariant: `_next/data/.../<slug>.json` must not contain protected body content.

## API routes

| Route | Purpose |
|---|---|
| `GET /api/hitokoto` | Server-side proxy for `v1.hitokoto.cn`; cached and timeout-protected. |
| `GET /api/grant-check?group=` | Checks signed access-grant cookie. |
| `GET /api/post-variant?slug=&locale=` | Returns serialized MDX for a specific post variant; protected posts require grant. |
| `POST /api/protected-verify` | Verifies TOTP and signs the access-grant cookie; rate-limited by client/group. |
| `GET /api/tweet-months?offset=&limit=` | Paginates tweet months from the external content repository. |
| `POST /api/revalidate` | Revalidates `/<locale>/tweets` for all locales. Guarded by `REVALIDATE_SECRET`. |
| `POST /api/revalidate-content` | Revalidates `/<locale>/content` and, when provided, `/<locale>/blog/<slug>` for all locales. Guarded by `REVALIDATE_SECRET`. |

The revalidation routes can optionally trust `X-Forwarded-For` when `TRUST_PROXY=1|true|yes` is set. Otherwise they fall back to the socket address for rate limiting.

## Desktop 3D effects

Desktop-only effects:

- `RainMorimeEffect` — atmospheric rain particle effect.
- `TesseractExperience` — interactive charging/physics effect using `@react-three/cannon` and `cannon-es`.

Both are dynamically imported with `ssr: false` and should not repeatedly unmount once ready. This avoids unnecessary GPU context destruction during route transitions.

Mobile skips the WebGL canvas and uses simplified charging behavior.

## Styling system

- Feature UI owns its SCSS Modules; cross-feature primitives live with `shared/ui/`.
- `src/app/styles/Shell.module.scss` is the application-shell style entrypoint; feature-specific section styles stay with their feature.
- Global tokens and font variables live in `src/app/styles/globals.scss`.

Important font variables:

| Variable | Use |
|---|---|
| `--font-display` | Decorative Latin-only HUD display text. Never use for CJK, accented Latin, translated strings, or user content. |
| `--font-hud` | HUD labels, numerals, blog headings, safer Latin text. |
| `--font-reading` | MDX body and long-form reading. |
| `--font-typewriter` | Typewriter and monospace effects. |

Mobile section anchors that may receive hash navigation or `scrollIntoView()` must have:

```scss
scroll-margin-top: var(--mobile-section-scroll-offset);
```

Do not replace this with JS scroll-offset helpers.

## Custom MDX components

The MDX renderer maps Markdown primitives and custom blocks. Two inline annotation components are especially important:

| Component | Behavior | Use |
|---|---|---|
| `<Term note="...">word</Term>` | Renders as native ruby annotation; always visible. | Proper nouns, abbreviations, short glosses. |
| `<Explain note="...">phrase</Explain>` | Tooltip/bottom-sheet explanation. | Longer sentence-level notes. |

`<Explain>` uses a focusable span rather than a button to avoid inline wrapping and centering issues. On mobile, it becomes a fixed bottom panel.
