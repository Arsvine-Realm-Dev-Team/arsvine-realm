import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from '@/shared/hooks/useMediaQuery';
import {
  applyPerformanceAttributes,
  buildPerformanceState,
  PERFORMANCE_TIERS,
  performanceTierIndex,
} from '@/shared/lib/performance-tiers';
import type { AdaptivePerformanceState, PerformanceReason, PerformanceTier } from '../../../shared/types';

const MAX_SAMPLE_FRAMES = 120;
const MAX_SAMPLE_DURATION_MS = 2500;
const MIN_AVERAGE_FPS = 45;
const SLOW_FRAME_MS = 32;
const MAX_SLOW_FRAME_RATIO = 0.25;
const HEALTHY_AVERAGE_FPS = 55;
const HEALTHY_SLOW_FRAME_RATIO = 0.1;
const BAD_WINDOWS_TO_DEGRADE = 2;
const GOOD_WINDOWS_TO_RECOVER = 3;
const DEGRADE_COOLDOWN_MS = 5000;
const RECOVER_COOLDOWN_MS = 10000;

interface NetworkInformationLike { saveData?: boolean; effectiveType?: string }
interface NavigatorPerformanceLike extends Navigator { connection?: NetworkInformationLike; deviceMemory?: number }

function resolveHeuristic(reducedMotion: boolean): { maxTier: PerformanceTier; reason: PerformanceReason } {
  if (reducedMotion) return { maxTier: 'minimal', reason: 'reduced-motion' };
  if (typeof window === 'undefined') return { maxTier: 'full', reason: null };

  const nav = navigator as NavigatorPerformanceLike;
  const connection = nav.connection;
  if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || '')) {
    return { maxTier: 'motion-reduced', reason: 'device-heuristic' };
  }
  if ((typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4)
    || (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4)) {
    return { maxTier: 'logo-reduced', reason: 'device-heuristic' };
  }
  return { maxTier: 'full', reason: null };
}

function resolveRecoveryCeiling(
  heuristicTier: PerformanceTier,
  heuristicReason: PerformanceReason,
  runtimeTier: PerformanceTier,
): { tier: PerformanceTier; reason: PerformanceReason } {
  if (performanceTierIndex(runtimeTier) > performanceTierIndex(heuristicTier)) {
    return { tier: runtimeTier, reason: 'runtime-fps' };
  }
  return { tier: heuristicTier, reason: heuristicReason };
}

export default function useAdaptivePerformance(animationsComplete: boolean): AdaptivePerformanceState {
  const reducedMotion = useReducedMotion();
  const [state, setState] = useState(() => buildPerformanceState('full', null));
  const [isPageVisible, setIsPageVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [heuristicsReady, setHeuristicsReady] = useState(false);
  const heuristicTierRef = useRef<PerformanceTier>('full');
  const heuristicReasonRef = useRef<PerformanceReason>(null);
  const runtimeCeilingRef = useRef<PerformanceTier>('full');
  const lastTierChangeRef = useRef(0);

  useEffect(() => {
    const onVisibilityChange = () => setIsPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    const heuristic = resolveHeuristic(reducedMotion);
    heuristicTierRef.current = heuristic.maxTier;
    heuristicReasonRef.current = heuristic.reason;
    const ceiling = resolveRecoveryCeiling(
      heuristicTierRef.current,
      heuristicReasonRef.current,
      runtimeCeilingRef.current,
    );
    // Client-only device signals are unavailable during SSR; reconcile them after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHeuristicsReady(true);
    setState((current) => performanceTierIndex(current.performanceTier) < performanceTierIndex(ceiling.tier)
      ? buildPerformanceState(ceiling.tier, ceiling.reason)
      : current);
  }, [reducedMotion]);

  useEffect(() => {
    if (!heuristicsReady) return;
    applyPerformanceAttributes(document.documentElement, state);
  }, [heuristicsReady, state]);

  useEffect(() => {
    if (!heuristicsReady || !animationsComplete || !isPageVisible || reducedMotion) return;

    let rafId = 0;
    let startTime: number | null = null;
    let previousTime = 0;
    let frameCount = 0;
    let slowFrameCount = 0;
    let badWindows = 0;
    let goodWindows = 0;

    const resetWindow = () => {
      startTime = null;
      previousTime = 0;
      frameCount = 0;
      slowFrameCount = 0;
    };

    const evaluateWindow = (elapsedMs: number, timestamp: number) => {
      if (!frameCount || elapsedMs <= 0) return;
      const averageFps = frameCount / (elapsedMs / 1000);
      const slowFrameRatio = slowFrameCount / frameCount;
      const poor = averageFps < MIN_AVERAGE_FPS || slowFrameRatio >= MAX_SLOW_FRAME_RATIO;
      const healthy = averageFps >= HEALTHY_AVERAGE_FPS && slowFrameRatio <= HEALTHY_SLOW_FRAME_RATIO;

      if (poor) { badWindows += 1; goodWindows = 0; }
      else if (healthy) { goodWindows += 1; badWindows = 0; }
      else { badWindows = 0; goodWindows = 0; }

      setState((current) => {
        const index = performanceTierIndex(current.performanceTier);
        const sinceChange = timestamp - lastTierChangeRef.current;
        if (poor && current.performanceTier === 'full') {
          badWindows = 0;
          runtimeCeilingRef.current = 'logo-reduced';
          lastTierChangeRef.current = timestamp;
          return buildPerformanceState('logo-reduced', 'runtime-fps');
        }
        if (badWindows >= BAD_WINDOWS_TO_DEGRADE
          && index < PERFORMANCE_TIERS.length - 1
          && sinceChange >= DEGRADE_COOLDOWN_MS) {
          badWindows = 0;
          lastTierChangeRef.current = timestamp;
          const nextTier = PERFORMANCE_TIERS[index + 1];
          return buildPerformanceState(nextTier, 'runtime-fps');
        }
        const ceiling = resolveRecoveryCeiling(
          heuristicTierRef.current,
          heuristicReasonRef.current,
          runtimeCeilingRef.current,
        );
        const maxIndex = performanceTierIndex(ceiling.tier);
        if (goodWindows >= GOOD_WINDOWS_TO_RECOVER && index > maxIndex && sinceChange >= RECOVER_COOLDOWN_MS) {
          goodWindows = 0;
          lastTierChangeRef.current = timestamp;
          const previousTier = PERFORMANCE_TIERS[index - 1];
          return buildPerformanceState(
            previousTier,
            index - 1 === maxIndex ? ceiling.reason : 'runtime-fps',
          );
        }
        return current;
      });
    };

    const sample = (timestamp: number) => {
      if (document.hidden) return;
      if (startTime === null) {
        startTime = timestamp;
        previousTime = timestamp;
        rafId = window.requestAnimationFrame(sample);
        return;
      }
      const frameTime = timestamp - previousTime;
      previousTime = timestamp;
      frameCount += 1;
      if (frameTime > SLOW_FRAME_MS) slowFrameCount += 1;
      const elapsedMs = timestamp - startTime;
      if (frameCount >= MAX_SAMPLE_FRAMES || elapsedMs >= MAX_SAMPLE_DURATION_MS) {
        evaluateWindow(elapsedMs, timestamp);
        resetWindow();
      }
      rafId = window.requestAnimationFrame(sample);
    };

    rafId = window.requestAnimationFrame(sample);
    return () => { if (rafId) window.cancelAnimationFrame(rafId); };
  }, [animationsComplete, heuristicsReady, isPageVisible, reducedMotion]);

  return state;
}
