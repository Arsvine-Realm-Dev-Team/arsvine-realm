import type { NextApiRequest, NextApiResponse } from 'next';
import { hasValidAccessGrant } from '@/shared/lib/content/access-grant';
import type { GrantCheckResponse } from '@/shared/lib/content/access-api';

export default function handler(req: NextApiRequest, res: NextApiResponse<GrantCheckResponse>) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
    });
  }

  const group = typeof req.query.group === 'string' ? req.query.group.trim() : '';
  if (!group) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'Missing group parameter.' },
    });
  }

  const granted = hasValidAccessGrant(req, group);
  return res.status(200).json({ ok: true, granted });
}
