import { useEffect, useRef, useState } from 'react';

interface StandalonePanelStateOptions {
  isStandalone: boolean;
  leftPanelAnimated: boolean;
  leversVisible: boolean;
}

export default function useStandalonePanelState({
  isStandalone,
  leftPanelAnimated,
  leversVisible,
}: StandalonePanelStateOptions) {
  const prevStandaloneRef = useRef(isStandalone);
  const [localPanelAnimated, setLocalPanelAnimated] = useState(leftPanelAnimated);
  const [localLeversVisible, setLocalLeversVisible] = useState(leversVisible);

  useEffect(() => {
    const schedulePanelSync = (nextPanelAnimated: boolean, nextLeversVisible: boolean) => {
      const timeoutId = window.setTimeout(() => {
        setLocalPanelAnimated(nextPanelAnimated);
        setLocalLeversVisible(nextLeversVisible);
      }, 0);
      return () => clearTimeout(timeoutId);
    };

    const wasStandalone = prevStandaloneRef.current;
    prevStandaloneRef.current = isStandalone;

    if (wasStandalone && !isStandalone) {
      setLocalPanelAnimated(false);
      setLocalLeversVisible(false);
      const panelTimeoutId = window.setTimeout(() => {
        setLocalPanelAnimated(true);
      }, 50);
      const leverTimeoutId = window.setTimeout(() => {
        setLocalLeversVisible(true);
      }, 850);
      return () => {
        clearTimeout(panelTimeoutId);
        clearTimeout(leverTimeoutId);
      };
    }

    if (isStandalone) {
      return schedulePanelSync(false, false);
    }

    return schedulePanelSync(leftPanelAnimated, leversVisible);
  }, [isStandalone, leftPanelAnimated, leversVisible]);

  return {
    localPanelAnimated,
    localLeversVisible,
  };
}
