# Gotchas and Regression Notes

This file records real project-specific pitfalls. Read it before editing route transitions, protected posts, typography, COS assets, MDX rendering, the music player, or cursor behavior.

## 1. Do not use `reading-time`

The project uses an in-house reading-time estimator in `features/blog/server/blog.ts`.

Reason: common packages such as `reading-time` are whitespace-oriented. CJK text has few spaces, so long Chinese posts collapse to extremely low estimates and often display as `1 min` after flooring.

Expected behavior:

- count CJK and Latin text differently;
- strip code blocks, inline code, HTML/JSX tags, and MDX import/export lines;
- expose only `readingMinutes: number` in blog metadata.

## 2. `--font-display` is Latin-only

`--font-display` maps to `ZELDA Free`, which is decorative and incomplete.

Do not use it for:

- CJK text;
- accented Latin text such as French;
- blog titles;
- translated strings;
- user-supplied content;
- any string that may contain arbitrary Unicode.

Use `--font-hud` for HUD-safe headings and `--font-reading` for long-form content.

## 3. COS custom-header Value fields are value-only

Tencent COS metadata UI has separate fields for header name and value.

Correct:

```text
Key:   Cache-Control
Value: public, max-age=31536000, immutable
```

Wrong:

```text
Key:   Cache-Control
Value: Cache-Control: public, max-age=31536000, immutable
```

The wrong form can produce malformed headers such as `Cache-Control: Cache-Control: ...`, causing Firefox to reject fonts and fall back to system fonts. The visible symptom can be rare Traditional Chinese characters rendering as tofu.

## 4. Google Fonts variable-font deduplication is intentional

Google Fonts can return multiple `@font-face` blocks with different `font-weight` values pointing to the same `.woff2` file.

This is normal for Variable Fonts. The file may cover a continuous `wght` axis even if its local filename contains one representative weight.

Do not rewrite `scripts/fetch-google-fonts.mjs` to force one file per weight.

## 5. Keep COSCLI credentials ephemeral

The supported asset workflow uses the local COSCLI binary through `pnpm assets:publish`. Pass credentials for the current process only. Do not run `coscli config init`, commit a config file, or print secrets in command summaries.

## 6. Internal navigation must use `navigateTo()`

Internal route changes should go through:

```ts
useTransition().navigateTo(url)
```

Direct `router.push()` skips transition animation and can break home/content/detail motion choreography.

## 7. Route loading overlay placement is source-driven

`useRouteLoadingKind(router)` reads the route being left, not the target route.

Why:

- home/content → blog detail needs the default/right-side overlay because the left panel is still visible;
- blog detail → blog detail needs the standalone overlay because the left panel is already hidden.

Target-based overlay selection breaks one of these flows.

## 8. Protected-post auth probe must depend on auth state

The auth-probe effect in `useBlogPostState.ts` must:

- short-circuit unless `state.authState === 'checking'`;
- include `state.authState` in the dependency list.

Without this, navigating between protected posts in the same `access.group` can leave dependencies referentially unchanged and the page stuck in auth checking.

## 9. Protected-post `authResolved` must clear request state in both branches

The reducer action in `features/blog/model/blogPostState.ts` must clear `activeRequestKey` and `loadingLocale` whether auth resolves to granted or required.

If only the required branch clears request state, public → protected navigation can leave stale request keys behind. The next legitimate fetch may be deduped incorrectly and the page can hang.

## 10. Protected body content must never be in static props

For protected posts:

- `mdxSource` should be `null` from SSG;
- metadata should be sanitized where appropriate;
- body should be fetched only after runtime grant;
- direct `/api/post-variant` calls without a grant should return `403`.

Do not place ciphertext or hidden MDX payloads in `_next/data` JSON as an alternative. The invariant is no protected body in static data.

## 11. Avatar parallax transform needs `!important`

The avatar entry animation uses a keyframe with `forwards`, leaving a final `transform` value cached on the element.

The mousemove rAF must write transform through:

```ts
style.setProperty('transform', value, 'important')
```

Using `style.transform = value` may silently lose to the keyframe fill state.

## 12. CustomCursor hover state must be reset through the helper

The cursor can show contextual labels such as BACK. State residue can happen after route changes, scrolling, blur, visibility changes, or DOM unmounts.

Use the existing reset helper instead of directly mutating internal refs when adding new hover-label semantics.

## 13. MusicPlayer track click implies play

Clicking a track in the playlist should immediately express play intent.

Do not add a guard like “only autoplay if already playing.” Track switches use an explicit play-intent flag consumed by the `audio.load()` → `audio.play()` chain.

## 14. MusicPlayer must not auto-open on mobile

The player may auto-open after a delay on desktop only. Keep the mobile guard.

Reason: a draggable panel covering much of a phone screen on first paint is a poor mobile entry experience.

## 15. ActivationLever is a button

`ActivationLever` should preserve button semantics, `aria-label`, and cursor label behavior.

Do not restyle it into a non-semantic `div`.

## 16. Blog reveal animation must clear transform with `none`

Blog paragraphs reveal with an initial transform such as `translateY(20px)`. After transition end, the code should set:

```ts
transform: 'none'
```

not an empty string.

Reason: any non-`none` transform creates a stacking context. That can trap `<Explain>` tooltips under following paragraphs regardless of `z-index`.

## 17. `<AnimatedTitleChars>` defaults to uppercase

The shared component defaults to uppercase because web/life detail heroes want that style.

Blog titles should pass:

```tsx
uppercase={false}
```

For Latin words, pass the word wrapper class and define it as inline-block + nowrap to avoid bad narrow-width breaks.

## 18. Mobile section anchors need CSS scroll margin

Any section that receives hash navigation or `scrollIntoView()` on mobile must have:

```scss
scroll-margin-top: var(--mobile-section-scroll-offset);
```

Do not replace this with a JavaScript scroll-offset helper. CSS scroll margin is the intended mechanism.

## 19. Locale resolution is not geo-based

Root-path language selection is:

```text
NEXT_LOCALE cookie > Accept-Language > zh-CN
```

Do not infer language from IP country. Geo data may be used for other purposes, but not as the primary language selector.

## 20. WebGL effects should not churn GPU contexts

Desktop-only Three.js effects are dynamically imported with SSR disabled and should not repeatedly unmount once ready.

Repeated unmount/remount cycles can destroy and recreate GPU contexts during transitions, causing jank and instability.

## 21. `/[locale]/game` is not a route

The stale `/[locale]/game` route matchers, prefetches, and redirects were removed during the source-root migration. Game projects render through the content hub's in-page detail mode; do not add links or route patterns for a page that does not exist.

## 22. GitHub content paths must be repo-relative only

`lib/content/github.ts` now normalizes content paths before calling the GitHub Contents API.

Do not pass user-controlled strings directly into the API path builder.

Required behavior:

- reject absolute URLs and protocol-relative URLs;
- reject leading `/`, backslashes, query strings, hash fragments, traversal, and encoded traversal;
- split the path into segments and encode each segment explicitly;
- build the final URL from a fixed trusted GitHub API base.

## 23. External links must be parsed, not substring-matched

`features/portfolio/ui/WorkDetailView.tsx` and `features/portfolio/ui/detail/webDetailParagraphs.tsx` now use a shared helper that calls `new URL(...)`.

Do not classify links with `includes('github.com')` / `includes('bilibili.com')` or similar substring checks.

Required behavior:

- accept only the intended protocols for rendered links;
- treat unsafe input as plain text instead of a clickable `href`;
- derive link variants from the parsed hostname.

## 24. Internal blog redirects must use validated helpers

`features/blog/ui/blog/BlogDetailScaffold.tsx` now routes through helpers in `features/blog/model/blogClient.ts`.

Do not pass arbitrary slug strings directly into `navigateTo()` or `Link href`.

Required behavior:

- validate locale and slug values before building blog URLs;
- accept only a single slug segment for blog post routes;
- fall back to `/${locale}/content#blog` when the target is unsafe.

## 25. Locale fallback banners must use explicit dispatch

`shared/ui/LocaleFallbackBanner.tsx` now resolves copy with explicit locale branches.

Do not call locale-keyed text maps with dynamic method selection.

Required behavior:

- use an allowlist branch per locale;
- keep fallback and translated copy semantics stable;
- keep the banner logic free of user-controlled method names.

## 26. Typing-effect language detection must stay script-specific

`lib/typing-effect.ts` now uses explicit Unicode script checks for Latin and CJK families.

Do not broaden the classification regex back to a loose range.

Required behavior:

- treat Latin text as the alphabetic profile only when it is not mixed with CJK;
- keep Han / Hiragana / Katakana / Hangul on the CJK path;
- preserve the existing typing cadence semantics.

## 27. All new tests live under `tests/`

The repo now keeps test files in `tests/` and groups them by feature area.

Do not add new `.test.ts` or `.test.tsx` files next to source files.

Required layout:

- `tests/features/<feature>/...`
- `tests/shared/...`
- `tests/app/...` (application composition)
- `tests/repo/...` (repository-wide conventions)
