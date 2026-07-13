import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('deployment topology contract', () => {
  it('keeps local/self-hosted scripts on server.js without making Vercel depend on it', async () => {
    const root = process.cwd();
    const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts.dev).toMatch(/node server\.js$/);
    expect(packageJson.scripts.start).toMatch(/node server\.js$/);
    expect(packageJson.scripts.build).toBe('next build');

    const vercelConfig = await readFile(path.join(root, 'vercel.json'), 'utf8').catch(() => '');
    expect(vercelConfig).not.toContain('server.js');
  });
});
