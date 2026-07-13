import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SectionPageLayout from '@/app/shell/SectionPageLayout';
import styles from '@/app/styles/Shell.module.scss';

describe('SectionPageLayout', () => {
  it('uses the shell scrolling viewport', () => {
    render(
      <SectionPageLayout>
        <p>Scrollable page content</p>
      </SectionPageLayout>,
    );

    const scrollViewport = screen.getByText('Scrollable page content').parentElement;
    expect(styles.contentWrapper).toBeTruthy();
    expect(styles.detailViewWrapper).toBeTruthy();
    expect(styles.entering).toBeTruthy();
    expect(styles.exiting).toBeTruthy();
    expect(scrollViewport?.classList.contains(styles.contentWrapper)).toBe(true);
  });
});
