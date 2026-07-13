import { NextResponse } from 'next/server';
import { defaultLocale } from '@/app/i18n/config';

export function GET(request: Request) {
  return NextResponse.redirect(new URL(`/${defaultLocale}/rss.xml`, request.url), 308);
}
