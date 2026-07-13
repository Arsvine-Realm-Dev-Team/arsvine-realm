import type { GetServerSideProps } from 'next';
import { defaultLocale } from '@/app/i18n/config';

/**
 * /rss.xml 重定向到默认 locale 的 RSS feed。
 * 每 locale 的 RSS 在 /[locale]/rss.xml.tsx 提供。
 */
export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader('Location', `/${defaultLocale}/rss.xml`);
  res.statusCode = 308;
  res.end();
  return { props: {} };
};

export default function RssRedirect() {
  return null;
}
