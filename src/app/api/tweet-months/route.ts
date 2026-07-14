import handler from '@/features/tweets/server/tweetMonthsHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = handler;
