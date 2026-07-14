import { getAudioAssets } from './catalog/catalog-provider';
import { jsonResponse } from '@/shared/server/http';
import { withAssetCatalogHandler } from './catalog/catalog-handler';

export default async function handler() {
  return withAssetCatalogHandler('audio', async () => {
    const items = await getAudioAssets();
    return jsonResponse({ items }, { headers: { 'Cache-Control': 'no-store' } });
  });
}
