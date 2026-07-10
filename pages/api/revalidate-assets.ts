import type { NextApiRequest, NextApiResponse } from 'next';
import { locales } from '../../i18n/config';
import { webProjects, gameProjects, earlyProjects } from '../../data/projects';
import { gameData, travelData, otherData } from '../../data/life';

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
  const failed = [];
  for (const route of paths) {
    try { await res.revalidate(route); } catch { failed.push(route); }
  }
  return res.status(failed.length ? 500 : 200).json({ revalidated: failed.length === 0, paths, failed });
}
