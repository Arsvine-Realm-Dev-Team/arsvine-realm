import { useEffect, useState } from 'react';
import type { NextRouter } from 'next/router';

export type RouteLoadingKind = null | 'tweets' | 'blog';
export type RouteLoadingPresentation = 'default' | 'standalone';

interface RouteLoadingState {
  kind: RouteLoadingKind;
  presentation: RouteLoadingPresentation;
}

const TWEETS_ROUTE_RE = /^\/[A-Za-z-]+\/tweets\/?$/;
const BLOG_DETAIL_ROUTE_RE = /^\/[A-Za-z-]+\/blog\/[^/]+\/?$/;

export default function useRouteLoadingKind(router: Pick<NextRouter, 'events'>) {
  const [routeLoadingState, setRouteLoadingState] = useState<RouteLoadingState>({
    kind: null,
    presentation: 'default',
  });

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      const path = url.split('?')[0]?.split('#')[0] ?? url;

      if (TWEETS_ROUTE_RE.test(path)) {
        setRouteLoadingState({ kind: 'tweets', presentation: 'default' });
        return;
      }

      if (BLOG_DETAIL_ROUTE_RE.test(path)) {
        setRouteLoadingState({ kind: 'blog', presentation: 'standalone' });
        return;
      }

      setRouteLoadingState({ kind: null, presentation: 'default' });
    };

    const clearRouteLoading = () => {
      setRouteLoadingState({ kind: null, presentation: 'default' });
    };

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', clearRouteLoading);
    router.events.on('routeChangeError', clearRouteLoading);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', clearRouteLoading);
      router.events.off('routeChangeError', clearRouteLoading);
    };
  }, [router.events]);

  return routeLoadingState;
}
