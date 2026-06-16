import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import useAnimationSequence from '../hooks/useAnimationSequence';
import usePowerSystem from '../hooks/usePowerSystem';
import useRealtimeStats from '../hooks/useRealtimeStats';
import useColumnHover from '../hooks/useColumnHover';
import { useFateTypingEffect, useEnvParamsTypingEffect } from '../hooks/useTypingEffect';
import { getHudTypingEnabledSnapshot, subscribeHudTypingVisibility } from '../lib/hud-typing-visibility';
import type { AppContextValue } from '../types';

const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const animation = useAnimationSequence();
  const {
    isLoading, mainVisible, linesAnimated, hudVisible,
    leftPanelAnimated, textVisible, animationsComplete, leversVisible,
    pulsingNormalIndices, pulsingReverseIndices, handleLoadingComplete,
    columnPhase, retractColumns, expandColumns,
  } = animation;

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
  const { displayedEnvParams, isEnvParamsTyping, envData, envDataVersion } = useEnvParamsTypingEffect(
    textVisible && hudTypingEnabled,
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
    // Power
    powerLevel, isInverted, isTesseractActivated, isDischarging,
    chargeBattery, handleDischargeLeverPull, handleActivateTesseract, deactivateTesseract,
    // Stats
    currentTime, runtime, currentVisitDuration,
    // Typing
    displayedFateText, isFateTypingActive,
    displayedEnvParams, isEnvParamsTyping, envData, envDataVersion,
    // Column hover
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  }), [
    isLoading, mainVisible, linesAnimated, hudVisible,
    leftPanelAnimated, textVisible, animationsComplete, leversVisible,
    pulsingNormalIndices, pulsingReverseIndices, handleLoadingComplete,
    columnPhase, retractColumns, expandColumns,
    powerLevel, isInverted, isTesseractActivated, isDischarging,
    chargeBattery, handleDischargeLeverPull, handleActivateTesseract, deactivateTesseract,
    currentTime, runtime, currentVisitDuration,
    displayedFateText, isFateTypingActive,
    displayedEnvParams, isEnvParamsTyping, envData, envDataVersion,
    randomHudTexts, branchText1, branchText2, branchText3, branchText4,
    handleColumnMouseEnter, handleColumnMouseLeave,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
