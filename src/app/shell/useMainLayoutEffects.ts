import { startTransition, useEffect, useState } from 'react';

import { useLayoutAnchors } from '@/features/navigation/model/LayoutAnchorsContext';
import { setHudTypingOverlaySuppressed, setHudTypingRouteEnabled } from '@/shared/lib/hud-typing-visibility';

export function useWebglReadyLatch(animationsComplete: boolean) {
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    if (!animationsComplete || webglReady) return;
    const timeoutId = window.setTimeout(() => {
      startTransition(() => setWebglReady(true));
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [animationsComplete, webglReady]);

  return webglReady;
}

export function useHudRouteVisibility(isStandalone: boolean) {
  useEffect(() => {
    setHudTypingRouteEnabled(!isStandalone);
    if (isStandalone) setHudTypingOverlaySuppressed(false);
  }, [isStandalone]);
}

export function useCursorTargetInvalidation(asPath: string, mainVisible: boolean) {
  useEffect(() => {
    window.dispatchEvent(new Event('arsvine:cursor-targets-dirty'));
  }, [asPath]);

  useEffect(() => {
    if (mainVisible) window.dispatchEvent(new Event('arsvine:cursor-targets-dirty'));
  }, [mainVisible]);
}

export function useContentHashAlignment(pathname: string, asPath: string) {
  const { align, cancel, isPending } = useLayoutAnchors();

  useEffect(() => {
    if (pathname !== '/[locale]/content') return;
    const hash = asPath.split('#')[1];
    if (!hash || isPending(hash)) return;
    void align(hash);
    return cancel;
  }, [align, asPath, cancel, isPending, pathname]);
}
