import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'next-mdx-remote/serialize';
import { getBlogPostEntry, getPostBySlugAndContentLocale, isBlogContentLocale, type BlogContentLocale } from '../../lib/blog';
import { hasValidAccessGrant } from '../../lib/content/access-grant';
import type { BlogVariantPayload } from '../../lib/blog-client';

type ResponseBody =
  | ({ ok: true } & BlogVariantPayload)
  | { ok: false; code: 'METHOD_NOT_ALLOWED' | 'VALIDATION_FAILED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INTERNAL_ERROR'; message: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  res.setHeader('Cache-Control', 'private, no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' });
  }

  const localeParam = typeof req.query.locale === 'string' ? req.query.locale : '';
  const slugParam = typeof req.query.slug === 'string' ? req.query.slug : '';
  if (!localeParam || !slugParam) {
    return res.status(400).json({ ok: false, code: 'VALIDATION_FAILED', message: 'Missing locale or slug.' });
  }

  if (!isBlogContentLocale(localeParam)) {
    return res.status(400).json({ ok: false, code: 'VALIDATION_FAILED', message: 'Invalid locale.' });
  }

  try {
    const entry = await getBlogPostEntry(slugParam);
    if (!entry) {
      return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Post not found.' });
    }

    if (entry.access.mode === 'totp') {
      const group = entry.access.group?.trim();
      if (!group) {
        return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Access group not found.' });
      }

      if (!hasValidAccessGrant(req, group)) {
        return res.status(403).json({ ok: false, code: 'FORBIDDEN', message: 'Access grant required.' });
      }
    }

    const variant = await getPostBySlugAndContentLocale(slugParam, localeParam as BlogContentLocale);
    const mdxSource = await serialize(variant.content);

    return res.status(200).json({
      ok: true,
      meta: variant.meta,
      mdxSource,
    });
  } catch {
    return res.status(404).json({ ok: false, code: 'NOT_FOUND', message: 'Post variant not found.' });
  }
}
