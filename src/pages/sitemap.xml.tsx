import type { GetServerSideProps } from 'next';
import { getPublicPostsForLocale } from '../features/blog/server/blog';
import { getSiteUrl } from '@/shared/config/site';
import { loadProjects, loadLife } from '@/app/i18n/data';
import { locales, defaultLocale } from '@/app/i18n/config';

const SITE_URL = getSiteUrl();

const staticPaths = ['/', '/content', '/friends', '/tweets', '/copyright'];

function buildAlternates(path: string): string {
  return locales
    .map(
      (loc) =>
        `    <xhtml:link rel="alternate" hreflang="${loc === 'zh-CN' ? 'zh-Hans' : loc === 'zh-TW' ? 'zh-Hant' : 'en'}" href="${SITE_URL}/${loc}${path === '/' ? '' : path}"/>`,
    )
    .concat([
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}/${defaultLocale}${path === '/' ? '' : path}"/>`,
    ])
    .join('\n');
}

function urlEntry(loc: string, path: string, priority: string, changefreq: string, lastmod?: string): string {
  const fullPath = path === '/' ? '' : path;
  return `  <url>
    <loc>${SITE_URL}/${loc}${fullPath}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
${buildAlternates(path)}
  </url>`;
}

async function generateSitemap(): Promise<string> {
  const entries: string[] = [];

  // 静态路径 × 三 locale
  for (const path of staticPaths) {
    for (const loc of locales) {
      const priority =
        path === '/'
          ? '1.0'
          : path === '/content'
            ? '0.8'
            : path === '/tweets'
              ? '0.7'
              : path === '/friends'
                ? '0.5'
                : '0.3';
      const changefreq =
        path === '/' || path === '/content'
          ? 'weekly'
          : path === '/tweets' || path === '/friends'
            ? 'monthly'
            : 'yearly';
      entries.push(urlEntry(loc, path, priority, changefreq));
    }
  }

  // 博客文章
  for (const loc of locales) {
    const posts = await getPublicPostsForLocale(loc);
    for (const post of posts) {
      const lastmod = (post.updated || post.date)
        ? new Date(post.updated || post.date).toISOString().split('T')[0]
        : undefined;
      entries.push(urlEntry(loc, `/blog/${post.slug}`, '0.7', 'monthly', lastmod));
    }
  }

  // Web 项目详情
  for (const loc of locales) {
    const projects = loadProjects(loc);
    for (const project of projects.webProjects) {
      entries.push(urlEntry(loc, `/web/${project.id}`, '0.6', 'monthly'));
    }
  }

  // Life 项目详情
  for (const loc of locales) {
    const life = loadLife(loc);
    for (const item of [...life.gameData, ...life.travelData, ...life.otherData]) {
      entries.push(urlEntry(loc, `/life/${item.id}`, '0.6', 'monthly'));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const xml = await generateSitemap();

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapPage() {
  return null;
}
