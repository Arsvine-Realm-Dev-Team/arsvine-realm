import type { NextApiRequest, NextApiResponse } from 'next';
import { locales } from '@/shared/contracts/locale';
import { enforceRateLimit } from '@/shared/lib/content/rate-limit';

type ResponseBody =
  | { revalidated: true; paths: string[]; skipped?: string[] }
  | { message: string };

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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>,
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Cap how often the revalidate endpoint can fire even with a valid secret —
  // a leaked secret should be replaceable by rotating env, but until that
  // happens it shouldn't enable unbounded cache thrash.
  const limiter = await enforceRateLimit(
    `revalidate-content:${getClientKey(req)}`,
    30,
    60_000,
  );
  if (!limiter.ok) {
    res.setHeader('Retry-After', String(Math.ceil(limiter.retryAfterMs / 1000)));
    return res.status(429).json({ message: 'Too many requests' });
  }

  const expected = process.env.REVALIDATE_SECRET?.trim();
  const provided = typeof req.body?.secret === 'string' ? req.body.secret : '';
  if (!expected || !provided || !constantTimeEqual(provided, expected)) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const slug =
    typeof req.body?.slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.body.slug)
      ? req.body.slug
      : '';
  const contentPaths = locales.map((locale) => `/${locale}/content`);
  const blogPaths = slug ? locales.map((locale) => `/${locale}/blog/${slug}`) : [];

  try {
    for (const path of contentPaths) {
      await res.revalidate(path);
    }

    const skipped: string[] = [];
    for (const path of blogPaths) {
      try {
        await res.revalidate(path);
      } catch {
        skipped.push(path);
      }
    }

    return res.status(200).json({
      revalidated: true,
      paths: [...contentPaths, ...blogPaths.filter((path) => !skipped.includes(path))],
      ...(skipped.length > 0 ? { skipped } : {}),
    });
  } catch (error) {
    // Log details server-side; never echo internal error text back to a
    // possibly-malicious caller.
    console.error('[api/revalidate-content] revalidate failed:', error);
    return res.status(500).json({ message: 'Revalidate failed' });
  }
}
