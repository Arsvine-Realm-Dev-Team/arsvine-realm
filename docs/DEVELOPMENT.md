# Development Guide

This document is the day-to-day development guide for **ARSVINE REALM**. Keep this file focused on local setup, commands, assets, and maintenance workflows. Architecture-level details belong in [`ARCHITECTURE.md`](./ARCHITECTURE.md); deployment and external services belong in [`OPERATIONS.md`](./OPERATIONS.md); fragile historical fixes belong in [`GOTCHAS.md`](./GOTCHAS.md).

## Runtime baseline

- Node.js: `24.x` in production and Vercel project settings.
- Local compatibility: Node `20.9+` may work, but `24.x` is the documented target.
- Package manager: pnpm is the documented package manager.
- Framework mode: Next.js App Router. Routes and Route Handlers live under `src/app/`.
- Local/self-hosted server entry: `server.js` runs local development and optional self-hosted deployments. **It is not used in Vercel deployments** — Vercel runs the standard Next.js build output.

Do not replace the project scripts with `next dev` or `next start`. The custom server loads the standard environment-specific `.env*` chain with local files taking precedence, prepares Next.js, respects `PORT`, and includes graceful shutdown handling for local development and self-hosting.

## Quick start

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open `http://localhost:3000`. The locale middleware redirects `/` to the preferred locale path, usually `/zh-CN`.

## Common commands

```bash
pnpm dev           # node server.js
pnpm build         # next build
pnpm start         # cross-env NODE_ENV=production node server.js
pnpm lint          # eslint .
pnpm typecheck     # tsc --noEmit
pnpm test          # vitest run
pnpm check         # lint + typecheck + test + build
```

Run a single test file:

```bash
pnpm vitest run tests/features/blog/blog-client.test.ts
```

Run tests by name:

```bash
pnpm vitest run -t "reading time"
```

Vitest uses `jsdom` and matches `**/*.test.ts`. New tests should live under `tests/features/` when they exercise a feature; cross-feature primitives belong in `tests/shared/`, application composition in `tests/app/`, and repository-wide route contracts in `tests/repo/`.

## Local environment

Start from `.env.example`. The most common local values are:

```env
PORT=3000
NEXT_PUBLIC_SITE_URL=https://arsvine.com
NEXT_PUBLIC_CDN_BASE=https://cdn.arsvine.com
# GITHUB_OWNER=ArsvineZhu
# GITHUB_REPO=arsvine-content
# GITHUB_BRANCH=main
# GITHUB_READ_TOKEN=github_pat_xxx
```

Important rules:

- `NEXT_PUBLIC_*` variables are exposed to the browser. Do not put secrets there.
- `GITHUB_READ_TOKEN`, `ACCESS_GRANT_SECRET`, `TOTP_GROUPS_JSON`, `REVALIDATE_SECRET`, and Upstash tokens are server-side only.
- Without the external content repo variables, the blog falls back to `content/blog/init/` and the tweets page falls back to its empty state.
- To exercise the tweet archive UI without a live content repo, set `TWEETS_STRESS_TEST=1`. Optional knobs are `TWEETS_STRESS_YEARS`, `TWEETS_STRESS_MONTHS_PER_YEAR`, and `TWEETS_STRESS_TWEETS_PER_MONTH`. Keep stress mode out of production.

## Local COS Referer workflow

The media bucket behind `cdn.arsvine.com` only allows Referer values matching `arsvine.com` / `*.arsvine.com`. Localhost and empty Referer are rejected.

For local media playback or image loading through the real COS domain, use the Windows helper:

```powershell
scripts\dev-host-setup.cmd
```

The script:

1. self-elevates through UAC;
2. adds `127.0.0.1 dev.arsvine.com` to the Windows hosts file;
3. temporarily adds `dev.arsvine.com` to the current user's proxy bypass list when a system proxy is enabled;
4. starts the same dev server on port `80`;
5. cleans up hosts/proxy changes on normal exit.

Useful subcommands:

```powershell
scripts\dev-host-setup.cmd -HostsOnly
scripts\dev-host-setup.cmd -Remove
```

If using `-HostsOnly`, start the dev server manually on port 80:

```powershell
$env:PORT=80; pnpm dev
```

Then open `http://dev.arsvine.com`.

## Local COS workspace

`cos-workspace/` is now a purely local working directory and should stay out of Git.

Recommended media workflow:

```bash
pnpm assets:prepare
pnpm assets:build -- --publish-current
```

`pnpm assets:prepare` expects a full mirror of the current public bucket under:

```text
cos-workspace/public-root-legacy/
```

It then:

1. rewrites the mirror into canonical `public-root/realm/...` and `public-root/shared/...` paths;
2. normalizes object base names to short English kebab-case before the build step appends hashes;
3. regenerates `_meta/realm/{home,works,collections,links,audio}.json` plus logical asset-source metadata.

`pnpm assets:build -- --publish-current` resolves that metadata to actual hashed object keys in private `realm/catalog/versions/<version>/static-assets.json`. Static data keeps only catalog identities; ISR reads this catalog segment and never hard-codes hashes or old COS prefixes.

After `pnpm assets:build -- --publish-current`, upload:

- `dist/cos-upload/public-root/shared/` to the public bucket root `shared/`
- `dist/cos-upload/public-root/realm/` to the public bucket root `realm/`
- `dist/cos-upload/private-root/realm/catalog/` to the private bucket key prefix `realm/catalog/`

Use `cos-workspace/coscli-windows-amd64.exe` for upload and verification. Pass credentials from the environment for the current command only; do not run `coscli config init` or commit `cos-workspace/`.

## Data and content editing

For routine content changes, prefer these locations before editing component logic:

```text
src/shared/config/     # site config
src/features/*/contracts/data/ # projects, experience, life, skills, friend links
content/blog/init/    # bundled fallback blog post
src/app/locales/      # next-intl UI strings
public/               # static images, icons, local music test files
config/               # small runtime config fragments, e.g. image hosts
```

Trilingual bundled data is split by topic:

```text
src/features/
  portfolio/contracts/data/{index.ts,en.ts,zh-TW.ts}
  experience/contracts/data/{index.ts,en.ts,zh-TW.ts}
  life/contracts/data/{index.ts,en.ts,zh-TW.ts}
  profile/contracts/skills/{index.ts,en.ts,zh-TW.ts}
  profile/contracts/friendLinks/{index.ts,en.ts,zh-TW.ts}
src/shared/config/site.ts
```

`index.ts` is Simplified Chinese (`zh-CN`) and acts as the fallback. When adding a locale, update all of these together:

- `src/app/i18n/config.ts`
- `src/app/locales/<locale>.json`
- every relevant `src/features/<feature>/contracts/data/<locale>.ts`
- `src/app/i18n/data.ts` static registry
- locale matching logic in `proxy.ts` if needed

Do not replace the explicit registry with dynamic `require`; it causes Critical dependency warnings and makes bundling less predictable.

## Image host configuration

Next.js `<Image>` remote host rules are centralized in:

```text
config/image-hosts.js
```

Add CDN/object-storage/image-service domains there, then restart dev or rebuild. Do not duplicate the remote host list inside `next.config.js`.

Current documented defaults:

- `cdn.arsvine.com` — Tencent COS bucket for media, post images, covers, galleries, and assets.
- `placehold.co` — placeholder images used by data files.
- `images.unsplash.com` / `source.unsplash.com` — legacy/template sample images.

For large post/content images, prefer direct `cdn.arsvine.com` URLs with `next/image` and `unoptimized={true}` where appropriate, to avoid burning Vercel Hobby Image Optimization quota and to avoid unnecessary `/_next/image` proxy traffic.

## Image conversion scripts

Drop source images under `scripts/images/`, then run:

```bash
node scripts/convert-images.mjs
node scripts/convert-images.mjs jpg
node scripts/convert-images.mjs avif --quality 50
node scripts/convert-images.mjs --help
```

Outputs go to `scripts/images/out/` and preserve subdirectory structure. Source files are never modified. Re-runs skip existing outputs unless `--overwrite` is passed.

## Favicon regeneration

Favicon files are split between the public root and `public/icons/`:

```text
public/favicon.ico
public/apple-touch-icon.png
public/icons/favicon-16x16.png
public/icons/favicon-32x32.png
public/icons/android-chrome-192x192.png
public/icons/android-chrome-512x512.png
public/icons/site.webmanifest
```

Regenerate from the transparent avatar source:

```bash
node scripts/regen-favicons.mjs
```

If the source is a white-background JPG, first alpha-unmix it:

```bash
node scripts/jpg-to-transparent-png.mjs path/to/source.jpg public/favicon-source-transparent.png
```

Then update `scripts/regen-favicons.mjs` to point at the generated transparent PNG and rerun the favicon script.

## Self-hosted Google Fonts

The site serves Google Fonts from Tencent COS, not directly from `fonts.googleapis.com`, because Google Fonts is unreliable/unavailable for many mainland users.

Source of truth:

- `src/shared/config/site.ts` → `siteConfig.fonts.googleStylesheet`
- `src/shared/config/site.ts` → `siteConfig.fonts.cdnStylesheet`

Refresh staging files:

```bash
node scripts/fetch-google-fonts.mjs
```

The script:

1. fetches Google CSS with a modern Chrome User-Agent;
2. downloads `.woff2` font files;
3. rewrites all `url()` references to `cdn.arsvine.com/shared/fonts/...`;
4. writes the staging tree to `public/_fonts-staging/`.

Upload `public/_fonts-staging/` under the public bucket's `shared/fonts/` prefix with `coscli`. Use temporary credentials supplied by the current shell rather than a saved CLI profile.

Required COS metadata:

| Object | Content-Type | Cache-Control |
|---|---|---|
| `google-fonts.css` | `text/css; charset=utf-8` | `public, max-age=86400, must-revalidate` |
| `*.woff2` | `font/woff2` | `public, max-age=31536000, immutable` |

The COS custom-header UI has separate **Key** and **Value** fields. Put only the value in the Value field. Do not paste `Cache-Control: public, ...` as the value.

Verify after upload:

```bash
curl -I -H "Referer: https://arsvine.com/" https://cdn.arsvine.com/shared/fonts/google-fonts.css
```

`Content-Type` and `Cache-Control` should each appear once.

## Music files

Production audio is hosted on Tencent COS and usually served from:

```text
https://cdn.arsvine.com/realm/audio/YYYY/MM/DD/<name>.<hash>.m4a
```

Set:

```env
NEXT_PUBLIC_CDN_BASE=https://cdn.arsvine.com
```

The player reads its playlist from the private `realm/catalog/**` catalog. There is no production or offline fallback under `public/music/`.

`next.config.js` also honors `NEXT_BUILD_DIR` for a custom Next.js build output directory. Leave it unset unless a deployment wrapper explicitly expects a different dist dir.

Do not commit private or large audio files. The directory is gitignored for audio payloads. COS outbound traffic is billable, so avoid accidental autoplay loops or large repeated downloads.

## Security and dependency guardrails

Keep the following rules in mind when touching security-sensitive or dependency-sensitive code:

- When building GitHub content URLs, treat paths as repo-relative only. Reject absolute URLs, protocol-relative URLs, traversal, query strings, hashes, and encoded traversal before making the request.
- When rendering external links, parse with `new URL()` and allow only the intended protocols. Do not rely on substring checks for hostnames or schemes.
- When building internal navigation targets, use the shared blog and locale redirect helpers instead of concatenating untrusted strings into router destinations.
- Keep blog and protected-content tests under `tests/` so route and feature coverage stays organized and the source tree stays clean.
- If the lint stack is upgraded again, revalidate the Next.js lint integration first. This repo currently uses the compatible `eslint@9` / `eslint-config-next@16` combination.
- Keep the `postcss: 8.5.10` override in `pnpm-workspace.yaml` until the upstream Next.js dependency no longer resolves to the vulnerable `postcss@8.4.31`.
- Move pnpm workspace-level settings into `pnpm-workspace.yaml` rather than `package.json#pnpm`; pnpm 11 ignores the package-level key.

## Before committing

At minimum run:

```bash
pnpm check
```

For UI-heavy changes, also manually verify:

- desktop and mobile layout;
- home → content → detail transitions;
- blog detail pages with public and protected posts;
- hash navigation to content sections on mobile;
- music player open/close/track switching;
- custom cursor hover labels and BACK state;
- font rendering for CJK and accented Latin characters.
