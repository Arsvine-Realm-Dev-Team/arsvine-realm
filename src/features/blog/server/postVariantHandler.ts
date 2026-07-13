import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'next-mdx-remote/serialize';
import { getBlogPostEntry, getPostBySlugAndContentLocale, isBlogContentLocale, type BlogContentLocale } from './blog';
import { hasValidAccessGrant } from '@/shared/lib/content/access-grant';
import type { AccessApiError } from '@/shared/lib/content/access-api';
import type { BlogVariantPayload } from '../model/blogClient';

type ResponseBody =
  | ({ ok: true } & BlogVariantPayload)
  | { ok: false; error: AccessApiError };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ResponseBody>) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Cookie');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  }

  const localeParam = typeof req.query.locale === 'string' ? req.query.locale : '';
  const slugParam = typeof req.query.slug === 'string' ? req.query.slug : '';
  if (!localeParam || !slugParam) {
    return res.status(400).json({ ok: false, error: { code: 'VALIDATION_FAILED', message: 'Missing locale or slug.' } });
  }

  if (!isBlogContentLocale(localeParam)) {
    return res.status(400).json({ ok: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid locale.' } });
  }

  let entry: Awaited<ReturnType<typeof getBlogPostEntry>>;
  try {
    entry = await getBlogPostEntry(slugParam);
  } catch (error) {
    // 上游 GitHub 5xx / 超时 / 网络错误 → 502，让前端知道是临时问题（可重试）
    console.error('[post-variant] getBlogPostEntry failed:', error);
    return res.status(502).json({
      ok: false,
      error: { code: 'UPSTREAM_FAILED', message: 'Content repository unreachable.' },
    });
  }
  if (!entry) {
    return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Post not found.' } });
  }

  if (entry.access.mode === 'totp') {
    const group = entry.access.group?.trim();
    if (!group) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Access group not found.' } });
    }

    if (!hasValidAccessGrant(req, group)) {
      return res.status(403).json({ ok: false, error: { code: 'FORBIDDEN', message: 'Access grant required.' } });
    }
  }

  try {
    const variant = await getPostBySlugAndContentLocale(slugParam, localeParam as BlogContentLocale);
    const mdxSource = await serialize(variant.content);

    return res.status(200).json({
      ok: true,
      meta: variant.meta,
      mdxSource,
    });
  } catch (error) {
    // 区分"文章不存在"与"MDX 序列化失败" / "上游错误"。
    // 文章找不到（GitHub 404）走 404 + NOT_FOUND；其他（MDX 编译、序列化、5xx）走 500。
    const message = error instanceof Error ? error.message : '';
    if (message.includes('not found') || message.includes('404')) {
      return res.status(404).json({ ok: false, error: { code: 'NOT_FOUND', message: 'Post variant not found.' } });
    }
    console.error('[post-variant] variant fetch / serialize failed:', error);
    return res.status(500).json({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to render post variant.' },
    });
  }
}
