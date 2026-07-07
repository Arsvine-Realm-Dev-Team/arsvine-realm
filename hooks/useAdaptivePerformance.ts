import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from './useMediaQuery';
import type { AdaptivePerformanceState, PerformanceReason, PerformanceTier } from '../types';

const MAX_SAMPLE_FRAMES = 120;
const MAX_SAMPLE_DURATION_MS = 2500;
const MIN_AVERAGE_FPS = 45;
const SLOW_FRAME_MS = 32;
const MAX_SLOW_FRAME_RATIO = 0.25;

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorPerformanceLike extends Navigator {
  connection?: NetworkInformationLike;
  deviceMemory?: number;
}

function buildPerformanceState(
  performanceTier: PerformanceTier,
  performanceReason: PerformanceReason,
): AdaptivePerformanceState {
  const allowFullEffects = performanceTier === 'full';
  return {
    performanceTier,
    performanceReason,
    allowWebGLEffects: allowFullEffects,
    allowCustomCursor: allowFullEffects,
    allowDecorativeMotion: allowFullEffects,
  };
}

function resolveHeuristicReason(reducedMotion: boolean): Exclude<PerformanceReason, 'runtime-fps' | null> | null {
  if (reducedMotion) {
    return 'reduced-motion';
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const performanceNavigator = navigator as NavigatorPerformanceLike;
  const connection = performanceNavigator.connection;
  if (
    connection?.saveData
    || connection?.effectiveType === 'slow-2g'
    || connection?.effectiveType === '2g'
    || connection?.effectiveType === '3g'
  ) {
    return 'device-heuristic';
  }

  if (
    (typeof performanceNavigator.deviceMemory === 'number' && performanceNavigator.deviceMemory <= 4)
    || (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency <= 4)
  ) {
    return 'device-heuristic';
  }

  return null;
}

export default function useAdaptivePerformance(animationsComplete: boolean): AdaptivePerformanceState {
  const reducedMotion = useReducedMotion();
  const [performanceState, setPerformanceState] = useState<AdaptivePerformanceState>(() => (
    buildPerformanceState('full', null)
  ));
  const [isPageVisible, setIsPageVisible] = useState(() => (
    typeof document === 'undefined' ? true : !document.hidden
  ));
  const [heuristicsReady, setHeuristicsReady] = useState(false);
  const samplingCompletedRef = useRef(performanceState.performanceTier === 'reduced');

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    const heuristicReason = resolveHeuristicReason(reducedMotion);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration must complete before enabling runtime-only heuristics, otherwise SSR and client first paint diverge
    setHeuristicsReady(true);

    if (!heuristicReason) {
      return;
    }

    samplingCompletedRef.current = true;
    // SSR 无法知道客户端设备/网络条件；把启发式降级推迟到 hydration 后，
    // 避免首帧服务端/客户端条件渲染不一致导致 hydration mismatch。
    setPerformanceState((current) => (
      current.performanceTier === 'reduced'
        ? current
        : buildPerformanceState('reduced', heuristicReason)
    ));
  }, [reducedMotion]);

  useEffect(() => {
    if (!heuristicsReady) {
      return;
    }
    document.documentElement.setAttribute('data-performance-tier', performanceState.performanceTier);
  }, [heuristicsReady, performanceState.performanceTier]);

  useEffect(() => {
    if (
      !heuristicsReady
      || !animationsComplete
      || !isPageVisible
      || performanceState.performanceTier === 'reduced'
      || samplingCompletedRef.current
    ) {
      return;
    }

    let rafId = 0;
    let startTime: number | null = null;
    let previousTime = 0;
    let frameCount = 0;
    let slowFrameCount = 0;

    const finishSampling = (elapsedMs: number) => {
      samplingCompletedRef.current = true;
      if (frameCount === 0 || elapsedMs <= 0) {
        return;
      }

      const averageFps = frameCount / (elapsedMs / 1000);
      const slowFrameRatio = slowFrameCount / frameCount;
      if (averageFps < MIN_AVERAGE_FPS || slowFrameRatio >= MAX_SLOW_FRAME_RATIO) {
        setPerformanceState((current) => (
          current.performanceTier === 'reduced'
            ? current
            : buildPerformanceState('reduced', 'runtime-fps')
        ));
      }
    };

    const sample = (timestamp: number) => {
      if (document.hidden) {
        return;
      }

      if (startTime === null) {
        startTime = timestamp;
        previousTime = timestamp;
        rafId = window.requestAnimationFrame(sample);
        return;
      }

      const frameTime = timestamp - previousTime;
      previousTime = timestamp;
      frameCount += 1;
      if (frameTime > SLOW_FRAME_MS) {
        slowFrameCount += 1;
      }

      const elapsedMs = timestamp - startTime;
      if (frameCount >= MAX_SAMPLE_FRAMES || elapsedMs >= MAX_SAMPLE_DURATION_MS) {
        finishSampling(elapsedMs);
        return;
      }

      rafId = window.requestAnimationFrame(sample);
    };

    rafId = window.requestAnimationFrame(sample);
    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [animationsComplete, heuristicsReady, isPageVisible, performanceState.performanceTier]);

  return performanceState;
}
