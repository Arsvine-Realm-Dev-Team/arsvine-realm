import { describe, expect, it } from 'vitest';

import {
  getSafeExternalHref,
  getSafeExternalLinkVariant,
  getSafeExternalUrl,
} from '@/shared/lib/safe-external-href';

describe('safe external href helpers', () => {
  it('accepts http and https urls', () => {
    expect(getSafeExternalHref('https://example.com/path')).toBe('https://example.com/path');
    expect(getSafeExternalHref('http://example.com/path')).toBe('http://example.com/path');
  });

  it('rejects unsafe or non-http protocols', () => {
    expect(getSafeExternalHref('javascript:alert(1)')).toBeNull();
    expect(getSafeExternalHref('data:text/html,boom')).toBeNull();
    expect(getSafeExternalHref('mailto:test@example.com')).toBeNull();
    expect(getSafeExternalHref('blob:https://example.com/id')).toBeNull();
    expect(getSafeExternalHref('//evil.test/path')).toBeNull();
  });

  it('classifies trusted hostnames from the parsed url only', () => {
    const githubUrl = getSafeExternalUrl('https://github.com/test/repo');
    const bilibiliUrl = getSafeExternalUrl('https://www.bilibili.com/video/BV1xx');
    const fakeGithubUrl = getSafeExternalUrl('https://github.com.evil.test/repo');

    expect(githubUrl).not.toBeNull();
    expect(bilibiliUrl).not.toBeNull();
    expect(fakeGithubUrl).not.toBeNull();

    expect(getSafeExternalLinkVariant(githubUrl!)).toBe('github');
    expect(getSafeExternalLinkVariant(bilibiliUrl!)).toBe('bilibili');
    expect(getSafeExternalLinkVariant(fakeGithubUrl!)).toBe('default');
  });
});
