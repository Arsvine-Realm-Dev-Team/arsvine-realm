# Operations Guide

This document covers deployment, external services, environment variables, CDN/COS handling, analytics, ISR, and operational checks for **ARSVINE REALM**.

## Build and run

```bash
pnpm build
pnpm start
```

`pnpm start` runs:

```bash
cross-env NODE_ENV=production node server.js
```

The server entry is `server.js`, not `next start`.

For a traditional server deployment:

```bash
pm2 start server.js --name arsvine-realm
```

For Vercel, keep the project Node.js runtime aligned with `package.json`:

```json
"engines": {
  "node": "24.x"
}
```

## Required production variables

At minimum:

```env
NODE_ENV=production
NEXT_PUBLIC_SITE_URL=https://arsvine.com
```

`NEXT_PUBLIC_SITE_URL` is used by sitemap, RSS, robots, Open Graph, and canonical URL generation.

## Optional public variables

```env
NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
NEXT_PUBLIC_UMAMI_DOMAINS=arsvine.com,www.arsvine.com
```

Rules:

- Public variables are visible in browser bundles.
- `NEXT_PUBLIC_UMAMI_DOMAINS` should be comma-separated and must not include protocol.
- Localhost and Vercel preview deployments should be excluded from analytics when the domain whitelist is configured.

## Server-only variables

```env
GITHUB_OWNER=ArsvineZhu
GITHUB_REPO=arsvine-content
GITHUB_BRANCH=main
GITHUB_READ_TOKEN=github_pat_xxx

ACCESS_GRANT_SECRET=replace-with-a-long-random-string
TOTP_GROUPS_JSON={"friends-a":{"current":"JBSWY3DPEHPK3PXP","period":30,"digits":6,"window":1}}

REVALIDATE_SECRET=replace-with-a-long-random-string
TRUST_PROXY=1

UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

Never prefix secrets with `NEXT_PUBLIC_`.

## External content repository

Blog posts and tweets can be served from a private GitHub repository. The production server reads it through GitHub Contents API using `GITHUB_READ_TOKEN`.

Expected layout:

```text
blog-index.json
blog/<slug>/<locale>.mdx
tweets/index.json
tweets/YYYY-MM.json
```

If the variables are missing:

- blog falls back to `content/blog/init/`;
- tweets fall back to an empty state unless `TWEETS_STRESS_TEST=1` is set in development;
- protected post features depending on external content are naturally unavailable.

## Protected-post access

TOTP-protected posts depend on:

- external content index declaring `access.mode = "totp"` and `group`;
- `ACCESS_GRANT_SECRET` for signed access cookies;
- `TOTP_GROUPS_JSON` for group secrets;
- `/api/protected-verify` for verification;
- `/api/grant-check` and `/api/post-variant` for runtime access flow.

Operational checks:

1. Visit a public post and verify direct rendering.
2. Visit a protected post without access and verify no body content appears before verification.
3. Check `_next/data/.../<slug>.json` for a protected post and verify no MDX body is present.
4. Submit a valid TOTP code and verify the post body loads.
5. Directly fetch `/api/post-variant?slug=<protected>&locale=zh-CN` without a grant and verify `403`.

## Upstash Redis rate limiting

`/api/protected-verify` can use Upstash Redis for distributed rate limiting.

- With Upstash configured: rate limiting works across serverless instances.
- Without Upstash: the project falls back to process-local `Map`, which is acceptable for local dev and single-instance testing but not reliable for multi-instance production.

Vercel Marketplace integration can inject:

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

## ISR and revalidation

The site includes ISR trigger routes:

```text
/api/revalidate
/api/revalidate-content
```

`/api/revalidate` revalidates the tweet pages for all locales. `/api/revalidate-content` revalidates the content page for all locales and, when a slug is provided, the matching blog detail pages.

They are guarded by:

```env
REVALIDATE_SECRET=<long-random-string>
```

If `REVALIDATE_SECRET` is unset, revalidation endpoints should return unauthorized behavior and effectively remain disabled.

Use these routes only from trusted automation or content-publish workflows.

## Tencent COS media/CDN model

The project uses Tencent COS Hong Kong bucket `arsvine-cdn`, served through `cdn.arsvine.com`.

Documented assumptions:

- bucket is public-read / private-write;
- audio and larger media are not committed to Git;
- fonts are manually uploaded to `fonts/`;
- music files are served from `music/`;
- image and content assets may also use `cdn.arsvine.com`.

COS traffic is billable. A traffic package is not a hard limit; after the package is exhausted, traffic may continue and charge by usage. Keep budget alerts enabled.

## COS Referer policy

The bucket Referer allowlist is expected to allow:

```text
arsvine.com
*.arsvine.com
```

Localhost and empty Referer are rejected. Use the local `dev.arsvine.com` hosts workflow documented in [`DEVELOPMENT.md`](./DEVELOPMENT.md) when testing real COS assets locally.

## Font hosting operations

Font refresh flow:

1. edit `data/site.ts` font URL configuration;
2. run `node scripts/fetch-google-fonts.mjs`;
3. upload `public/_fonts-staging/` to COS `fonts/` through the web console;
4. set object metadata exactly;
5. verify with `curl -I`.

Required metadata:

| Object | Content-Type | Cache-Control |
|---|---|---|
| `google-fonts.css` | `text/css; charset=utf-8` | `public, max-age=86400, must-revalidate` |
| `*.woff2` | `font/woff2` | `public, max-age=31536000, immutable` |

Do not paste header names into the Value field. The Value field should contain only values such as `public, max-age=31536000, immutable`.

## Analytics

Umami is optional. The environment variables are:

```env
NEXT_PUBLIC_UMAMI_SRC=https://cloud.umami.is/script.js
NEXT_PUBLIC_UMAMI_WEBSITE_ID=your-website-id
NEXT_PUBLIC_UMAMI_DOMAINS=arsvine.com,www.arsvine.com
```

The tracker is injected only when configured. The documented behavior includes:

- `defer` loading;
- `data-do-not-track="true"`;
- `data-exclude-search="true"`;
- optional domain whitelist.

For custom events, add `data-umami-event` attributes to elements or call `window.umami?.track(...)` where appropriate.

## SEO and feed files

Dynamic files:

| File | Source behavior |
|---|---|
| `/sitemap.xml` | Generated from site config, locales, posts, and routes. |
| `/<locale>/rss.xml` | Per-locale RSS. |
| `/robots.txt` | Generated from site URL and policy. |

Operational check after deploy:

```bash
curl -I https://arsvine.com/sitemap.xml
curl -I https://arsvine.com/zh-CN/rss.xml
curl -I https://arsvine.com/robots.txt
```

Also verify the content body in a browser or with `curl` when changing URL generation.

## Image host operations

Remote image hosts are configured in:

```text
config/image-hosts.js
```

When changing CDN/image providers:

1. add or remove the host in `config/image-hosts.js`;
2. rebuild the app;
3. verify pages using `next/image` render successfully;
4. check whether the host uses hotlink/referrer restrictions;
5. avoid accidentally routing heavy assets through Vercel Image Optimization if direct COS delivery is intended.

## Deployment smoke test

After each production deployment, verify:

- `/zh-CN`, `/zh-TW`, `/en` load;
- bare `/` redirects to a locale;
- `/zh-CN/content#blog` lands correctly;
- one public blog post loads;
- one protected blog post gates correctly;
- `/sitemap.xml`, `/robots.txt`, and `/zh-CN/rss.xml` work;
- `cdn.arsvine.com` fonts load and do not produce CJK tofu;
- music player does not auto-download excessive media;
- mobile layout has no HUD overlap on hash navigation;
- analytics are absent on localhost/preview when domain whitelist is set;
- `pnpm check` passes before release.
