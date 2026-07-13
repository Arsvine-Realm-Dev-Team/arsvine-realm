import handler from '@/features/blog/server/revalidateContentHandler';
import { runLegacyApiHandler } from '@/shared/server/route-handler-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => runLegacyApiHandler(handler, request);
