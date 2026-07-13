'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';

import { useResponsive } from '@/shared/hooks/useMediaQuery';
import type { ContentHashNavigationRequest } from './contentHashNavigation';

export type ContentHashAlignmentResult = 'aligned' | 'timeout' | 'cancelled';

interface LayoutAnchorsContextValue {
  registerScrollContainer: (element: HTMLDivElement | null) => void;
  getScrollContainer: () => HTMLDivElement | null;
  align: (request: string | ContentHashNavigationRequest) => Promise<ContentHashAlignmentResult>;
  cancel: () => void;
  isPending: (hash: string) => boolean;
}

const LayoutAnchorsContext = createContext<LayoutAnchorsContextValue | null>(null);

export function LayoutAnchorsProvider({ children }: { children: ReactNode }) {
  const { isMobile } = useResponsive();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingHashRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    pendingHashRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const registerScrollContainer = useCallback((element: HTMLDivElement | null) => {
    scrollContainerRef.current = element;
  }, []);

  const getScrollContainer = useCallback(() => scrollContainerRef.current, []);
  const isPending = useCallback((hash: string) => pendingHashRef.current === hash, []);

  const align = useCallback((request: string | ContentHashNavigationRequest) => {
    cancel();
    const target = typeof request === 'string' ? { hash: request, requestId: null } : request;
    pendingHashRef.current = target.hash;

    return new Promise<ContentHashAlignmentResult>((resolve) => {
      let frameId = 0;
      let timeoutId = 0;
      let attempts = 0;
      let settled = false;
      const maxAttempts = 6;

      const settle = (result: ContentHashAlignmentResult) => {
        if (settled) return;
        settled = true;
        if (frameId) window.cancelAnimationFrame(frameId);
        if (timeoutId) window.clearTimeout(timeoutId);
        if (pendingHashRef.current === target.hash) pendingHashRef.current = null;
        if (cleanupRef.current === cleanup) cleanupRef.current = null;
        resolve(result);
      };
      const cleanup = () => settle('cancelled');
      cleanupRef.current = cleanup;

      const getTargetOffset = () => {
        if (!isMobile) return 0;
        const raw = getComputedStyle(document.documentElement)
          .getPropertyValue('--mobile-section-scroll-offset')
          .trim()
          .replace('px', '');
        const parsed = Number.parseFloat(raw);
        return Number.isFinite(parsed) ? parsed : 0;
      };

      const retry = () => {
        timeoutId = window.setTimeout(() => {
          frameId = window.requestAnimationFrame(alignTarget);
        }, 50);
      };

      const alignTarget = () => {
        if (settled) return;
        const element = document.getElementById(`section-${target.hash}`);
        if (!element || !scrollContainerRef.current) {
          attempts += 1;
          if (attempts < maxAttempts) retry();
          else settle('timeout');
          return;
        }

        element.scrollIntoView({ behavior: 'auto', block: 'start' });
        attempts += 1;
        const top = element.getBoundingClientRect().top;
        if (attempts < maxAttempts && Math.abs(top - getTargetOffset()) > 8) {
          retry();
          return;
        }
        settle('aligned');
      };

      frameId = window.requestAnimationFrame(() => {
        frameId = window.requestAnimationFrame(alignTarget);
      });
    });
  }, [cancel, isMobile]);

  const value = useMemo<LayoutAnchorsContextValue>(() => ({
    registerScrollContainer,
    getScrollContainer,
    align,
    cancel,
    isPending,
  }), [align, cancel, getScrollContainer, isPending, registerScrollContainer]);

  return <LayoutAnchorsContext.Provider value={value}>{children}</LayoutAnchorsContext.Provider>;
}

export function useLayoutAnchors() {
  const value = useContext(LayoutAnchorsContext);
  if (!value) throw new Error('useLayoutAnchors must be used within LayoutAnchorsProvider');
  return value;
}

export default LayoutAnchorsContext;
