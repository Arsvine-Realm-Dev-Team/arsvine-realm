import type { NextApiRequest, NextApiResponse } from 'next';
import { getWorksAssets } from '../catalog/catalog-provider';

function parsePage(page: string | string[] | undefined) {
  const value = Array.isArray(page) ? page[0] : page;
  const parsed = Number.parseInt(value || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function parseOptionalValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = parsePage(req.query.page);
    const collection = parseOptionalValue(req.query.collection);
    const tag = parseOptionalValue(req.query.tag);
    const result = await getWorksAssets({ page, collection, tag });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(result);
  } catch (error) {
    console.error('[api/assets/works] failed:', error);
    return res.status(200).json({
      items: [],
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 1,
    });
  }
}
