import { describe, expect, it } from 'vitest';

import {
  classifyRoutePathname,
  createContentHashNavigationRequest,
  getContentSectionHashFromUrl,
  resolveContentHashTransitionMode,
} from '../../lib/content-hash-navigation';

describe('getContentSectionHashFromUrl', () => {
  it('extracts section hash from content URLs', () => {
    expect(getContentSectionHashFromUrl('/en/content#life')).toBe('life');
    expect(getContentSectionHashFromUrl('/zh-CN/content?foo=bar#about')).toBe('about');
  });

  it('ignores non-content or hashless URLs', () => {
    expect(getContentSectionHashFromUrl('/en/friends')).toBeNull();
    expect(getContentSectionHashFromUrl('/en/content')).toBeNull();
    expect(getContentSectionHashFromUrl('/en/blog/init')).toBeNull();
  });
});

describe('classifyRoutePathname', () => {
  it('classifies home, content, standalone, and auxiliary templates', () => {
    expect(classifyRoutePathname('/[locale]')).toBe('home');
    expect(classifyRoutePathname('/[locale]/content')).toBe('content');
    expect(classifyRoutePathname('/[locale]/life/[slug]')).toBe('standalone');
    expect(classifyRoutePathname('/[locale]/friends')).toBe('auxiliary');
  });
});

describe('resolveContentHashTransitionMode', () => {
  it('treats home to content hash as cross-page', () => {
    expect(resolveContentHashTransitionMode('/[locale]', '/en/content#life')).toBe('cross-page');
  });

  it('treats auxiliary pages to content hash as cross-page', () => {
    expect(resolveContentHashTransitionMode('/[locale]/friends', '/en/content#about')).toBe('cross-page');
    expect(resolveContentHashTransitionMode('/[locale]/friends', '/en/content#blog')).toBe('cross-page');
  });

  it('treats content to content hash as same-page', () => {
    expect(resolveContentHashTransitionMode('/[locale]/content', '/en/content#life')).toBe('same-page');
  });

  it('ignores non-content-hash targets', () => {
    expect(resolveContentHashTransitionMode('/[locale]/friends', '/en/blog/init')).toBe('not-content-hash');
  });
});

describe('createContentHashNavigationRequest', () => {
  it('creates a stable request payload with hash and request id', () => {
    const request = createContentHashNavigationRequest('life');
    expect(request.hash).toBe('life');
    expect(request.requestId).toMatch(/^content-hash-\d+$/);
  });
});
