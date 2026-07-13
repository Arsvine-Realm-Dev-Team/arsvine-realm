import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getObject = vi.hoisted(() => vi.fn());

vi.mock('cos-nodejs-sdk-v5', () => ({
  default: class MockCosClient {
    getObject = getObject;
  },
}));

import { getAudioAssets } from '@/features/assets/server/catalog/catalog-provider';

describe('catalog provider remote validation fallback', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const previousEnv = {
    bucket: process.env.COS_PRIVATE_BUCKET,
    region: process.env.COS_PRIVATE_REGION,
    secretId: process.env.COS_SECRET_ID,
    secretKey: process.env.COS_SECRET_KEY,
    prefix: process.env.COS_PRIVATE_CATALOG_PREFIX,
    localRoot: process.env.COS_PRIVATE_LOCAL_ROOT,
  };

  beforeEach(() => {
    process.env.COS_PRIVATE_BUCKET = 'bucket';
    process.env.COS_PRIVATE_REGION = 'region';
    process.env.COS_SECRET_ID = 'id';
    process.env.COS_SECRET_KEY = 'key';
    process.env.COS_PRIVATE_CATALOG_PREFIX = '';
    process.env.COS_PRIVATE_LOCAL_ROOT = 'tests/fixtures/private-root';
    getObject.mockImplementation(async ({ Key }: { Key: string }) => ({
      Body: Key.endsWith('/current.json')
        ? JSON.stringify({ version: 'remote-version' })
        : JSON.stringify([{ id: 'invalid-remote-without-object-key' }]),
    }));
  });

  afterEach(() => {
    getObject.mockReset();
    warn.mockClear();
    const restore = (name: string, value: string | undefined) => {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    };
    restore('COS_PRIVATE_BUCKET', previousEnv.bucket);
    restore('COS_PRIVATE_REGION', previousEnv.region);
    restore('COS_SECRET_ID', previousEnv.secretId);
    restore('COS_SECRET_KEY', previousEnv.secretKey);
    restore('COS_PRIVATE_CATALOG_PREFIX', previousEnv.prefix);
    restore('COS_PRIVATE_LOCAL_ROOT', previousEnv.localRoot);
  });

  it('warns and uses the validated local artifact when a remote section is invalid', async () => {
    const audio = await getAudioAssets();

    expect(audio.map((item) => item.id)).toEqual(['track-one', 'track-two']);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('remote audio is invalid; using local fallback'),
      expect.stringContaining('missing objectKey'),
    );
  });
});
