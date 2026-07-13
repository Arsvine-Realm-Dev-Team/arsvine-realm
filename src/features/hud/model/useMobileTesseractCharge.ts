import { useEffect, useRef } from 'react';

interface UseMobileTesseractChargeOptions {
  shouldUseAutoChargeFallback: boolean;
  isTesseractActivated: boolean;
  powerLevel: number;
  chargeBattery: () => void;
  deactivateTesseract: () => void;
}

export default function useMobileTesseractCharge({
  shouldUseAutoChargeFallback,
  isTesseractActivated,
  powerLevel,
  chargeBattery,
  deactivateTesseract,
}: UseMobileTesseractChargeOptions) {
  const chargeBatteryRef = useRef(chargeBattery);
  const deactivateTesseractRef = useRef(deactivateTesseract);

  useEffect(() => {
    chargeBatteryRef.current = chargeBattery;
  }, [chargeBattery]);

  useEffect(() => {
    deactivateTesseractRef.current = deactivateTesseract;
  }, [deactivateTesseract]);

  useEffect(() => {
    if (shouldUseAutoChargeFallback && isTesseractActivated) {
      const intervalId = window.setInterval(() => {
        chargeBatteryRef.current();
      }, 200);
      return () => window.clearInterval(intervalId);
    }

    return undefined;
  }, [shouldUseAutoChargeFallback, isTesseractActivated]);

  useEffect(() => {
    if (shouldUseAutoChargeFallback && powerLevel >= 100 && isTesseractActivated) {
      deactivateTesseractRef.current();
    }
  }, [shouldUseAutoChargeFallback, isTesseractActivated, powerLevel]);
}
