import type { NextApiRequest, NextApiResponse } from 'next';
import { locales } from '@/shared/contracts/locale';
import { webProjects, gameProjects, earlyProjects } from '@/features/portfolio/contracts/data';
import { gameData, travelData, otherData } from '@/features/life/contracts/data';

function equal(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ message: 'Method not allowed' }); }
  const expected = process.env.REVALIDATE_SECRET?.trim() || '';
  const provided = typeof req.body?.secret === 'string' ? req.body.secret : '';
  if (!expected || !provided || !equal(provided, expected)) return res.status(401).json({ message: 'Invalid token' });

  const projects = [...webProjects, ...gameProjects, ...earlyProjects];
  const lifeItems = [...gameData, ...travelData, ...otherData];
  const paths = locales.flatMap((locale) => [
    `/${locale}`, `/${locale}/content`, `/${locale}/friends`,
    ...projects.map((project) => `/${locale}/web/${project.id}`),
    ...lifeItems.map((item) => `/${locale}/life/${item.id}`),
  ]);
  const results = await Promise.allSettled(paths.map((route) => res.revalidate(route)));
  const failed: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      const route = paths[index];
      failed.push(route);
      console.error('[api/revalidate-assets] failed for', route, result.reason);
    }
  });

  if (failed.length === paths.length) {
    return res.status(500).json({ revalidated: false, paths, failed, message: 'All revalidations failed' });
  }
  if (failed.length > 0) {
    return res.status(200).json({ revalidated: false, paths, failed, partial: true });
  }
  return res.status(200).json({ revalidated: true, paths, failed: [] });
}
