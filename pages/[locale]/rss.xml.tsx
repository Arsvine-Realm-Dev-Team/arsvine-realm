import type { GetServerSideProps } from 'next';
import { getAllPostsForLocale } from '../../lib/blog';
import { getSiteUrl } from '../../data/site';
import { locales, rssLanguageMap, isLocale, type Locale } from '../../i18n/config';
import { loadMessages } from '../../lib/i18n-data';

const SITE_URL = getSiteUrl();

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRssXml(
  locale: Locale,
  posts: ReturnType<typeof getAllPostsForLocale>,
  siteTitle: string,
  siteDescription: string,
): string {
  const items = posts
    .map(
      (post) => `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${SITE_URL}/${locale}/blog/${post.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/${locale}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description>${escapeXml(post.excerpt)}</description>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
  xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeXml(siteTitle)}</title>
    <link>${SITE_URL}/${locale}</link>
    <description>${escapeXml(siteDescription)}</description>
    <language>${rssLanguageMap[locale]}</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/${locale}/rss.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res, params }) => {
  const rawLocale = params?.locale as string | undefined;
  if (!isLocale(rawLocale)) {
    res.statusCode = 404;
    res.end();
    return { props: {} };
  }
  const locale = rawLocale;
  const messages = await loadMessages(locale);
  const posts = [...getAllPostsForLocale(locale)].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const siteMessages = (messages.pages as Record<string, { title?: string; rssDescription?: string }>)?.site ?? {};
  const xml = generateRssXml(
    locale,
    posts,
    siteMessages.title ?? 'ARSVINE REALM',
    siteMessages.rssDescription ?? '',
  );

  res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.write(xml);
  res.end();

  return { props: {} };
};

// 静默引用 locales 让 webpack 不 tree-shake
void locales;

export default function LocaleRssPage() {
  return null;
}
