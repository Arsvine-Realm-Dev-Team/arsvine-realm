# Performance, Assets, and Telemetry Design

## Goals

- Replace the binary performance switch with staged, recoverable degradation.
- Keep the home logo visible while removing its expensive chromatic effect first.
- Keep replaceable media in Tencent COS behind stable catalog identities and provide a safe COSCLI publish workflow.
- Remove the legacy tracker and isolate optional Vercel telemetry behind a failure-safe adapter.
- Split operational, performance, and asset guidance into clear authoritative documents.

## Performance model

The runtime exposes four tiers: `full`, `balanced`, `reduced`, and `minimal`. Components consume explicit capabilities instead of inferring behavior from the tier. `balanced` disables logo parallax and chromatic drop shadows; `reduced` additionally disables ambient WebGL and heavy CSS effects; `minimal` disables interactive WebGL, the custom cursor, and nonessential motion. The logo remains visible at every tier.

Client heuristics set the best tier the device may recover to. Reduced-motion is capped at `minimal`, Save-Data or slow networks at `reduced`, low memory or CPU concurrency at `balanced`, and other devices at `full`. Visible-page frame sampling degrades one tier after two poor windows and recovers one tier after three healthy windows, with cooldowns and no recovery above the heuristic cap.

## Asset model

Stable catalog keys resolve to immutable, hashed COS object keys. Content pages continue resolving the private catalog during SSG/ISR. Replaceable site-shell images use a sanitized public manifest containing only object keys and display metadata; failure to load it removes optional decoration without affecting content or navigation.

Only identity and boot-critical files remain in `public`: the logo/avatar, favicons, PWA icons/manifest, and required local display font. Other owned images and audio live in COS. Publishing uploads immutable data first, verifies it, switches current pointers last, and then calls a protected asset revalidation endpoint. Rollback only repoints to a previous version.

## Telemetry model

Application code depends on a generic telemetry root and event function. The provider is `none` by default and may be explicitly set to `vercel`. The Vercel adapter dynamically loads Analytics and Speed Insights; import, render, and tracking failures are contained. Legacy tracker scripts, environment variables, and documentation are removed.

## Verification

Unit tests cover heuristic caps, staged degradation/recovery, logo behavior, capability gates, manifest validation, publish ordering, revalidation authorization, and telemetry failure isolation. Repository validation runs lint, type checking, tests, and a production build. Manual checks cover desktop/mobile layout, route transitions, Tesseract fallback, music, and missing-manifest behavior.
