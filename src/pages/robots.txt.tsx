import type { GetServerSideProps } from 'next';
import { getSiteUrl } from '@/shared/config/site';

/**
 * /robots.txt 改为 SSR 路由，运行时根据 siteConfig.url（或 NEXT_PUBLIC_SITE_URL）
 * 动态拼出 Sitemap 行。修改 base URL 只需改 data/site.ts，无需手动同步本文件。
 *
 * 注意：Next.js 优先返回 public/ 下的静态文件，因此本路由生效要求
 * public/robots.txt 不存在。
 */

const generateRobots = (baseUrl: string) => `User-agent: *
Allow: /

Sitemap: ${baseUrl}/sitemap.xml
`;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const baseUrl = getSiteUrl().replace(/\/$/, '');
  const robots = generateRobots(baseUrl);

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=43200');
  res.write(robots);
  res.end();

  return { props: {} };
};

export default function RobotsTxt() {
  return null;
}
