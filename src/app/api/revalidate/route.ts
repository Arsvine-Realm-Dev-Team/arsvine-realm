import handler from '@/features/tweets/server/revalidateHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler;
export const POST = handler;
