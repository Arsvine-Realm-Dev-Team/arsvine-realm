# Performance Guide

The adaptive controller exposes seven ordered tiers and capability flags through the HUD provider.

| Tier | Logo effects | Ambient WebGL | Heavy CSS | Decorative motion | Interactive WebGL | Custom cursor |
|---|---:|---:|---:|---:|---:|---:|
| `full` | on | on | on | on | on | on |
| `logo-reduced` | off | on | on | on | on | on |
| `ambient-reduced` | off | off | on | on | on | on |
| `css-reduced` | off | off | off | on | on | on |
| `motion-reduced` | off | off | off | off | on | on |
| `webgl-reduced` | off | off | off | off | off | on |
| `minimal` | off | off | off | off | off | off |

The logo remains visible in every tier. The first poor sampling window immediately enters `logo-reduced`, removing only its pointer listener, animation-frame loop, parallax, and chromatic layers. Once runtime sampling closes this capability, the current page session cannot recover above `logo-reduced`; a full reload resets that ceiling. Later tiers require two poor windows and each disables exactly one additional capability group. The custom cursor remains enabled until `minimal`.

CSS consumes capability attributes such as `data-heavy-css-effects`, `data-decorative-motion`, and `data-custom-cursor` instead of enumerating tier names. The tier-to-capability table in `src/shared/lib/performance-tiers.ts` is the single source of truth for React, the document bootstrap, and these attributes.

## Detection and recovery

The document bootstrap selects a hydration-safe initial ceiling from explicit user preferences only. Reduced motion maps to `minimal`; Save-Data maps to `motion-reduced`; all other visitors start at `full`. Network effective type, RTT, downlink, memory, and CPU-concurrency hints are not visual-performance inputs: they do not measure frame pacing and are frequently coarse or stale. The `<html>` element exposes `data-performance-reason` (`reduced-motion`, `save-data`, `runtime-fps`, or `none`) alongside capability attributes for diagnosis.

After the opening animation, visible-page sampling uses windows of up to 120 frames or 2500ms. The first poor window moves `full` to `logo-reduced` immediately. Later stages need two poor windows; three healthy windows recover one tier. Poor means average FPS below 45 or at least 25% slow frames. Healthy means at least 55 FPS and no more than 10% slow frames. Later degradation and all recovery have 5s and 10s cooldowns. A page cannot recover above the stricter of its explicit-preference and session runtime ceilings.

When adding an expensive effect, add an explicit capability rather than checking device properties in the component. Optional effects must tolerate unmounting and module-load failure.

The logo's reveal wrapper is limited to the actual square artwork. Its chromatic layers use masks, transforms, and opacity; do not put filters or drop shadows back on the full left-panel container.
