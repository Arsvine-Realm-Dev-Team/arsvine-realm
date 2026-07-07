import { describe, expect, it } from 'vitest';
import { defaultLocale, getLocaleFromPath, resolveLocale } from '../../i18n/config';

describe('getLocaleFromPath', () => {
  it('extracts a supported locale from the first path segment', () => {
    expect(getLocaleFromPath('/en/missing-route')).toBe('en');
    expect(getLocaleFromPath('/zh-TW/blog/404?foo=bar')).toBe('zh-TW');
  });

  it('returns undefined for unsupported or missing locale segments', () => {
    expect(getLocaleFromPath('/fr/missing-route')).toBeUndefined();
    expect(getLocaleFromPath('/missing-route')).toBeUndefined();
  });
});

describe('resolveLocale', () => {
  it('prefers an explicit locale param when valid', () => {
    expect(resolveLocale('zh-CN', '/en/missing-route')).toBe('zh-CN');
  });

  it('falls back to the locale encoded in the path', () => {
    expect(resolveLocale(undefined, '/en/missing-route')).toBe('en');
  });

  it('falls back to defaultLocale when neither source is usable', () => {
    expect(resolveLocale(undefined, '/missing-route')).toBe(defaultLocale);
  });
});
