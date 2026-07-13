import type { NextPageContext } from 'next';
import NextErrorComponent from 'next/error';
import type { ErrorProps } from 'next/error';
import NotFoundView from '../features/navigation/ui/NotFoundView';
import { loadMessages } from '@/app/i18n/data';
import { resolveLocale, type Locale } from '@/app/i18n/config';

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
  const normalizedStatusCode =
    typeof errorProps.statusCode === 'number' && errorProps.statusCode >= 400
      ? errorProps.statusCode
      : context.err
        ? typeof context.err.statusCode === 'number'
          ? context.err.statusCode
          : 500
        : 404;

  return {
    ...errorProps,
    statusCode: normalizedStatusCode,
    locale,
    messages,
  };
};
