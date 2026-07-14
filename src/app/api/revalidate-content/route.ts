import handler from '@/features/blog/server/revalidateContentHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = handler;
