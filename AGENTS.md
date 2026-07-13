# AGENTS.md

This file is the concise coding-agent entry point for **ARSVINE REALM**. Keep it short. Long explanations belong in the split documentation under `docs/`.

## Read first

- [`README.md`](./README.md) — project overview and documentation map.
- [`docs/DEVELOPMENT.md`](./docs/DEVELOPMENT.md) — setup, commands, scripts, local COS workflow, assets.
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — routing, content system, protected posts, API, transitions, styling.
- [`docs/OPERATIONS.md`](./docs/OPERATIONS.md) — deployment, env vars, analytics, CDN/COS, ISR, Upstash, SEO.
- [`docs/PERFORMANCE.md`](./docs/PERFORMANCE.md) — adaptive tiers, capability gates, and recovery thresholds.
- [`docs/ASSETS.md`](./docs/ASSETS.md) — public/COS boundary, catalogs, publishing, and rollback.
- [`docs/GOTCHAS.md`](./docs/GOTCHAS.md) — historical regressions and fragile conventions.

## Project snapshot

ARSVINE REALM is a personal post-apocalyptic HUD-themed portfolio and blog site. It uses **Next.js 16 Pages Router**, React 19, TypeScript, SCSS Modules, Three.js, GSAP, MDX, `next-intl` 4, Vitest, and a custom Node.js server. The production runtime target is Node.js `24.x`.

User-facing pages live under `/<locale>/...` with UI locales `zh-CN`, `zh-TW`, and `en`.

## Commands

```bash
npm run dev        # node server.js
npm run build      # next build
npm start          # cross-env NODE_ENV=production node server.js
npm run lint       # eslint .
npm run typecheck  # tsc --noEmit
npm run test       # vitest run
```

Run a single test:

```bash
npx vitest run path/to/file.test.ts
npx vitest run -t "name pattern"
```

## Hard rules

1. **Use Pages Router, not App Router.** Routes are under `src/pages/`, not `app/`.
2. **Do not replace `server.js`.** Development and production both run through the custom server.
3. **Use `useTransition().navigateTo()` for internal navigation.** Direct `router.push()` breaks page transition behavior.
4. **Do not use IP-based language selection.** Locale resolution is `NEXT_LOCALE cookie > Accept-Language > zh-CN`.
5. **Do not dynamically require locale data.** `src/app/i18n/data.ts` intentionally uses a static registry.
6. **Do not reintroduce `reading-time`.** The in-house estimator handles CJK; whitespace-based packages do not.
7. **Do not use `--font-display` for translated/user content.** `ZELDA Free` is Latin-only and breaks CJK/accented text.
8. **Use `coscli` only with temporary environment-provided credentials.** Never persist COS keys in a CLI config or commit `cos-workspace/`.
9. **Do not ship protected MDX in static props.** Protected posts must remain runtime-gated through the API and signed access cookie.
10. **Preserve the protected-post reducer/effect race fixes.** See `docs/GOTCHAS.md` before touching `src/features/blog/model/useBlogPostState.ts` or `src/features/blog/model/blogPostState.ts`.

## Where to edit common things

| Need | Edit first |
|---|---|
| Site metadata, SEO, fonts, social links | `src/shared/config/site.ts` |
| Music playlist / cloud audio catalog | `src/pages/api/assets/audio`, `src/features/assets/server/catalog/`, `src/features/music/` |
| Projects / experience / life / skills / friend links | `src/features/<feature>/contracts/data/*.ts` |
| UI copy | `src/app/locales/*.json` |
| Remote image domains | `config/image-hosts.js` |
| Blog fallback post | `content/blog/init/` |
| Runtime blog/tweet source | `.env.local` external GitHub content repo variables |
| Protected-post access | `ACCESS_GRANT_SECRET`, `TOTP_GROUPS_JSON`, access helpers under `src/shared/lib/content/` |
| Route transitions | `src/features/navigation/model/TransitionProvider.tsx`, route mode hooks |
| Global HUD / left panel | `src/features/hud/`, `src/app/shell/MainLayout.tsx` |
| MDX rendering | `src/features/blog/ui/mdx/`, `src/features/blog/styles/MDXContent.module.scss` |

## Validation expectation

Before handing off non-trivial changes, run at least:

```bash
npm run lint
npm run typecheck
npm run test
```

For visual or interaction changes, also manually verify desktop and mobile layouts, route transitions, blog detail pages, protected-post gates, music-player behavior, hash navigation, and custom cursor states.

## Common danger zones

Read [`docs/GOTCHAS.md`](./docs/GOTCHAS.md) before editing:

- protected blog post auth state machine (`src/features/blog/model/useBlogPostState.ts`);
- route loading overlay placement;
- avatar parallax transform override;
- blog reveal animation and `<Explain>` tooltip stacking;
- music player track-switch behavior;
- mobile music-player auto-open guard;
- `AnimatedTitleChars` uppercase behavior;
- COS font headers;
- Google Fonts variable-font deduplication.
