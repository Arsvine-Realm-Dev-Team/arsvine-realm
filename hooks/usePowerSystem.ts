import { useState, useEffect, useRef } from 'react';
import type { PowerSystemState } from '../types';

export default function usePowerSystem(mainVisible: boolean): PowerSystemState {
  const [powerLevel, setPowerLevel] = useState(67);
  const [isTesseractActivated, setIsTesseractActivated] = useState(false);
  const [isDischarging, setIsDischarging] = useState(false);
  const dischargeIntervalRef = useRef(null);

  // Inverted mode is purely derived from power state — no separate state needed.
  const isInverted = powerLevel === 100 && !isDischarging;

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
  const chargeBattery = () => {
    setPowerLevel(prevLevel => {
      if (prevLevel >= 100) return 100;
      const newLevel = Math.min(100, prevLevel + 5);
      return newLevel;
    });
  };

  // Discharge lever pull handler
  const handleDischargeLeverPull = () => {
    if (powerLevel === 100 && !isDischarging) {
      setIsDischarging(true);
    }
  };

  // Discharge process
  useEffect(() => {
    if (isDischarging) {
      if (dischargeIntervalRef.current) {
        clearInterval(dischargeIntervalRef.current);
      }
      dischargeIntervalRef.current = setInterval(() => {
        setPowerLevel(prevLevel => {
          if (prevLevel > 0) {
            return Math.max(0, prevLevel - 1);
          } else {
            clearInterval(dischargeIntervalRef.current);
            dischargeIntervalRef.current = null;
            setIsDischarging(false);
            return 0;
          }
        });
      }, 50);

      return () => {
        if (dischargeIntervalRef.current) {
          clearInterval(dischargeIntervalRef.current);
          dischargeIntervalRef.current = null;
        }
      };
    } else {
      if (dischargeIntervalRef.current) {
        clearInterval(dischargeIntervalRef.current);
        dischargeIntervalRef.current = null;
      }
    }
  }, [isDischarging]);

  // Activate Tesseract
  const handleActivateTesseract = () => {
    if (!isTesseractActivated) {
      setIsTesseractActivated(true);
    }
  };

  const deactivateTesseract = () => {
    setIsTesseractActivated(false);
  };

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
