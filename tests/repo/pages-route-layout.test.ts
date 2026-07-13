import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const DISALLOWED_ROUTE_TEST_RE = /\.(?:test|spec)\.(?:ts|tsx|js|jsx)$/i;

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      walk(fullPath, files);
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

describe('pages route layout', () => {
  it('does not allow test files inside pages/', () => {
    const pagesDir = path.join(process.cwd(), 'src', 'pages');
    const offenders = walk(pagesDir)
      .map((file) => path.relative(process.cwd(), file).replaceAll('\\', '/'))
      .filter((file) => DISALLOWED_ROUTE_TEST_RE.test(file));

    expect(
      offenders,
      `Test files cannot live under src/pages/: ${offenders.join(', ') || 'none'}`,
    ).toEqual([]);
  });

  it('keeps canonical routes and removes retired aliases', () => {
    const pagesDir = path.join(process.cwd(), 'src', 'pages');
    const canonicalRoutes = [
      '[locale]/index.tsx',
      '[locale]/content.tsx',
      '[locale]/blog/[slug].tsx',
      '[locale]/life/[slug].tsx',
      '[locale]/web/[id].tsx',
      '[locale]/access/[group].tsx',
    ];
    const retiredAliases = [
      '[locale]/blog.tsx',
      '[locale]/license.tsx',
      '[locale]/posts.tsx',
      '[locale]/posts/[slug].tsx',
      '[locale]/game.tsx',
    ];

    for (const route of canonicalRoutes) {
      expect(existsSync(path.join(pagesDir, route)), `Missing canonical route: ${route}`).toBe(true);
    }

    for (const route of retiredAliases) {
      expect(existsSync(path.join(pagesDir, route)), `Retired route must stay deleted: ${route}`).toBe(false);
    }
  });
});
