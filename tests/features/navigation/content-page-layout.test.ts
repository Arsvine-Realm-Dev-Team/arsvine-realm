import { describe, expect, it } from 'vitest';

import styles from '@/features/navigation/styles/ContentPage.module.scss';

describe('ContentPage layout', () => {
  it('exports the content hash anchor class', () => {
    expect(styles.sectionAnchor).toBeTruthy();
  });
});
