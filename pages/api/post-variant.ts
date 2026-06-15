import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'next-mdx-remote/serialize';
import { getBlogPostEntry, getPostBySlugAndContentLocale, type BlogContentLocale } from '../../lib/blog';
import { hasValidAccessGrant } from '../../lib/content/access-grant';

const VALID_LOCALES = ['zh-CN', 'zh-TW', 'en', 'ja', 'ru', 'fr'] as const;

type ResponseBody =
  | { meta: Awaited<ReturnType<typeof getPostBySlugAndContentLocale>>['meta']; mdxSource: Awaited<ReturnType<typeof serialize>> }
  | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const localeParam = typeof req.query.locale === 'string' ? req.query.locale : '';
  const slugParam = typeof req.query.slug === 'string' ? req.query.slug : '';
  if (!localeParam || !slugParam) {
    return res.status(400).json({ error: 'missing_locale_or_slug' });
  }

  if (!(VALID_LOCALES as readonly string[]).includes(localeParam)) {
    return res.status(400).json({ error: 'invalid_locale' });
  }

  try {
    const entry = await getBlogPostEntry(slugParam);
    if (!entry) {
      return res.status(404).json({ error: 'not_found' });
    }

    if (entry.access.mode === 'totp') {
      const group = entry.access.group?.trim();
      if (!group) {
        return res.status(404).json({ error: 'not_found' });
      }

      if (!hasValidAccessGrant(req, group)) {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(403).json({ error: 'forbidden' });
      }
    }

    const variant = await getPostBySlugAndContentLocale(slugParam, localeParam as BlogContentLocale);
    const mdxSource = await serialize(variant.content);

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      meta: variant.meta,
      mdxSource,
    });
  } catch {
    return res.status(404).json({ error: 'not_found' });
  }
}
