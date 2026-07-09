import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAudioAssets } from '../../../lib/assets/catalog-provider';

const previousEnv = {
  COS_PRIVATE_BUCKET: process.env.COS_PRIVATE_BUCKET,
  COS_PRIVATE_REGION: process.env.COS_PRIVATE_REGION,
  COS_SECRET_ID: process.env.COS_SECRET_ID,
  COS_SECRET_KEY: process.env.COS_SECRET_KEY,
  COS_PRIVATE_CATALOG_PREFIX: process.env.COS_PRIVATE_CATALOG_PREFIX,
  COS_PRIVATE_LOCAL_ROOT: process.env.COS_PRIVATE_LOCAL_ROOT,
};

describe('catalog provider', () => {
  beforeEach(() => {
    process.env.COS_PRIVATE_BUCKET = '';
    process.env.COS_PRIVATE_REGION = '';
    process.env.COS_SECRET_ID = '';
    process.env.COS_SECRET_KEY = '';
    process.env.COS_PRIVATE_CATALOG_PREFIX = '';
    process.env.COS_PRIVATE_LOCAL_ROOT = 'tests/fixtures/private-root';
  });

  afterEach(() => {
    process.env.COS_PRIVATE_BUCKET = previousEnv.COS_PRIVATE_BUCKET;
    process.env.COS_PRIVATE_REGION = previousEnv.COS_PRIVATE_REGION;
    process.env.COS_SECRET_ID = previousEnv.COS_SECRET_ID;
    process.env.COS_SECRET_KEY = previousEnv.COS_SECRET_KEY;
    process.env.COS_PRIVATE_CATALOG_PREFIX = previousEnv.COS_PRIVATE_CATALOG_PREFIX;
    process.env.COS_PRIVATE_LOCAL_ROOT = previousEnv.COS_PRIVATE_LOCAL_ROOT;
  });

  it('returns only published audio records in stable order', async () => {
    const items = await getAudioAssets();

    expect(items).toEqual([
      {
        id: 'track-one',
        title: 'Track One',
        artist: 'Artist One',
        objectKey: 'realm/audio/2026/07/08/track-one.feedbead.m4a',
        order: 1,
        date: '2026-07-09',
        duration: 111,
      },
      {
        id: 'track-two',
        title: 'Track Two',
        artist: 'Artist Two',
        objectKey: 'realm/audio/2026/07/08/track-two.deadbeef.m4a',
        order: 2,
        date: '2026-07-08',
        duration: 222,
      },
    ]);
  });
});
