import handler from '@/features/blog/server/postVariantHandler';
import { runLegacyApiHandler } from '@/shared/server/route-handler-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => runLegacyApiHandler(handler, request);
