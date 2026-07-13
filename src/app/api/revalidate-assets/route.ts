import handler from '@/features/assets/server/revalidateAssetsHandler';
import { runLegacyApiHandler } from '@/shared/server/route-handler-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => runLegacyApiHandler(handler, request);
