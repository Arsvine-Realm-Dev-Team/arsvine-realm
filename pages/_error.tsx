import type { NextPageContext } from 'next';
import NextErrorComponent from 'next/error';
import type { ErrorProps } from 'next/error';
import NotFoundView from '../components/shared/NotFoundView';
import { loadMessages } from '../lib/i18n-data';
import { resolveLocale, type Locale } from '../i18n/config';

interface AppErrorPageProps extends ErrorProps {
  locale: Locale;
  messages: Record<string, unknown>;
}

export default function AppErrorPage({ statusCode }: AppErrorPageProps) {
  if (statusCode !== 404) {
    return <NextErrorComponent statusCode={statusCode} />;
  }

  return <NotFoundView />;
}

AppErrorPage.getInitialProps = async (context: NextPageContext): Promise<AppErrorPageProps> => {
  const errorProps = await NextErrorComponent.getInitialProps(context);
  const requestPath =
    typeof context.asPath === 'string' && context.asPath.length > 0
      ? context.asPath
      : context.req?.url;
  const locale = resolveLocale(context.query?.locale, requestPath);
  const messages = await loadMessages(locale);

  return {
    ...errorProps,
    locale,
    messages,
  };
};
