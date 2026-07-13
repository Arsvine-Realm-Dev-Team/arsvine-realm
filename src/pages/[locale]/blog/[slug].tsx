import type { GetStaticPaths, GetStaticProps } from 'next';
import { serialize } from 'next-mdx-remote/serialize';
import BlogPostPage, { type BlogPostPageProps } from '../../../features/blog/ui/blog/BlogPostPage';
import {
  getPostBySlugAndLocale, getPostMetaBySlugAndLocale, getAllPostsForLocale, getProtectedPostPublicMeta,
  getPostSlugs, getAvailablePostContentLocales, getBlogPostEntry, normalizeAccess,
} from '../../../features/blog/server/blog';
import { loadMessages } from '@/app/i18n/data';
import { defaultLocale, locales, type Locale } from '@/app/i18n/config';

export default BlogPostPage;

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: (await getPostSlugs()).flatMap((slug) => locales.map((locale) => ({ params: { locale, slug } }))),
  fallback: 'blocking',
});

export const getStaticProps: GetStaticProps<BlogPostPageProps> = async ({ params }) => {
  const locale = (params?.locale as Locale) || defaultLocale;
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  if (!slug) return { notFound: true };
  try {
    const entry = await getBlogPostEntry(slug);
    if (!entry || (entry.access.mode === 'totp' && !entry.access.group)) return { notFound: true };

    const [metaResult, allPosts, messages, availableContentLocales] = await Promise.all([
      getPostMetaBySlugAndLocale(slug, locale), getAllPostsForLocale(locale), loadMessages(locale), getAvailablePostContentLocales(slug),
    ]);
    const access = normalizeAccess(entry.access);
    if (access.mode !== 'public') {
      return { props: {
        locale, messages, meta: getProtectedPostPublicMeta(metaResult.meta), mdxSource: null, allPosts,
        translationStatus: metaResult.translationStatus, actualLocale: metaResult.actualLocale,
        actualContentLocale: metaResult.actualContentLocale, availableContentLocales, contentVariants: {}, access, isProtected: true,
      }, revalidate: 300 };
    }

    const { meta, content, actualLocale, actualContentLocale, translationStatus } = await getPostBySlugAndLocale(slug, locale);
    return { props: {
      locale, messages, meta, mdxSource: await serialize(content), allPosts, translationStatus, actualLocale,
      actualContentLocale, availableContentLocales, contentVariants: {}, access, isProtected: false,
    }, revalidate: 300 };
  } catch {
    return { notFound: true };
  }
};
