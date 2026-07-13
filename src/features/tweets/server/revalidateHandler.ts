import type { NextApiRequest, NextApiResponse } from 'next';
import { locales } from '@/shared/contracts/locale';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';

type RevalidateResponse =
  | {
      revalidated: true;
      paths: string[];
    }
  | {
      message: string;
    };

function isProxyTrusted() {
  const value = process.env.TRUST_PROXY?.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

function getClientKey(req: NextApiRequest): string {
  if (isProxyTrusted()) {
    const forwarded = req.headers['x-forwarded-for'];
    const first =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
          ? forwarded[0]?.split(',')[0]?.trim()
          : '';
    if (first) return first;
  }
  return req.socket.remoteAddress ?? 'unknown';
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function readSecret(req: NextApiRequest): string {
  // Prefer the POST body (so the secret stays out of access logs); fall back
  // to the legacy querystring form for backwards compatibility with older
  // admin clients.
  if (req.method === 'POST' && typeof req.body?.secret === 'string') {
    return req.body.secret;
  }
  if (typeof req.query.secret === 'string') return req.query.secret;
  return '';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevalidateResponse>,
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const limiter = await enforceRateLimit(
    `revalidate-tweets:${getClientKey(req)}`,
    30,
    60_000,
  );
  if (!limiter.ok) {
    res.setHeader('Retry-After', String(Math.ceil(limiter.retryAfterMs / 1000)));
    return res.status(429).json({ message: 'Too many requests' });
  }

  const expected = process.env.REVALIDATE_SECRET?.trim();
  const provided = readSecret(req);
  if (!expected || !provided || !constantTimeEqual(provided, expected)) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const paths = locales.map((locale) => `/${locale}/tweets`);

    for (const path of paths) {
      await res.revalidate(path);
    }

    return res.status(200).json({
      revalidated: true,
      paths,
    });
  } catch (error) {
    console.error('[api/revalidate] tweets revalidate failed:', error);
    return res.status(500).json({ message: 'Revalidate failed' });
  }
}
