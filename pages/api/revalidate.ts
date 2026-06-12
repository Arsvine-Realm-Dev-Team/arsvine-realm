import type { NextApiRequest, NextApiResponse } from 'next';
import { locales } from '../../i18n/config';

type RevalidateResponse =
  | {
      revalidated: true;
      paths: string[];
    }
  | {
      message: string;
    };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevalidateResponse>,
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (req.query.secret !== process.env.REVALIDATE_SECRET) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    const paths = locales.map((locale) => `/${locale}/tweets`);

    for (const path of paths) {
      await res.revalidate(path);
    }

    return res.status(200).json({
      revalidated: true,
      paths,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Error revalidating',
    });
  }
}
