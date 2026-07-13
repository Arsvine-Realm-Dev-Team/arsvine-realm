import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { EnvArtifactStage, EnvData, EnvParamsTypingState } from '../../../shared/types';
import { useSafeTimeouts } from '../../../shared/hooks/useSafeTimeouts';
import {
  advanceArtifactLoad,
  buildTelemetryArtifactText,
  computeArtifactStage,
  createTelemetrySnapshot,
  decayArtifactLoad,
} from '@/shared/lib/env-telemetry-artifact';

const ENV_INITIAL_BOOT_DELAY = 1000;
const ENV_REFRESH_MIN_MS = 10000;
const ENV_REFRESH_JITTER_MS = 6000;
const ENV_DWELL_INTERVAL_MS = 24000;
const ENV_DECAY_INTERVAL_MS = 30000;
const ENV_IDLE_DECAY_THRESHOLD_MS = 45000;
const ENV_VISIBILITY_GAIN_THRESHOLD_MS = 15000;
const ENV_SCROLL_GAIN_COOLDOWN_MS = 20000;
const ENV_OVERWRITE_DELAY_MS = 18;
const ENV_OVERWRITE_BATCH_MIN = 2;
const ENV_OVERWRITE_BATCH_MAX = 4;

function hashDisplayedBuffer(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Environment parameters typing effect — stable telemetry first, then residual overwrite artifact
 */
export function useEnvParamsTypingEffect(textVisible: boolean, routeEnabled: boolean): EnvParamsTypingState {
  const router = useRouter();
  const [displayedEnvParams, setDisplayedEnvParams] = useState('');
  const [isEnvParamsTyping, setIsEnvParamsTyping] = useState(false);
  const [envData, setEnvData] = useState<EnvData | null>(null);
  const [envDataVersion, setEnvDataVersion] = useState(0);
  const [envArtifactStage, setEnvArtifactStage] = useState<EnvArtifactStage>(0);
  const currentTempRef = useRef(55.0);
  const displayedEnvParamsRef = useRef('');
  const envDataRef = useRef<EnvData | null>(null);
  const currentSnapshotRef = useRef<ReturnType<typeof createTelemetrySnapshot> | null>(null);
  const routeEnabledRef = useRef(routeEnabled);
  const artifactLoadRef = useRef(0);
  const envArtifactStageRef = useRef<EnvArtifactStage>(0);
  const lastArtifactGainAtRef = useRef(0);
  const lastHiddenAtRef = useRef<number | null>(null);
  const lastScrollGainAtRef = useRef(0);
  const initializedRef = useRef(false);
  const bootTimerRef = useRef<number | undefined>(undefined);
  const refreshTimerRef = useRef<number | undefined>(undefined);
  const dwellIntervalRef = useRef<number | undefined>(undefined);
  const decayIntervalRef = useRef<number | undefined>(undefined);
  const overwriteStepTimerRef = useRef<number | undefined>(undefined);
  const pendingRefreshRef = useRef(false);
  const pendingPulseRef = useRef(false);
  const telemetryVariantRef = useRef(0);
  const pulseCounterRef = useRef(0);
  const safeTimers = useSafeTimeouts();

  const updateDisplayedEnvParams = (value: string | ((previous: string) => string)) => {
    setDisplayedEnvParams((previous) => {
      const next = typeof value === 'function'
        ? (value as (previous: string) => string)(previous)
        : value;
      displayedEnvParamsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    routeEnabledRef.current = routeEnabled;
  }, [routeEnabled]);

  useEffect(() => {
    if (textVisible) {
      return;
    }

    initializedRef.current = false;
    artifactLoadRef.current = 0;
    envArtifactStageRef.current = 0;
    lastArtifactGainAtRef.current = 0;
    lastHiddenAtRef.current = null;
    lastScrollGainAtRef.current = 0;
    pendingRefreshRef.current = false;
    pendingPulseRef.current = false;
    telemetryVariantRef.current = 0;
    pulseCounterRef.current = 0;
    currentSnapshotRef.current = null;
    envDataRef.current = null;
    safeTimers.clearTimeout(bootTimerRef.current);
    safeTimers.clearTimeout(refreshTimerRef.current);
    safeTimers.clearTimeout(overwriteStepTimerRef.current);
    safeTimers.clearInterval(dwellIntervalRef.current);
    safeTimers.clearInterval(decayIntervalRef.current);
    bootTimerRef.current = undefined;
    refreshTimerRef.current = undefined;
    overwriteStepTimerRef.current = undefined;
    dwellIntervalRef.current = undefined;
    decayIntervalRef.current = undefined;
    displayedEnvParamsRef.current = '';
    // eslint-disable-next-line react-hooks/set-state-in-effect -- textVisible 关闭时必须立即清空遥测残影，避免 standalone 返回后闪现旧文本
    setDisplayedEnvParams('');
    setEnvData(null);
    setEnvDataVersion(0);
    setEnvArtifactStage(0);
    setIsEnvParamsTyping(false);
  }, [textVisible, safeTimers]);

  useEffect(() => {
    if (!textVisible) return;

    const typingDelay = 32;
    const canRenderNow = () => routeEnabledRef.current && !document.hidden;

    const randomRefreshDelay = () => ENV_REFRESH_MIN_MS + Math.floor(Math.random() * ENV_REFRESH_JITTER_MS);

    const applyStage = (nextStage: EnvArtifactStage) => {
      envArtifactStageRef.current = nextStage;
      setEnvArtifactStage(nextStage);
    };

    const pushLoad = (nextLoad: number, shouldPulse = true) => {
      const clampedLoad = Math.max(0, Math.min(100, Math.round(nextLoad)));
      artifactLoadRef.current = clampedLoad;
      applyStage(computeArtifactStage(clampedLoad));
      if (shouldPulse) {
        pendingPulseRef.current = true;
      }
    };

    const noteArtifactGain = (reason: Parameters<typeof advanceArtifactLoad>[1]) => {
      const nextLoad = advanceArtifactLoad(artifactLoadRef.current, reason);
      lastArtifactGainAtRef.current = Date.now();
      pushLoad(nextLoad);
    };

    const createNextEnvData = () => {
      const tempChange = (Math.random() * 3) - 1.5;
      let nextTemp = currentTempRef.current + tempChange;
      nextTemp = Math.max(44, Math.min(66, nextTemp));
      currentTempRef.current = nextTemp;

      const pollutionLevels = ['SEVERE', 'CRITICAL', 'UNSTABLE', 'HAZARDOUS'];
      const rainStatus = ['IMMINENT', 'LIKELY', 'UNLIKELY', 'CERTAIN'];

      return {
        temp: nextTemp,
        rad: Math.floor(200 + Math.random() * 300),
        o2: Number((8 + Math.random() * 2).toFixed(1)),
        pollution: pollutionLevels[Math.floor(Math.random() * pollutionLevels.length)] ?? pollutionLevels[0],
        acidRain: rainStatus[Math.floor(Math.random() * rainStatus.length)] ?? rainStatus[0],
      };
    };

    const syncEnvSnapshot = (nextEnvData: EnvData) => {
      envDataRef.current = nextEnvData;
      setEnvData(nextEnvData);
      setEnvDataVersion((previous) => previous + 1);

      const snapshot = createTelemetrySnapshot(nextEnvData, telemetryVariantRef.current);
      telemetryVariantRef.current += 1;
      currentSnapshotRef.current = snapshot;
      return snapshot;
    };

    const finishPulse = (finalText: string) => {
      updateDisplayedEnvParams(finalText);
      overwriteStepTimerRef.current = undefined;
      setIsEnvParamsTyping(false);
      pendingPulseRef.current = false;
    };

    const typeInitialBlock = (target: string) => {
      setIsEnvParamsTyping(true);
      updateDisplayedEnvParams('');

      const step = (index: number) => {
        if (index >= target.length) {
          finishPulse(target);
          return;
        }

        updateDisplayedEnvParams((previous) => previous + target[index]);
        overwriteStepTimerRef.current = safeTimers.setTimeout(() => step(index + 1), typingDelay);
      };

      step(0);
    };

    const overwriteToTarget = (target: string) => {
      const current = displayedEnvParamsRef.current;
      if (current.length === 0) {
        typeInitialBlock(target);
        return;
      }

      const maxLength = Math.max(current.length, target.length);
      const working = Array.from({ length: maxLength }, (_, index) => current[index] ?? '');
      const targetChars = Array.from({ length: maxLength }, (_, index) => target[index] ?? '');
      const indices = targetChars
        .map((char, index) => (working[index] === char ? -1 : index))
        .filter((index) => index >= 0);

      if (indices.length === 0) {
        finishPulse(target);
        return;
      }

      setIsEnvParamsTyping(true);

      const step = () => {
        if (indices.length === 0) {
          finishPulse(target);
          return;
        }

        const batchSize = ENV_OVERWRITE_BATCH_MIN + Math.floor(Math.random() * (ENV_OVERWRITE_BATCH_MAX - ENV_OVERWRITE_BATCH_MIN + 1));
        for (let count = 0; count < batchSize && indices.length > 0; count += 1) {
          const pickedIndex = Math.floor(Math.random() * indices.length);
          const targetIndex = indices.splice(pickedIndex, 1)[0];
          working[targetIndex] = targetChars[targetIndex];
        }

        updateDisplayedEnvParams(working.join(''));
        overwriteStepTimerRef.current = safeTimers.setTimeout(step, ENV_OVERWRITE_DELAY_MS);
      };

      step();
    };

    const scheduleNextRefresh = (delay = randomRefreshDelay()) => {
      safeTimers.clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = safeTimers.setTimeout(() => {
        refreshTimerRef.current = undefined;
        pendingRefreshRef.current = true;
        if (!canRenderNow()) {
          return;
        }
        runPulse(true);
      }, delay);
    };

    const runPulse = (refreshSnapshot: boolean) => {
      if (!canRenderNow()) {
        pendingPulseRef.current = true;
        return;
      }

      safeTimers.clearTimeout(overwriteStepTimerRef.current);
      overwriteStepTimerRef.current = undefined;

      const nextEnvData = refreshSnapshot || !envDataRef.current
        ? createNextEnvData()
        : envDataRef.current;
      const snapshot = refreshSnapshot || !currentSnapshotRef.current
        ? syncEnvSnapshot(nextEnvData)
        : currentSnapshotRef.current;

      if (!snapshot || !nextEnvData) {
        return;
      }

      const stage = computeArtifactStage(artifactLoadRef.current);
      applyStage(stage);
      pulseCounterRef.current += 1;
      const seed = `${snapshot.id}:${stage}:${pulseCounterRef.current}:${hashDisplayedBuffer(displayedEnvParamsRef.current)}`;
      const target = buildTelemetryArtifactText({
        snapshot,
        previousBuffer: displayedEnvParamsRef.current || snapshot.text,
        stage,
        seed,
        envData: nextEnvData,
      });

      pendingRefreshRef.current = false;
      overwriteToTarget(target);
      scheduleNextRefresh();
    };

    const ensureBooted = () => {
      if (initializedRef.current) {
        if (pendingRefreshRef.current || pendingPulseRef.current) {
          runPulse(Boolean(pendingRefreshRef.current));
        } else if (!refreshTimerRef.current && canRenderNow()) {
          scheduleNextRefresh();
        }
        return;
      }

      if (bootTimerRef.current !== undefined) {
        return;
      }

      bootTimerRef.current = safeTimers.setTimeout(() => {
        bootTimerRef.current = undefined;
        if (!canRenderNow()) {
          pendingPulseRef.current = true;
          return;
        }

        initializedRef.current = true;
        lastArtifactGainAtRef.current = Date.now();
        const initialEnvData = createNextEnvData();
        const initialSnapshot = syncEnvSnapshot(initialEnvData);
        applyStage(0);
        pulseCounterRef.current += 1;
        const target = buildTelemetryArtifactText({
          snapshot: initialSnapshot,
          previousBuffer: '',
          stage: 0,
          seed: `${initialSnapshot.id}:0:${pulseCounterRef.current}:stable`,
          envData: initialEnvData,
        });
        typeInitialBlock(target);
        scheduleNextRefresh();
      }, ENV_INITIAL_BOOT_DELAY);
    };

    const handleRouteChangeComplete = () => {
      noteArtifactGain('route');
      if (initializedRef.current && canRenderNow()) {
        runPulse(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastHiddenAtRef.current = Date.now();
        setIsEnvParamsTyping(false);
        return;
      }

      if (lastHiddenAtRef.current && Date.now() - lastHiddenAtRef.current > ENV_VISIBILITY_GAIN_THRESHOLD_MS) {
        noteArtifactGain('visibility-return');
      }
      lastHiddenAtRef.current = null;

      if (initializedRef.current) {
        runPulse(Boolean(pendingRefreshRef.current));
        return;
      }

      ensureBooted();
    };

    const handleScroll = () => {
      if (!canRenderNow()) return;
      const now = Date.now();
      if (now - lastScrollGainAtRef.current < ENV_SCROLL_GAIN_COOLDOWN_MS) {
        return;
      }
      lastScrollGainAtRef.current = now;
      noteArtifactGain('scroll');
      if (initializedRef.current) {
        runPulse(false);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('scroll', handleScroll, { passive: true });

    dwellIntervalRef.current = safeTimers.setInterval(() => {
      if (!canRenderNow() || !initializedRef.current) return;
      if (artifactLoadRef.current >= 70) return;
      noteArtifactGain('dwell');
      runPulse(false);
    }, ENV_DWELL_INTERVAL_MS);

    decayIntervalRef.current = safeTimers.setInterval(() => {
      if (!canRenderNow() || !initializedRef.current) return;
      if (Date.now() - lastArtifactGainAtRef.current < ENV_IDLE_DECAY_THRESHOLD_MS) return;
      const nextLoad = decayArtifactLoad(artifactLoadRef.current);
      if (nextLoad === artifactLoadRef.current) return;
      pushLoad(nextLoad, true);
      runPulse(false);
    }, ENV_DECAY_INTERVAL_MS);

    ensureBooted();

    return () => {
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('scroll', handleScroll);
      safeTimers.clearTimeout(bootTimerRef.current);
      safeTimers.clearTimeout(refreshTimerRef.current);
      safeTimers.clearTimeout(overwriteStepTimerRef.current);
      safeTimers.clearInterval(dwellIntervalRef.current);
      safeTimers.clearInterval(decayIntervalRef.current);
      bootTimerRef.current = undefined;
      refreshTimerRef.current = undefined;
      overwriteStepTimerRef.current = undefined;
      dwellIntervalRef.current = undefined;
      decayIntervalRef.current = undefined;
    };
  }, [routeEnabled, router.events, safeTimers, textVisible]);

  useEffect(() => {
    if (routeEnabled) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- standalone 路由隐藏 LeftPanel 时要立刻熄灭光标，避免后台 pulse 挂住 typing 态
    setIsEnvParamsTyping(false);
  }, [routeEnabled]);

  return { displayedEnvParams, isEnvParamsTyping, envData, envDataVersion, envArtifactStage };
}
