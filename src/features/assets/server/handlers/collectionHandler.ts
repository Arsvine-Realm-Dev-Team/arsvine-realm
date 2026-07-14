import { getCollectionAssets } from '../catalog/catalog-provider';
import { jsonResponse } from '@/shared/server/http';
import { withAssetCatalogHandler } from '../catalog/catalog-handler';

function parsePage(page: string | null) {
  const parsed = Number.parseInt(page || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function handler(request: Request, slug: string) {
  if (!slug) {
    return jsonResponse({ error: 'missing_slug' }, { status: 400 });
  }

  return withAssetCatalogHandler('collections', async () => {
    const page = parsePage(new URL(request.url).searchParams.get('page'));
    const result = await getCollectionAssets(slug, page);
    return jsonResponse({ slug, ...result }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
