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

// 与 useLayoutRouteMode 保持一致：这些 pathname 模板下 LeftPanel 会被 standaloneHide
// 隐藏，整页布局变成 detail-only。loading overlay 在这些源页面跳转时也应满屏，
// 否则卡片会出现在右侧内容栏，但左侧空白区其实是没有 nav/avatar 的，看起来很奇怪。
function isStandalonePathname(pathname: string): boolean {
  return (
    pathname === '/[locale]/game'
    || pathname.startsWith('/[locale]/game/')
    || pathname.startsWith('/[locale]/web/')
    || pathname.startsWith('/[locale]/life/')
    || pathname.startsWith('/[locale]/blog/')
  );
}

export default function useRouteLoadingKind(router: Pick<NextRouter, 'events' | 'pathname'>) {
  const [routeLoadingState, setRouteLoadingState] = useState<RouteLoadingState>({
    kind: null,
    presentation: 'default',
  });

  useEffect(() => {
    const handleRouteChangeStart = (url: string) => {
      const path = url.split('?')[0]?.split('#')[0] ?? url;
      // 源页面（当前 pathname）决定 overlay 版式：
      //   - detail/standalone 源（blog→blog、life→blog 等）→ 'standalone' 满屏
      //   - 普通源（home / content → blog）→ 'default' 占右侧内容栏
      // 这样 loading 卡片永远落在"目标内容会出现的地方"。
      const presentation: RouteLoadingPresentation = isStandalonePathname(router.pathname)
        ? 'standalone'
        : 'default';

      if (TWEETS_ROUTE_RE.test(path)) {
        setRouteLoadingState({ kind: 'tweets', presentation });
        return;
      }

      if (BLOG_DETAIL_ROUTE_RE.test(path)) {
        setRouteLoadingState({ kind: 'blog', presentation });
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
  }, [router.events, router.pathname]);

  return routeLoadingState;
}
