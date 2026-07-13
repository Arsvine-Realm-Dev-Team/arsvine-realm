import type { NextApiRequest, NextApiResponse } from 'next';
import { getAudioAssets } from './catalog/catalog-provider';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const items = await getAudioAssets();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  } catch (error) {
    console.error('[api/assets/audio] failed:', error);
    return res.status(200).json({ items: [] });
  }
}
