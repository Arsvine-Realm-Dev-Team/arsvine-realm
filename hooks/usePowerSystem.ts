import { useState, useEffect, useRef, useCallback } from 'react';
import type { PowerSystemState } from '../types';

const CHARGE_STEP = 8;
const DISCHARGE_STEP = 1;
const DISCHARGE_INTERVAL_MS = 50;

export default function usePowerSystem(mainVisible: boolean): PowerSystemState {
  const [powerLevel, setPowerLevel] = useState(67);
  const [isTesseractActivated, setIsTesseractActivated] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const dischargeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDischargingRef = useRef(false);

  // Inverted mode is purely derived from power state — no separate state needed.
  const isInverted = powerLevel === 100 && !isDischarging;

  useEffect(() => {
    isDischargingRef.current = isDischarging;
  }, [isDischarging]);

  const stopDischarge = useCallback(() => {
    if (dischargeIntervalRef.current) {
      clearInterval(dischargeIntervalRef.current);
      dischargeIntervalRef.current = null;
    }
    if (isDischargingRef.current) {
      isDischargingRef.current = false;
      setIsDischarging(false);
    }
  }, []);

  // Natural power consumption
  useEffect(() => {
    if (!mainVisible) return;

    const intervalId = setInterval(() => {
      setPowerLevel(prevLevel => {
        if (!isDischarging && prevLevel < 100) {
          const decrease = Math.floor(Math.random() * 3) + 1;
          return Math.max(0, prevLevel - decrease);
        }
        return prevLevel;
      });
    }, 5000);

    return () => clearInterval(intervalId);
  }, [mainVisible, isDischarging]);

  // Charge battery (called by Tesseract interaction)
  const chargeBattery = useCallback(() => {
    if (isDischargingRef.current) {
      stopDischarge();
    }
    setPowerLevel(prevLevel => {
      if (prevLevel >= 100) return 100;
      const newLevel = Math.min(100, prevLevel + CHARGE_STEP);
      return newLevel;
    });
  }, [stopDischarge]);

  // Discharge lever pull handler
  const handleDischargeLeverPull = useCallback(() => {
    if (powerLevel === 100 && !isDischarging) {
      setIsTesseractActivated(false);
      setIsDischarging(true);
    }
  }, [isDischarging, powerLevel]);

  // Discharge process
  useEffect(() => {
    if (isDischarging) {
      if (dischargeIntervalRef.current) {
        clearInterval(dischargeIntervalRef.current);
      }
      dischargeIntervalRef.current = setInterval(() => {
        setPowerLevel(prevLevel => {
          const nextLevel = Math.max(0, prevLevel - DISCHARGE_STEP);
          if (nextLevel === 0) {
            stopDischarge();
          }
          return nextLevel;
        });
      }, DISCHARGE_INTERVAL_MS);

      return () => {
        if (dischargeIntervalRef.current) {
          clearInterval(dischargeIntervalRef.current);
          dischargeIntervalRef.current = null;
        }
      };
    } else {
      stopDischarge();
    }
  }, [isDischarging, stopDischarge]);

  // Activate Tesseract
  const handleActivateTesseract = useCallback(() => {
    if (isDischargingRef.current) {
      stopDischarge();
    }
    if (!isTesseractActivated) {
      setIsTesseractActivated(true);
    }
  }, [isTesseractActivated, stopDischarge]);

  const deactivateTesseract = useCallback(() => {
    setIsTesseractActivated(false);
  }, []);

  return {
    powerLevel,
    isInverted,
    isTesseractActivated,
    isDischarging,
    chargeBattery,
    handleDischargeLeverPull,
    handleActivateTesseract,
    deactivateTesseract,
  };
}
