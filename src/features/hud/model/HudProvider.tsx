import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import useAnimationSequence from './useAnimationSequence';
import useAdaptivePerformance from './useAdaptivePerformance';
import usePowerSystem from './usePowerSystem';
import useRealtimeStats from './useRealtimeStats';
import useColumnHover from './useColumnHover';
import { useFateTypingEffect } from './useFateTypingEffect';
import { useEnvParamsTypingEffect } from './useEnvParamsTypingEffect';
import { getHudTypingEnabledSnapshot, subscribeHudTypingVisibility } from '@/shared/lib/hud-typing-visibility';
import type { HudContextValue } from '../../../shared/types';

const HudContext = createContext<HudContextValue | null>(null);

interface HudProviderProps {
  children: ReactNode;
}

export function HudProvider({ children }: HudProviderProps) {
  const animation = useAnimationSequence();
  const {
    isLoading, mainVisible, linesAnimated, hudVisible,
    leftPanelAnimated, textVisible, animationsComplete, leversVisible,
    pulsingNormalIndices, pulsingReverseIndices, handleLoadingComplete,
    columnPhase, retractColumns, expandColumns,
  } = animation;

  const adaptivePerformance = useAdaptivePerformance(animationsComplete);
  const {
    performanceTier, performanceReason, allowLogoMotion, allowAmbientWebGL, allowInteractiveWebGL,
    allowHeavyCssEffects, allowCustomCursor, allowDecorativeMotion,
  } = adaptivePerformance;

  const power = usePowerSystem(mainVisible);
  const {
    powerLevel, isInverted, isTesseractActivated, isDischarging,
    chargeBattery, handleDischargeLeverPull, handleActivateTesseract,
    deactivateTesseract,
  } = power;

  const stats = useRealtimeStats();
  const { currentTime, runtime, currentVisitDuration } = stats;

  const hudTypingEnabled = useSyncExternalStore(
    subscribeHudTypingVisibility,
    getHudTypingEnabledSnapshot,
    getHudTypingEnabledSnapshot,
  );

  const { displayedFateText, isFateTypingActive } = useFateTypingEffect(
    textVisible && hudTypingEnabled,
  );
  const { displayedEnvParams, isEnvParamsTyping, envData, envDataVersion, envArtifactStage } = useEnvParamsTypingEffect(
    textVisible,
    hudTypingEnabled,
  );

  const columnHover = useColumnHover();
  const {
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  } = columnHover;

  const value = useMemo(() => ({
    // Animation
    isLoading, mainVisible, linesAnimated, hudVisible,
    leftPanelAnimated, textVisible, animationsComplete, leversVisible,
    pulsingNormalIndices, pulsingReverseIndices, handleLoadingComplete,
    columnPhase, retractColumns, expandColumns,
    performanceTier, performanceReason, allowLogoMotion, allowAmbientWebGL, allowInteractiveWebGL,
    allowHeavyCssEffects, allowCustomCursor, allowDecorativeMotion,
    // Power
    powerLevel, isInverted, isTesseractActivated, isDischarging,
    chargeBattery, handleDischargeLeverPull, handleActivateTesseract, deactivateTesseract,
    // Stats
    currentTime, runtime, currentVisitDuration,
    // Typing
    displayedFateText, isFateTypingActive,
    displayedEnvParams, isEnvParamsTyping, envData, envDataVersion, envArtifactStage,
    // Column hover
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  }), [
    isLoading, mainVisible, linesAnimated, hudVisible,
    leftPanelAnimated, textVisible, animationsComplete, leversVisible,
    pulsingNormalIndices, pulsingReverseIndices, handleLoadingComplete,
    columnPhase, retractColumns, expandColumns,
    performanceTier, performanceReason, allowLogoMotion, allowAmbientWebGL, allowInteractiveWebGL,
    allowHeavyCssEffects, allowCustomCursor, allowDecorativeMotion,
    powerLevel, isInverted, isTesseractActivated, isDischarging,
    chargeBattery, handleDischargeLeverPull, handleActivateTesseract, deactivateTesseract,
    currentTime, runtime, currentVisitDuration,
    displayedFateText, isFateTypingActive,
    displayedEnvParams, isEnvParamsTyping, envData, envDataVersion, envArtifactStage,
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  ]);

  return <HudContext.Provider value={value}>{children}</HudContext.Provider>;
}

export function useHud(): HudContextValue {
  const ctx = useContext(HudContext);
  if (!ctx) throw new Error('useHud must be used within HudProvider');
  return ctx;
}

export default HudProvider;
