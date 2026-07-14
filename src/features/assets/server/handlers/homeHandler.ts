import { getHomeAssets } from '../catalog/catalog-provider';
import { jsonResponse } from '@/shared/server/http';
import { withAssetCatalogHandler } from '../catalog/catalog-handler';

export default async function handler() {
  return withAssetCatalogHandler('home', async () => {
    const items = await getHomeAssets();
    return jsonResponse({ items }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
