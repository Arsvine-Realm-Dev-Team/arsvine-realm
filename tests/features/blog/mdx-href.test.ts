import { describe, expect, it } from 'vitest';

import { getSafeMdxHref } from '@/features/blog/model/mdxHref';

describe('getSafeMdxHref', () => {
  it('keeps safe absolute and author-relative links', () => {
    expect(getSafeMdxHref('https://example.com/path')).toBe('https://example.com/path');
    expect(getSafeMdxHref('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(getSafeMdxHref('/zh-CN/content#blog')).toBe('/zh-CN/content#blog');
    expect(getSafeMdxHref('../images/cover.webp')).toBe('../images/cover.webp');
    expect(getSafeMdxHref('#section')).toBe('#section');
  });

  it('rejects dangerous protocols and external-looking relative values', () => {
    expect(getSafeMdxHref('javascript:alert(1)')).toBeNull();
    expect(getSafeMdxHref('data:text/html,boom')).toBeNull();
    expect(getSafeMdxHref('//evil.test/path')).toBeNull();
    expect(getSafeMdxHref('\\\\evil.test\\path')).toBeNull();
    expect(getSafeMdxHref('https://example.com/\u0000path')).toBeNull();
  });
});
