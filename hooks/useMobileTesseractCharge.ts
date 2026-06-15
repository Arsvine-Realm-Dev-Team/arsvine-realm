import { useEffect, useRef } from 'react';

interface UseMobileTesseractChargeOptions {
  isDesktop: boolean;
  isTesseractActivated: boolean;
  powerLevel: number;
  chargeBattery: () => void;
  deactivateTesseract: () => void;
}

export default function useMobileTesseractCharge({
  isDesktop,
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
    if (!isDesktop && isTesseractActivated) {
      const intervalId = window.setInterval(() => {
        chargeBatteryRef.current();
      }, 200);
      return () => window.clearInterval(intervalId);
    }

    return undefined;
  }, [isDesktop, isTesseractActivated]);

  useEffect(() => {
    if (!isDesktop && powerLevel >= 100 && isTesseractActivated) {
      deactivateTesseractRef.current();
    }
  }, [isDesktop, isTesseractActivated, powerLevel]);
}
