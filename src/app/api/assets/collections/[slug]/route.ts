import handler from '@/features/assets/server/handlers/collectionHandler';
import { runLegacyApiHandler } from '@/shared/server/route-handler-adapter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const run = (request: Request, context: { params: Promise<{ slug: string }> }) =>
  context.params.then(({ slug }) => runLegacyApiHandler(handler, request, { query: { slug } }));
export const GET = run;
export const POST = run;
export const PUT = run;
export const PATCH = run;
export const DELETE = run;
export const HEAD = run;
export const OPTIONS = run;
