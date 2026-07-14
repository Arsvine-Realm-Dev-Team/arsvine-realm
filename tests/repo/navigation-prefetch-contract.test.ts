import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

async function readSource(relativePath: string) {
  return readFile(path.join(process.cwd(), relativePath), 'utf8');
}

describe('navigation preload contract', () => {
  it('consumes not-found CSS from the stable root layout', async () => {
    const rootLayout = await readSource('src/app/layout.tsx');

    expect(rootLayout).toContain("import '@/features/navigation/styles/NotFoundPage.module.scss';");
  });

  it('does not bulk-prefetch routes when Home or ContentPage mounts', async () => {
    const [home, content] = await Promise.all([
      readSource('src/features/hud/ui/HomePage.tsx'),
      readSource('src/features/navigation/ui/ContentPage.tsx'),
    ]);

    expect(home).not.toContain('useEffect');
    expect(content).not.toContain('immediateUrls');
    expect(content).not.toContain('idleUrls');
    expect(content).not.toContain('scheduleIdle');
  });

  it('disables automatic prefetch on links managed by custom transitions', async () => {
    const [detailFooter, blogDetail] = await Promise.all([
      readSource('src/shared/ui/detail/DetailFooterNav.tsx'),
      readSource('src/features/blog/ui/blog/BlogDetailScaffold.tsx'),
    ]);

    expect(detailFooter.match(/<Link/g)).toHaveLength(2);
    expect(detailFooter.match(/prefetch=\{false\}/g)).toHaveLength(2);
    expect(blogDetail.match(/<Link/g)).toHaveLength(4);
    expect(blogDetail.match(/prefetch=\{false\}/g)).toHaveLength(4);
  });
});
