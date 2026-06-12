import { useState, useEffect, useRef } from 'react';
import type { RealtimeStatsState } from '../types';

const SYSTEM_LAUNCH_AT = new Date('2026-06-10T02:00:00+08:00').getTime();

function formatTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
}

function formatRuntime(uptimeMs: number): string {
  const days = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((uptimeMs % (1000 * 60)) / 1000);
  return (
    `${String(days).padStart(3, '0')}:` +
    `${String(hours).padStart(2, '0')}:` +
    `${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}`
  );
}

export default function useRealtimeStats(): RealtimeStatsState {
  const [currentTime, setCurrentTime] = useState('00:00:00');
  const [runtime, setRuntime] = useState('000:00:00:00');
  const [currentVisitDuration, setCurrentVisitDuration] = useState('000:00:00:00');
  const [totalVisits, setTotalVisits] = useState<number | string>(0);
  const [currentVisitors, setCurrentVisitors] = useState(0);

  const visitStartedAtRef = useRef<number>(0);

  // SSE connection + runtime stats
  useEffect(() => {
    let runtimeInterval: ReturnType<typeof setInterval> | undefined;
    let es: EventSource | undefined;

    const startRuntimeTick = () => {
      if (runtimeInterval) return;
      runtimeInterval = setInterval(() => {
        const now = Date.now();
        setRuntime(formatRuntime(Math.max(0, now - SYSTEM_LAUNCH_AT)));
        setCurrentVisitDuration(formatRuntime(Math.max(0, now - visitStartedAtRef.current)));
      }, 1000);
    };

    const stopRuntimeTick = () => {
      if (runtimeInterval) {
        clearInterval(runtimeInterval);
        runtimeInterval = undefined;
      }
    };

    async function init() {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setTotalVisits(data.visits);
        const now = Date.now();
        if (!visitStartedAtRef.current) {
          visitStartedAtRef.current = now;
        }
        setRuntime(formatRuntime(Math.max(0, now - SYSTEM_LAUNCH_AT)));
        setCurrentVisitDuration(formatRuntime(Math.max(0, now - visitStartedAtRef.current)));
        if (!document.hidden) startRuntimeTick();
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        setTotalVisits('N/A');
        const now = Date.now();
        if (!visitStartedAtRef.current) {
          visitStartedAtRef.current = now;
        }
        setRuntime(formatRuntime(Math.max(0, now - SYSTEM_LAUNCH_AT)));
        setCurrentVisitDuration(formatRuntime(Math.max(0, now - visitStartedAtRef.current)));
      }

      es = new EventSource('/api/sse/stats');
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (typeof data.onlineCount === 'number') {
            setCurrentVisitors(data.onlineCount);
          }
        } catch {
          // ignore malformed messages
        }
      };
      es.onerror = () => {
        console.warn('SSE connection error, will auto-reconnect.');
      };
    }

    const handleVisibility = () => {
      if (document.hidden) {
        stopRuntimeTick();
      } else {
        const now = Date.now();
        setRuntime(formatRuntime(Math.max(0, now - SYSTEM_LAUNCH_AT)));
        setCurrentVisitDuration(formatRuntime(Math.max(0, now - visitStartedAtRef.current)));
        startRuntimeTick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    init();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopRuntimeTick();
      if (es) es.close();
    };
  }, []);

  // Clock update
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const startClock = () => {
      if (intervalId) return;
      setCurrentTime(formatTime(new Date()));
      intervalId = setInterval(() => {
        setCurrentTime(formatTime(new Date()));
      }, 1000);
    };

    const stopClock = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) stopClock();
      else startClock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    startClock();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      stopClock();
    };
  }, []);

  return { currentTime, runtime, currentVisitDuration, totalVisits, currentVisitors };
}
