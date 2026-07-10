# Performance Guide

The adaptive controller exposes four tiers and capability flags through `AppContext`.

| Tier | Logo motion | Ambient WebGL | Heavy CSS | Interactive WebGL | Custom cursor |
|---|---:|---:|---:|---:|---:|
| `full` | on | on | on | on | on |
| `balanced` | off | on | on | on | on |
| `reduced` | off | off | off | on | on |
| `minimal` | off | off | off | off | off |

The logo remains visible in every tier. `balanced` removes its pointer listener, animation-frame loop, and chromatic drop shadows.

## Detection and recovery

The document bootstrap selects a hydration-safe initial ceiling. Reduced motion maps to `minimal`, Save-Data and slow networks to `reduced`, low memory or CPU concurrency to `balanced`, and other devices to `full`.

After the opening animation, visible-page sampling uses windows of up to 120 frames or 2500ms. Two poor windows degrade one tier; three healthy windows recover one tier. Poor means average FPS below 45 or at least 25% slow frames. Healthy means at least 55 FPS and no more than 10% slow frames. Degradation and recovery have 5s and 10s cooldowns. A page cannot recover above its heuristic ceiling.

When adding an expensive effect, add an explicit capability rather than checking device properties in the component. Optional effects must tolerate unmounting and module-load failure.
