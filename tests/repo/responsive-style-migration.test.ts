import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const readStyle = (relativePath: string) => readFile(path.join(process.cwd(), relativePath), 'utf8');

describe('responsive style migration', () => {
  it('keeps the Experience timeline mobile overrides with its feature', async () => {
    const source = await readStyle('src/features/experience/styles/sections/_experience.scss');

    expect(source).toMatch(/@media \(max-width: 1023px\)[\s\S]*\.experienceTimeline::before[\s\S]*left: 8px/);
    expect(source).toMatch(/@media \(max-width: 767px\)[\s\S]*\.timelineItem[\s\S]*width: 100% !important/);
  });

  it('keeps Contact mobile flow overrides with the profile feature', async () => {
    const source = await readStyle('src/features/profile/styles/sections/_contact.scss');

    expect(source).toMatch(/@media \(max-width: 1023px\)[\s\S]*\.logItem[\s\S]*position: relative/);
    expect(source).toMatch(/@media \(max-width: 767px\)[\s\S]*\.radarDisplay[\s\S]*width: 160px/);
  });

  it('keeps About mobile panel and decorative-image overrides with the profile feature', async () => {
    const source = await readStyle('src/features/profile/styles/sections/_about.scss');

    expect(source).toMatch(/@media \(max-width: 1023px\)[\s\S]*\.aboutNewImageWrapper[\s\S]*position: relative/);
    expect(source).toMatch(/@media \(max-width: 767px\)[\s\S]*\.contentSection\.aboutSection[\s\S]*padding: 20px 16px 80px/);
  });
});
