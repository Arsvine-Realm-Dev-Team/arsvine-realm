import type { NextApiRequest, NextApiResponse } from 'next';
import { getTweetMonthGroupsPage } from './github';

function parsePositiveInt(rawValue: string | string[] | undefined, fallback: number) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.floor(parsed);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const offset = parsePositiveInt(req.query.offset, 0);
    const limit = parsePositiveInt(req.query.limit, 1);
    const result = await getTweetMonthGroupsPage(offset, limit);
    res.setHeader('Cache-Control', 'private, no-store, must-revalidate');
    return res.status(200).json({
      ...result,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[api/tweets/months] source unavailable:', error);
    return res.status(500).json({
      error: 'tweets_source_unavailable',
    });
  }
}
