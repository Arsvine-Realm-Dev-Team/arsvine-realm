import { describe, expect, it } from 'vitest';

import {
  buildBlogIndexHref,
  buildBlogPostHref,
  buildBlogVariantRequestKey,
  getRequestedContentLocaleFromPath,
  isSafeBlogSlugSegment,
  isBlogContentLocale,
} from '@/features/blog/model/blogClient';

describe('blog-client helpers', () => {
  it('builds stable blog hrefs with lang query', () => {
    expect(buildBlogPostHref('en', 'init', 'zh-TW')).toBe('/en/blog/init?lang=zh-TW');
  });

  it('falls back to the canonical blog index for unsafe slugs', () => {
    expect(buildBlogIndexHref('zh-CN')).toBe('/zh-CN/content#blog');
    expect(isSafeBlogSlugSegment('init')).toBe(true);
    expect(isSafeBlogSlugSegment('../escape')).toBe(false);
    expect(isSafeBlogSlugSegment('https://evil.test/post')).toBe(false);
    expect(isSafeBlogSlugSegment('post?lang=en')).toBe(false);
    expect(isSafeBlogSlugSegment('%2Fescape')).toBe(false);
    expect(buildBlogPostHref('en', '../escape', 'zh-TW')).toBe('/en/content#blog');
  });

  it('parses requested content locale from path query', () => {
    expect(getRequestedContentLocaleFromPath('/en/blog/init?lang=ja')).toBe('ja');
    expect(getRequestedContentLocaleFromPath('/en/blog/init')).toBeNull();
    expect(getRequestedContentLocaleFromPath('/en/blog/init?lang=invalid')).toBeNull();
  });

  it('validates locales and request key generation', () => {
    expect(isBlogContentLocale('fr')).toBe(true);
    expect(isBlogContentLocale('de')).toBe(false);
    expect(buildBlogVariantRequestKey('init', 'fr', 'granted')).toBe('init:fr:granted');
  });
});
