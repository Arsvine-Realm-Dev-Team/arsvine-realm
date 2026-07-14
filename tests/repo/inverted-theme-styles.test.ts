import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const readSource = (relativePath: string) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('inverted theme style contracts', () => {
  it('keeps the left logo readable without filtering its chromatic layers', () => {
    const logoStyles = readSource('src/app/styles/layout/_left-panel-core.scss');
    const invertedStyles = readSource('src/app/styles/layout/_inverted.scss');

    expect(logoStyles).toMatch(
      /\.logoBase\s*\{[\s\S]*background-color:\s*var\(--logo-base-color\)[\s\S]*mask:\s*url\('\/avatar_transparent\.webp'\)/,
    );
    expect(logoStyles).not.toContain('filter:');
    expect(invertedStyles).toMatch(/--logo-base-opacity:\s*0\.8/);
    expect(invertedStyles).toMatch(/--logo-base-color:\s*#444444/);
  });

  it('uses a light themed About panel with dark inverted-theme content', () => {
    const aboutStyles = readSource('src/features/profile/styles/sections/_about.scss');
    const aboutThemeStyles = readSource(
      'src/features/profile/styles/sections/_about-contact-theme.scss',
    );

    expect(aboutStyles).toMatch(/background-color:\s*var\(--about-panel-background\)/);
    expect(aboutStyles).toMatch(
      /html\[data-theme-mode='inverted'\][\s\S]*--about-panel-background:\s*rgba\(225, 225, 225, 0\.88\)/,
    );
    expect(aboutStyles).toMatch(
      /html\[data-theme-mode='inverted'\][\s\S]*filter:\s*grayscale\(100%\)/,
    );
    expect(aboutThemeStyles).toMatch(
      /html\[data-theme-mode='inverted'\][\s\S]*\.aboutNewImageNormal[\s\S]*opacity:\s*0/,
    );
    expect(aboutThemeStyles).toMatch(
      /html\[data-theme-mode='inverted'\][\s\S]*\.aboutNewImageInverted[\s\S]*opacity:\s*1/,
    );
  });
});
