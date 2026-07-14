import handler from '@/features/assets/server/handlers/collectionHandler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  return handler(request, slug);
}
