import type { GetServerSideProps } from 'next';
import { getAllPosts } from '../lib/blog';
import { getSiteUrl } from '../data/site';
import { webProjects } from '../data/projects';
import { gameData, travelData, otherData } from '../data/life';

const SITE_URL = getSiteUrl();

const staticPages = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/content', priority: '0.8', changefreq: 'weekly' },
  { path: '/friends', priority: '0.5', changefreq: 'monthly' },
  { path: '/copyright', priority: '0.3', changefreq: 'yearly' },
];

function generateSitemap(posts: ReturnType<typeof getAllPosts>): string {
  const staticEntries = staticPages
    .map(
      (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    )
    .join('\n');

  const blogEntries = posts
    .map(
      (post) => `  <url>
    <loc>${SITE_URL}/blog/${post.slug}</loc>
    <lastmod>${new Date(post.date).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n');

  const webEntries = webProjects
    .map(
      (project) => `  <url>
    <loc>${SITE_URL}/web/${project.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join('\n');

  const lifeEntries = [...gameData, ...travelData, ...otherData]
    .map(
      (item) => `  <url>
    <loc>${SITE_URL}/life/${item.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticEntries}
${blogEntries}
${webEntries}
${lifeEntries}
</urlset>`;
}

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const posts = getAllPosts();
  const xml = generateSitemap(posts);

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  res.write(xml);
  res.end();

  return { props: {} };
};

export default function SitemapPage() {
  return null;
}
