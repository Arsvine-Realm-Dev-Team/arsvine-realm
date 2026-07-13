import { describe, expect, it } from 'vitest';

import styles from '@/features/life/styles/LifeSection.module.scss';

describe('LifeSection layout', () => {
  it('exports styles for the secondary games disclosure', () => {
    expect(styles.earlySection).toBeTruthy();
    expect(styles.earlySectionToggle).toBeTruthy();
    expect(styles.earlySectionContent).toBeTruthy();
    expect(styles.smallGameGrid).toBeTruthy();
    expect(styles.smallGameCard).toBeTruthy();
  });
});
