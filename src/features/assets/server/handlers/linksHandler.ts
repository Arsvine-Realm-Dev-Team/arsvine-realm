import type { NextApiRequest, NextApiResponse } from 'next';
import { getLinkAssets } from '../catalog/catalog-provider';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const items = await getLinkAssets();
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ items });
  } catch (error) {
    console.error('[api/assets/links] failed:', error);
    return res.status(200).json({ items: [] });
  }
}
