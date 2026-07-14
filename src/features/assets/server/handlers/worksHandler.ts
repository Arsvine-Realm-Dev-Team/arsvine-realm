import { getWorksAssets } from '../catalog/catalog-provider';
import { jsonResponse } from '@/shared/server/http';
import { withAssetCatalogHandler } from '../catalog/catalog-handler';

function parsePage(page: string | null) {
  const parsed = Number.parseInt(page || '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function handler(request: Request) {
  return withAssetCatalogHandler('works', async () => {
    const searchParams = new URL(request.url).searchParams;
    const page = parsePage(searchParams.get('page'));
    const collection = searchParams.get('collection') ?? undefined;
    const tag = searchParams.get('tag') ?? undefined;
    const result = await getWorksAssets({ page, collection, tag });
    return jsonResponse(result, { headers: { 'Cache-Control': 'no-store' } });
  });
}
