import { isLocale } from '@/app/i18n/config';
import { getLocaleRssServerSideProps } from '@/features/blog/server/localeRss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  const headers = new Headers();
  let body = '';
  let status = 200;
  const response = {
    setHeader(name: string, value: string) { headers.set(name, value); },
    write(value: string) { body += value; },
    end() {},
    set statusCode(value: number) { status = value; },
    get statusCode() { return status; },
  };
  await getLocaleRssServerSideProps({ params: { locale }, res: response } as never);
  return new Response(body, { status, headers });
}
