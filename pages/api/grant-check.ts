import type { NextApiRequest, NextApiResponse } from 'next';
import { hasValidAccessGrant } from '../../lib/content/access-grant';

type ResponseBody = { ok: true; granted: boolean } | { ok: false; error: string };

export default function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const group = typeof req.query.group === 'string' ? req.query.group.trim() : '';
  if (!group) {
    return res.status(422).json({ ok: false, error: 'Missing group parameter' });
  }

  const granted = hasValidAccessGrant(req, group);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ ok: true, granted });
}
