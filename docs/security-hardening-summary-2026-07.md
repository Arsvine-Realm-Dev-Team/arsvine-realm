# Security Hardening Summary

This note records the problems that were surfaced during the hardening pass on `arsvine-realm`, the fixes that were applied, and the validation that was run after the changes.

## 1. Dependency / Tooling Issues

- `eslint@10.6.0` was not compatible with the current Next.js lint stack in this repo.
- `next@16.2.10` still pulled `postcss@8.4.31`, which matched the Dependabot security alert.
- `pnpm@11` ignored `package.json#pnpm.onlyBuiltDependencies`, so the config needed to move into `pnpm-workspace.yaml`.

Applied fixes:

- Kept `react@19`, `@types/react@19`, and `vitest@4`.
- Rolled the lint stack back to the compatible `eslint@9` / `eslint-config-next@16` combination.
- Added a `postcss: 8.5.10` override in `pnpm-workspace.yaml`.
- Migrated built-dependency config into `pnpm-workspace.yaml` to remove the pnpm 11 warning.

## 2. Security Findings

### SSRF in `lib/content/github.ts`

Problem:

- User-controlled content paths could reach `fetch(buildContentsUrl(path), ...)` without enough validation.

Fix:

- Added `normalizeContentPath(path)` to treat the value strictly as a repo-relative path.
- Rejected absolute URLs, protocol-relative URLs, traversal, query strings, hash fragments, backslashes, control characters, and encoded traversal.
- Built the final GitHub API URL from a fixed trusted base and encoded path segments.

### Unsafe external URL handling

Problem:

- `WorkDetailView.tsx` and `components/detail/standalone/webDetailParagraphs.tsx` relied on weak substring checks for link classification.

Fix:

- Added a shared helper in `lib/safe-external-href.ts`.
- Used `new URL(...)` for strict parsing.
- Allowed only `http:` and `https:` for rendered external links.
- Derived GitHub / Bilibili variants from parsed hostnames instead of substrings.

### Client-side redirect hardening

Problem:

- `components/blog/BlogDetailScaffold.tsx` used untrusted slug values in navigation targets.

Fix:

- Added blog href helpers in `lib/blog-client.ts`.
- Validated slug values before building post URLs.
- Fell back to `/${locale}/content#blog` when a slug is unsafe.

### Dynamic method call in `LocaleFallbackBanner`

Problem:

- `LocaleFallbackBanner.tsx` used dynamic method selection on locale-keyed text maps.

Fix:

- Replaced the dynamic call with explicit locale branches.
- Kept the existing banner semantics intact.

### Regex range in `lib/typing-effect.ts`

Problem:

- The character classification regex used an overly permissive range.

Fix:

- Replaced it with explicit Unicode script checks for Latin, Han, Hiragana, Katakana, and Hangul.

## 3. Warning Cleanups

The following warnings were fixed as part of the same pass:

- `components/effects/Tesseract.tsx`
  - stopped mutating a `Vector3` after render
  - preserved the same drag behavior while clamping the Y position without in-place mutation
- `components/sections/WorksSection.tsx`
  - removed the synchronous `setState()` call from the effect body
  - moved the transition state update into the scheduled callback

## 4. Test Layout

Problem:

- The repo had mixed test placement, with some tests living next to source files and others already under `tests/`.

Fix:

- Moved all test files under `tests/`.
- Grouped them by module and feature area:
  - `tests/lib/...`
  - `tests/components/...`
  - `tests/hooks/...`
  - `tests/i18n/...`
  - `tests/pages/...`
  - `tests/repo/...`

## 5. Validation

The following commands were run successfully after the changes:

```bash
pnpm install --frozen-lockfile
pnpm why postcss --json
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm check
git diff --check
```

`pnpm lint` is clean in the final state captured here; the earlier `Tesseract.tsx` and `WorksSection.tsx` warnings were cleared.

## 6. Follow-up Notes

- The earlier browser deprecation warnings reported for `components/effects/RainMorimeEffect.tsx` were separate observations and were not part of this hardening pass.
- If those warnings should be addressed as well, they should be handled in a separate targeted change so the security hardening history stays narrowly scoped.
