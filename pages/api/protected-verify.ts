import type { NextApiRequest, NextApiResponse } from 'next';
import { setAccessGrantCookie } from '../../lib/content/access-grant';
import { normalizeNextPath, type ProtectedVerifyResponse } from '../../lib/content/access-api';
import { enforceRateLimit } from '../../lib/content/rate-limit';
import { verifyTotpGroupToken } from '../../lib/content/totp';

function getClientKey(req: NextApiRequest) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : req.socket.remoteAddress ?? 'unknown';
  return ip || 'unknown';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProtectedVerifyResponse>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({
      ok: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
    });
  }

  const group = typeof req.body?.group === 'string' ? req.body.group.trim() : '';
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const next = normalizeNextPath(req.body?.next);

  if (!group || !token) {
    return res.status(400).json({
      ok: false,
      error: { code: 'VALIDATION_FAILED', message: 'Missing group or token.' },
    });
  }

  const limiter = await enforceRateLimit(`totp:${getClientKey(req)}:${group}`, 5, 60_000);
  if (!limiter.ok) {
    res.setHeader('Retry-After', String(Math.ceil(limiter.retryAfterMs / 1000)));
    return res.status(429).json({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
    });
  }

  const result = verifyTotpGroupToken(group, token);
  if (!result.ok) {
    return res.status(result.reason === 'group_not_found' ? 404 : 401).json({
      ok: false,
      error: {
        code: result.reason === 'group_not_found' ? 'GROUP_NOT_FOUND' : 'TOTP_INVALID',
        message:
          result.reason === 'group_not_found'
            ? 'Access group not found.'
            : 'Token is invalid or expired.',
      },
    });
  }

  setAccessGrantCookie(res, group);
  return res.status(200).json({ ok: true, redirectTo: next });
}
