import { describe, expect, it } from 'vitest';

import {
  buildBlogPostHref,
  buildBlogVariantRequestKey,
  getRequestedContentLocaleFromPath,
  isBlogContentLocale,
} from './blog-client';

describe('blog-client helpers', () => {
  it('builds stable blog hrefs with lang query', () => {
    expect(buildBlogPostHref('en', 'init', 'zh-TW')).toBe('/en/blog/init?lang=zh-TW');
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
