import { afterEach, describe, expect, it, vi } from 'vitest';
import { getSiteAssetManifestUrl } from '@/features/assets/model/SiteAssetsProvider';

const base = 'https://cdn.arsvine.com';
const version = '20260710T163617Z';

function stubOrigin(origin: string) {
  vi.stubGlobal('window', { location: { origin } });
}

describe('getSiteAssetManifestUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the primary site manifest URL stable', () => {
    stubOrigin('https://arsvine.com');

    expect(getSiteAssetManifestUrl(base, version)).toBe(
      `${base}/realm/site-catalog/versions/${version}/assets.json`,
    );
  });

  it('partitions the manifest cache for the beta origin', () => {
    stubOrigin('https://beta.arsvine.com');

    expect(getSiteAssetManifestUrl(base, version)).toBe(
      `${base}/realm/site-catalog/versions/${version}/assets.json?cors-origin=https%3A%2F%2Fbeta.arsvine.com`,
    );
  });

  it('partitions the manifest cache for the local dev origin', () => {
    stubOrigin('http://dev.arsvine.com');

    expect(getSiteAssetManifestUrl(base, version)).toBe(
      `${base}/realm/site-catalog/versions/${version}/assets.json?cors-origin=http%3A%2F%2Fdev.arsvine.com`,
    );
  });
});
