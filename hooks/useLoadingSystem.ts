import { useState, useRef, useCallback, useEffect } from 'react';

const LOG_ENTRIES = [
  { threshold: 5, text: "INITIALIZING SYSTEM..." },
  { threshold: 11, text: "DETECTING HARDWARE_" },
  { threshold: 17, text: "SYSTEM ID [INS-001]" },
  { threshold: 23, text: "SCANNING ENVIRONMENT..." },
  { threshold: 29, text: "ANOMALY DETECTED [ATM-247]" },
  { threshold: 35, text: "ESTABLISHING SIGNAL..." },
  { threshold: 41, text: "CONNECTING TERMINAL [DAT-189]" },
  { threshold: 47, text: "DATABASE ONLINE..." },
  { threshold: 53, text: "LOADING MAP DATA [MAP-379]" },
  { threshold: 59, text: "INDEXING RECORDS..." },
  { threshold: 65, text: "CALCULATING INDEX [SRV-682]" },
  { threshold: 71, text: "LOADING ATMOSPHERIC MODEL..." },
  { threshold: 77, text: "CALIBRATING SYSTEMS..." },
  { threshold: 83, text: "VERIFYING INTEGRITY..." },
  { threshold: 89, text: "CONNECTING TO MAIN [SYS-000]" },
  { threshold: 93, text: "SYSTEM READY." },
  { threshold: 97, text: "WELCOME BACK." },
];

const MIN_DISPLAY_TIME = 1800;

export const useLoadingSystem = (startLogging: boolean = true) => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [logLines, setLogLines] = useState<Array<{ id: number; text: string }>>([]);
  const [showSplitLines, setShowSplitLines] = useState(false);

  // Progress tracking refs (no re-render needed)
  const startTimeRef = useRef<number | null>(null);
  const processedLogTextsRef = useRef(new Set<string>());
  const welcomeMessageCountsRef = useRef<Record<string, number>>({});
  const logQueueRef = useRef<Array<{ id: number; text: string }>>([]);
  const consumerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ===================== Log queue consumer =====================
  const startLogConsumer = useCallback(() => {
    if (consumerIntervalRef.current !== null) return;
    consumerIntervalRef.current = setInterval(() => {
      if (logQueueRef.current.length === 0) {
        clearInterval(consumerIntervalRef.current!);
        consumerIntervalRef.current = null;
        return;
      }
      const line = logQueueRef.current.shift()!;
      setLogLines(prev => [...prev, line]);
    }, 70);
  }, []);

  useEffect(() => {
    return () => {
      if (consumerIntervalRef.current !== null) {
        clearInterval(consumerIntervalRef.current);
      }
    };
  }, []);

  // ===================== Progress simulation =====================
  const generateLogLine = useCallback((prog: number) => {
    const newLines: Array<{ id: number; text: string }> = [];

    for (const log of LOG_ENTRIES) {
      const isWelcome = log.threshold === 93 || log.threshold === 97;
      const count = welcomeMessageCountsRef.current[log.text] || 0;
      const canProcess = isWelcome ? count < 2 : !processedLogTextsRef.current.has(log.text);

      if (prog >= log.threshold && canProcess) {
        if (isWelcome) {
          newLines.push({ id: Date.now() + Math.random(), text: log.text });
          welcomeMessageCountsRef.current[log.text] = count + 1;
        } else {
          processedLogTextsRef.current.add(log.text);
          const numLines = Math.random() < 0.2
            ? Math.floor(Math.random() * 6) + 3
            : Math.floor(Math.random() * 3) + 2;
          let lastPct = 0;
          for (let i = 1; i <= numLines; i++) {
            let pct: number;
            if (i === numLines) {
              pct = 100;
            } else {
              const minPct = lastPct + 5;
              const maxPct = Math.max(minPct + 5, 100 - (numLines - i) * 5);
              pct = Math.min(99, Math.floor(Math.random() * (maxPct - minPct + 1)) + minPct);
            }
            newLines.push({ id: Date.now() + Math.random() * i, text: `${log.text} ${pct}%` });
            lastPct = pct;
          }
        }
      }
    }

    if (newLines.length > 0) {
      logQueueRef.current.push(...newLines);
      startLogConsumer();
    }
  }, [startLogConsumer]);

  useEffect(() => {
    if (!startLogging) return;
    
    startTimeRef.current = Date.now();
    let drainPollId: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + (Math.random() * 3.0 + 0.5), 100);
        generateLogLine(next);
        if (next >= 100) {
          clearInterval(interval);
          const remaining = Math.max(0, MIN_DISPLAY_TIME - (Date.now() - (startTimeRef.current ?? Date.now())));
          const waitForQueueDrain = () => {
            if (logQueueRef.current.length === 0 && consumerIntervalRef.current === null) {
              setShowSplitLines(true);
            } else {
              drainPollId = setTimeout(waitForQueueDrain, 80);
            }
          };
          setTimeout(waitForQueueDrain, remaining);
          return 100;
        }
        return next;
      });
    }, 80);
    return () => {
      clearInterval(interval);
      if (drainPollId !== null) clearTimeout(drainPollId);
    };
  }, [generateLogLine, startLogging]);

  // ===================== Split lines trigger → exit =====================
  useEffect(() => {
    if (!showSplitLines) return;
    const reducedMotion = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion ? 100 : 600;
    const id = setTimeout(() => setLoading(false), delay);
    return () => clearTimeout(id);
  }, [showSplitLines]);

  return {
    progress,
    logLines,
    showSplitLines,
    loading
  };
};
