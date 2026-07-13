import handler from '@/features/tweets/server/revalidateHandler';
import { runLegacyApiHandler } from '@/shared/server/route-handler-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => runLegacyApiHandler(handler, request);
export const POST = (request: Request) => runLegacyApiHandler(handler, request);
