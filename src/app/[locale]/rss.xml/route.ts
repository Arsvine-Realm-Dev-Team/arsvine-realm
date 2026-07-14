import { isLocale } from '@/app/i18n/config';
import { buildLocaleRssResponse } from '@/features/blog/server/localeRss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return new Response(null, { status: 404 });
  return buildLocaleRssResponse(locale);
}
