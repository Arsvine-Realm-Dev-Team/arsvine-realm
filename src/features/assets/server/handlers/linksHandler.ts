import { getLinkAssets } from '../catalog/catalog-provider';
import { jsonResponse } from '@/shared/server/http';
import { withAssetCatalogHandler } from '../catalog/catalog-handler';

export default async function handler() {
  return withAssetCatalogHandler('links', async () => {
    const items = await getLinkAssets();
    return jsonResponse({ items }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
