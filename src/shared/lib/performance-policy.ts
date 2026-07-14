import type { PerformanceReason, PerformanceTier } from '@/shared/contracts/performance';

export interface InitialPerformanceSignals {
  reducedMotion: boolean;
  saveData: boolean;
}

export interface InitialPerformancePolicy {
  tier: PerformanceTier;
  reason: PerformanceReason;
}

/**
 * Establish the visual-performance ceiling before hydration.
 *
 * Connection quality and browser hardware hints are deliberately excluded:
 * neither measures frame pacing, and both are frequently coarse or stale.
 * Explicit user preferences are safe to honor before runtime sampling begins.
 */
export function resolveInitialPerformancePolicy({
  reducedMotion,
  saveData,
}: InitialPerformanceSignals): InitialPerformancePolicy {
  if (reducedMotion) return { tier: 'minimal', reason: 'reduced-motion' };
  if (saveData) return { tier: 'motion-reduced', reason: 'save-data' };
  return { tier: 'full', reason: null };
}
