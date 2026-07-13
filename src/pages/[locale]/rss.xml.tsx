import type { GetServerSideProps } from 'next';
import { getLocaleRssServerSideProps } from '../../features/blog/server/localeRss';

export const getServerSideProps: GetServerSideProps = async (context) => getLocaleRssServerSideProps(context);

export default function LocaleRssPage() {
  return null;
}
