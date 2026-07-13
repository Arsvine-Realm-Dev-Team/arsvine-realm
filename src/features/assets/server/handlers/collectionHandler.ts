import type { NextApiRequest, NextApiResponse } from 'next';
import { getCollectionAssets } from '../catalog/catalog-provider';

function parsePage(page: string | string[] | undefined) {
  const value = Array.isArray(page) ? page[0] : page;
  const parsed = Number.parseInt(value || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const slug = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  if (!slug) {
    return res.status(400).json({ error: 'missing_slug' });
  }

  try {
    const page = parsePage(req.query.page);
    const result = await getCollectionAssets(slug, page);
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({ slug, ...result });
  } catch (error) {
    console.error('[api/assets/collections] failed:', error);
    return res.status(200).json({
      slug,
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 1,
    });
  }
}
