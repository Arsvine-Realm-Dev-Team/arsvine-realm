[中文](./README.md) | **English**

# ARSVINE REALM

ARSVINE REALM is a personal portfolio and blog site built around a post-apocalyptic sci-fi HUD visual language. It presents projects, experience, life records, blog posts, friend links, and contact information, while keeping interactive features such as real-time visitor stats, a music player, animated route transitions, and WebGL/Three.js atmospheric effects.

![Preview](./docs/preview.png)

## Current Project Status

- **Project type**: personal website, not a generic template guide.
- **Site name**: `ARSVINE REALM`.
- **Author**: `Arsvine Zhu`.
- **Technical baseline**: Next.js 16 Pages Router, React 18, TypeScript, SCSS Modules, Three.js, GSAP, MDX, and a custom Node.js server.
- **Runtime requirement**: Node.js `24.x` (matches the Vercel Project setting; Node 20.9+ still works locally as a compatibility floor).
- **Testing status**: no test framework and no `test` script are configured. Use `npm run lint` and `npm run build` for verification.

## Features

- **HUD-style home page**: five navigation columns leading to works, experience, blog, life, contact/about, and related sections.
- **Animated page transitions**: route changes are coordinated through `TransitionContext`; navigation should go through `useTransition().navigateTo()` instead of direct `router.push()`.
- **Aggregated content page**: `/content` presents the main sections in one scrollable page with hash navigation.
- **Project detail pages**: `/web/[id]` supports rich project detail content, Markdown-style links, Bilibili/GitHub icon links, and copyable tokens configured in `data/projects.ts`.
- **Life detail pages**: `/life/[slug]` renders detailed records from the life data set.
- **MDX blog**: `content/blog/*.mdx` powers the blog list, post pages, RSS feed, and sitemap entries.
- **Music player**: the playlist lives in `data/music.ts`; audio files are placed in `public/music/`. Any format supported by the browser's native `<audio>` decoder can be used, including `.mp3`, `.m4a`, `.flac`, `.wav`, and `.ogg`.
- **Real-time stats**: the custom `server.js` provides `/api/sse/stats` and `/api/stats` for online visitors, total visits, and accumulated runtime.
- **Hitokoto proxy**: `/api/hitokoto` proxies `v1.hitokoto.cn` with a 60-second in-process cache and a 5-second timeout. The home-page typewriter alternates between the configured tagline and one hitokoto sentence per cycle.
- **Copyright & License page**: `/copyright` shows bilingual terms (MIT for source, CC BY-NC-ND 4.0 for original content); `/license` permanently redirects to `/copyright`.
- **SEO / feed files**: `/sitemap.xml`, `/rss.xml`, and `/robots.txt` are generated from site configuration.
- **Desktop 3D effects**: `RainMorimeEffect` and `TesseractExperience` (powered by `@react-three/cannon` physics) are dynamically imported with SSR disabled and run only on the client.

## Quick Start

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

> Note: both development and production use the custom `server.js`. Do not replace it with `next dev` or `next start`, otherwise the SSE stats system will not run as designed.

## Commands

```bash
npm run dev      # Start the custom development server: node server.js
npm run build    # Production build: next build
npm start        # Production server: cross-env NODE_ENV=production node server.js
npm run lint     # ESLint flat config: eslint .
```

## Local Dev & COS Referer

The Tencent COS bucket behind `cdn.arsvine.com` only accepts Referer values matching `arsvine.com` / `*.arsvine.com`; `localhost` and empty Referer are both rejected. To let media from `cdn.arsvine.com` load during local development, map `dev.arsvine.com` to the loopback address.

Double-click [scripts/dev-host-setup.cmd](scripts/dev-host-setup.cmd) — it handles:

1. UAC self-elevation to Administrator.
2. Writing `127.0.0.1  dev.arsvine.com` to the Windows hosts file (with a daily `hosts.bak.<yyyymmdd>` backup the first time).
3. Starting `npm run dev` (port 3000).
4. On Ctrl+C: graceful stop of the dev server, removing the hosts entry (only if it added it), and `ipconfig /flushdns`.

Manual sub-commands:

```bash
.\scripts\dev-host-setup.cmd -HostsOnly    # write hosts only, do not start dev server
.\scripts\dev-host-setup.cmd -Remove       # clean up the dev.arsvine.com hosts entry
```

> ⚠️ The script edits `C:\Windows\System32\drivers\etc\hosts` and requires admin rights, which it obtains through the standard UAC prompt. If the window is closed via the X button instead of Ctrl+C, the hosts entry may be left behind — use `-Remove` to clean up.

Open `http://dev.arsvine.com:3000` in the browser; the Referer becomes `dev.arsvine.com:3000` and COS accepts the request.

## Development Scripts

| Script | Purpose |
|---|---|
| `scripts/dev-host-setup.cmd` / `.ps1` | Local dev hosts management + dev server launcher (COS Referer compatibility). Double-click the `.cmd`. |
| `scripts/convert-images.mjs` | Batch image format converter (webp/jpg/png/avif), output to `scripts/images/out/`. |
| `scripts/regen-favicons.mjs` | Regenerate the full favicon set from a transparent source image. |
| `scripts/jpg-to-transparent-png.mjs` | Alpha-unmix a white-background JPG into a true-transparency PNG. |

## Configuration and Content Maintenance

The project now keeps frequently changed content in configuration and data files. Prefer editing `data/`, `content/`, `public/`, and environment variables instead of changing component logic directly.

### Favicon

Icon files live in two places under `public/`:

- `public/favicon.ico` / `public/apple-touch-icon.png` — **kept at the root** because browsers blind-probe these paths (bookmarks, social card fallbacks, iOS "Add to Home Screen").
- `public/icons/` — everything else (`favicon-16x16.png`, `favicon-32x32.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `site.webmanifest`).

All generated from `public/avatar_transparent.webp` (transparent source). After replacing the avatar, regenerate the full favicon set with:

```bash
node scripts/regen-favicons.mjs
```

If the new source is a white-background JPG, convert it to transparent first:

```bash
node scripts/jpg-to-transparent-png.mjs path/to/source.jpg public/favicon-source-transparent.png
# then point scripts/regen-favicons.mjs SRC at that PNG and re-run
```

### Site Configuration

`data/site.ts` is the main entry point for site-wide configuration, including:

- site name, author, email, and copyright start year
- `metaTitle`, `metaDescription`, and RSS description
- home page typing tagline (cycled together with hitokoto sentences)
- social links
- favicon, Open Graph image, and Twitter image
- Google Fonts / preconnect entries
- `htmlLang`, `og:locale`, and RSS language
- page-level SEO and headings for `/content`, `/friends`, and `/copyright`

To make sitemap, RSS, robots, and Open Graph URLs use the production domain, set:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
```

You can also set a default `url` in `data/site.ts`; the environment variable has higher priority.

### Content Data

| File | Purpose |
|---|---|
| `data/projects.ts` | Projects / portfolio data, plus detail-page `copyableTokens` |
| `data/experience.ts` | Education, work, and experience timeline |
| `data/life.ts` | Games, travel, life records, and some configurable Life-section text |
| `data/skills.ts` | Skill tree |
| `data/friendLinks.ts` | Friend links |
| `data/music.ts` | Music player playlist |
| `data/site.ts` | Site identity, SEO, font, locale, and asset configuration |

### Blog Posts

Create `.mdx` files in `content/blog/`:

```mdx
---
title: "Post Title"
date: "2026-01-01"
excerpt: "A short excerpt."
tags: ["tag-a", "tag-b"]
---

Write the body in Markdown / MDX.
```

The blog system reads frontmatter and generates:

- `/blog` list
- `/blog/[slug]` post pages
- `/rss.xml`
- `/sitemap.xml`

### Music Player

The playlist is configured in `data/music.ts`:

```ts
export const musicPlaylist = [
  {
    title: 'Song Title',
    artist: 'Artist Name',
    src: '/music/example.m4a',
  },
];
```

Audio files are hosted on **Tencent COS** (Hong Kong bucket `arsvine-cdn`, region `ap-hongkong`, public-read / private-write) and served from `cdn.arsvine.com` in production — direct from the COS origin, no Tencent CDN in front. `data/music.ts` builds the final `src` by prefixing `NEXT_PUBLIC_MEDIA_CDN`:

```env
NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
```

When the env is **unset** (typical local dev), `src` falls back to `/music/<file>` and reads from `public/music/` — drop the same filenames there to test playback offline.

The player uses HTML5 `<audio>`, so format support depends on the browser; modern browsers generally support `.m4a` / AAC.

> Audio files are usually large and are excluded from Git tracking by project convention. `public/music/README.md` documents the directory purpose.

### Remote Image Hosts

Remote image allow-list entries for Next.js `<Image>` are centralized in:

```text
config/image-hosts.js
```

When adding an image CDN or object-storage domain, edit only this file, then restart the dev server or rebuild. The defaults include `cdn.arsvine.com` (self-hosted media bucket on Tencent COS Hong Kong), `placehold.co` (placeholder images), and `images.unsplash.com` / `source.unsplash.com` (template samples).

> Post / content images should render via `next/image` with `unoptimized={true}` (direct-linking `cdn.arsvine.com`) to bypass Vercel Hobby's Image Optimization quota (1,000 source images / month) and avoid `/_next/image` re-fetches that would burn the COS outbound-traffic package. COS billing is pay-as-you-go beyond the 10GB monthly traffic package — configure a budget alert in Tencent Billing Center.

### Stats Persistence

`server.js` writes stats to `.stats.json` in the project root by default. If the deployment environment should not write to the project directory, set:

```env
STATS_FILE=/var/lib/portfolio/stats.json
```

Related endpoints:

- `GET /api/stats`: accumulated runtime and total visits
- `GET /api/sse/stats`: SSE stream for online visitors and total visits
- `GET /api/hitokoto`: server-side proxy for `v1.hitokoto.cn`, returns `{ text }`; 60-second in-process cache, 5-second timeout; falls back to `502 { error: 'upstream_unavailable' }` on upstream failure

## Environment Variables

See `.env.example`:

```env
PORT=3000
NEXT_PUBLIC_SITE_URL=https://example.com
# NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
# NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
# NEXT_PUBLIC_UMAMI_DOMAINS=your-domain.com,www.your-domain.com
# NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
# STATS_FILE=/var/lib/portfolio/stats.json
```

Notes:

- `PORT`: custom server port, default `3000`.
- `NEXT_PUBLIC_SITE_URL`: used by sitemap, RSS, robots, and Open Graph URLs.
- `NEXT_PUBLIC_UMAMI_SRC` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`: optional Umami script config; the `<script>` tag is only injected when `SRC` is set. The injection lives in `pages/_document.tsx` and always carries `defer` / `data-do-not-track="true"` / `data-exclude-search="true"`.
- `NEXT_PUBLIC_UMAMI_DOMAINS`: optional, comma-separated allowlist (no protocol). When set, the Umami tracker only reports under those domains — `localhost` and Vercel preview deployments are silently skipped, which keeps your stats clean.
- `NEXT_PUBLIC_MEDIA_CDN`: optional media CDN base URL (e.g. `https://cdn.arsvine.com`, backed by Tencent COS Hong Kong bucket `arsvine-cdn`). Consumed by `data/music.ts`; when unset the music player serves files from `/public/music/` instead.
- `STATS_FILE`: server-side stats persistence path; defaults to `.stats.json` in the project root.

### Umami Event Tracking (Optional)

Once the script is injected, pageviews are tracked automatically. To record custom events, simply add `data-umami-event` attributes — no JavaScript required:

```tsx
<a
  href={siteConfig.social.github}
  data-umami-event="Click Social"
  data-umami-event-platform="github"
>
  GitHub
</a>
```

Or call the tracker manually:

```ts
window.umami?.track('Open Life Item', { item: 'arknights' });
```

Event names have a 50-character limit; properties accept arbitrary key-value pairs. This repository does not pre-attach any event tags to components — add them where you actually want a signal.

## Routes

| Route | Description |
|---|---|
| `/` | Five-column home navigation |
| `/content` | Aggregated content page with hash sections such as `#works`, `#experience`, `#blog`, and `#life` |
| `/works` | Works section page |
| `/experience` | Experience section page |
| `/life` | Life section page |
| `/blog` | Blog list |
| `/web/[id]` | Project detail page |
| `/life/[slug]` | Life detail page |
| `/blog/[slug]` | MDX blog post page |
| `/friends` | Friend links |
| `/about` | About page |
| `/contact` | Contact page |
| `/copyright` | Copyright & License page (bilingual; MIT for source, CC BY-NC-ND 4.0 for content) |
| `/license` | Permanent redirect to `/copyright` |
| `/sitemap.xml` | Generated sitemap |
| `/rss.xml` | Generated RSS feed |
| `/robots.txt` | Generated robots file |

## Project Structure

```text
├── components/          # Page components, layout, interactions, visual effects
├── config/              # Externalized runtime/config fragments for Next.js and related tools
├── contexts/            # AppContext / TransitionContext
├── content/blog/        # MDX blog content
├── data/                # Site configuration and content data
├── hooks/               # Custom hooks
├── lib/                 # Blog parsing and utility logic
├── pages/               # Next.js Pages Router pages
├── public/              # Static assets, images, and music directory
├── styles/              # SCSS Modules and shared partials
├── types/               # TypeScript type definitions
└── server.js            # Custom Next.js + SSE server
```

## Tech Stack

- Next.js 16 (Pages Router)
- React 18
- TypeScript
- SCSS Modules / Sass
- Three.js / `@react-three/fiber` / `@react-three/drei`
- `@react-three/cannon` + `cannon-es` (Tesseract physics)
- GSAP
- MDX / `next-mdx-remote`
- Node.js custom server + SSE
- ESLint flat config + `eslint-config-next/core-web-vitals`

## Development Notes

- This project uses the Pages Router, not the App Router.
- `server.js` is the runtime entry. Do not replace it with `next dev` / `next start`.
- Global state primarily flows through `contexts/AppContext.tsx` and `contexts/TransitionContext.tsx`.
- Animation, 3D, typing, and pointer-interaction code may trigger React Compiler lint warnings. Avoid broad rewrites just to silence warnings unless there is a concrete bug.
- For configurable content, check `data/*.ts`, `config/*.js`, and `.env.example` first.
- There is no unit test framework; run at least `npm run lint` and `npm run build` before shipping.

## Deployment

```bash
npm run build
npm start
```

Or use a process manager:

```bash
pm2 start server.js --name arsvine-realm
```

Recommended production environment variables:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://your-domain.com
STATS_FILE=/persistent/path/stats.json
```

Make sure the runtime user can write to the directory containing `STATS_FILE`.

## License and Origin

This project evolved from a RainMorime-style portfolio codebase and has been adapted into the ARSVINE REALM personal site.

- **Source code**: [MIT License](./LICENSE)
- **Original content** (articles, images, notes, designs, etc.): [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/)

Full bilingual terms are available on the site at [`/copyright`](https://arsvine.com/copyright).
