export const CONTENT_HASH_SCROLL_EVENT = 'arsvine:scroll-content-hash';
export const CONTENT_HASH_SCROLL_COMPLETE_EVENT = 'arsvine:scroll-content-hash-complete';

export type RouteKind = 'home' | 'content' | 'standalone' | 'auxiliary';
export type ContentHashTransitionMode = 'same-page' | 'cross-page' | 'not-content-hash';

export interface ContentHashNavigationRequest {
  hash: string;
  requestId: string;
}

let pendingContentHashNavigation: ContentHashNavigationRequest | null = null;
let contentHashNavigationRequestCounter = 0;

export function getContentSectionHashFromUrl(url: string): string | null {
  if (!url.includes('#')) {
    return null;
  }

  const [pathPart, hashPart = ''] = url.split('#');
  const pathWithoutQuery = pathPart.split('?')[0] ?? pathPart;
  const segments = pathWithoutQuery.split('/').filter(Boolean);

  if (segments.length !== 2 || segments[1] !== 'content' || hashPart.length === 0) {
    return null;
  }

  return decodeURIComponent(hashPart);
}

export function classifyRoutePathname(pathname: string): RouteKind {
  if (pathname === '/[locale]') {
    return 'home';
  }

  if (pathname === '/[locale]/content') {
    return 'content';
  }

  if (
    pathname.startsWith('/[locale]/web/')
    || pathname.startsWith('/[locale]/life/')
    || pathname.startsWith('/[locale]/blog/')
  ) {
    return 'standalone';
  }

  return 'auxiliary';
}

export function resolveContentHashTransitionMode(
  sourcePathname: string,
  targetUrl: string,
): ContentHashTransitionMode {
  if (!getContentSectionHashFromUrl(targetUrl)) {
    return 'not-content-hash';
  }

  return classifyRoutePathname(sourcePathname) === 'content'
    ? 'same-page'
    : 'cross-page';
}

export function createContentHashNavigationRequest(hash: string): ContentHashNavigationRequest {
  contentHashNavigationRequestCounter += 1;
  return {
    hash,
    requestId: `content-hash-${contentHashNavigationRequestCounter}`,
  };
}

export function setPendingContentHashNavigation(request: ContentHashNavigationRequest | null) {
  pendingContentHashNavigation = request;
}

export function hasPendingContentHashNavigation(hash: string) {
  return pendingContentHashNavigation?.hash === hash;
}

export function clearPendingContentHashNavigation() {
  pendingContentHashNavigation = null;
}
