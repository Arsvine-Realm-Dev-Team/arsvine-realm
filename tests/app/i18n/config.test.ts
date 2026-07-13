import { describe, expect, it } from 'vitest';
import { defaultLocale, getLocaleFromPath, resolveLocale } from '@/app/i18n/config';
import { loadMessages } from '@/app/i18n/data';

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

describe('message registry', () => {
  it('loads every UI locale through the static registry', async () => {
    await expect(loadMessages('zh-CN')).resolves.toMatchObject({ common: expect.any(Object) });
    await expect(loadMessages('zh-TW')).resolves.toMatchObject({ common: expect.any(Object) });
    await expect(loadMessages('en')).resolves.toMatchObject({ common: expect.any(Object) });
  });
});
