import { describe, expect, it } from 'vitest';

import {
  buildLocaleRedirectPath,
  localeAwareRedirect,
  makeLocaleRedirectGSSP,
} from './redirect-helpers';

describe('localeAwareRedirect', () => {
  it('uses the locale from params when it is supported', () => {
    const result = localeAwareRedirect(
      { locale: 'zh-TW' },
      { destination: (l) => `/${l}/copyright`, permanent: true },
    );
    expect(result).toEqual({ redirect: { destination: '/zh-TW/copyright', permanent: true } });
  });

  it('falls back to defaultLocale for an unsupported locale', () => {
    const result = localeAwareRedirect(
      { locale: 'fr' },
      { destination: (l) => `/${l}/content#blog`, permanent: false },
    );
    expect(result).toEqual({ redirect: { destination: '/zh-CN/content#blog', permanent: false } });
  });

  it('falls back to defaultLocale for a missing locale param', () => {
    const result = localeAwareRedirect(
      undefined,
      { destination: (l) => `/${l}/content#blog`, permanent: false },
    );
    expect(result).toEqual({ redirect: { destination: '/zh-CN/content#blog', permanent: false } });
  });

  it('falls back to defaultLocale when locale is an array (defensive)', () => {
    const result = localeAwareRedirect(
      { locale: ['en', 'zh-CN'] },
      { destination: (l) => `/${l}/copyright`, permanent: true },
    );
    expect(result.redirect.destination).toBe('/zh-CN/copyright');
  });
});

describe('buildLocaleRedirectPath', () => {
  it('returns the path for the locale-aware destination', () => {
    expect(
      buildLocaleRedirectPath({ locale: 'en' }, (l) => `/${l}/content#blog`),
    ).toBe('/en/content#blog');
  });

  it('falls back to default locale', () => {
    expect(buildLocaleRedirectPath(undefined, (l) => `/${l}/content#blog`)).toBe(
      '/zh-CN/content#blog',
    );
  });
});

describe('makeLocaleRedirectGSSP', () => {
  it('returns a GetServerSideProps handler that resolves locale then redirects', async () => {
    const handler = makeLocaleRedirectGSSP({
      destination: (l) => `/${l}/copyright`,
      permanent: true,
    });
    const result = await handler({ params: { locale: 'en' } } as never);
    expect(result).toEqual({ redirect: { destination: '/en/copyright', permanent: true } });
  });
});
