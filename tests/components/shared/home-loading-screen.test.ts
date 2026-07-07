import { describe, expect, it } from 'vitest';

import { collectGsapTargets } from '../../../components/shared/HomeLoadingScreen';

describe('collectGsapTargets', () => {
  it('filters null and undefined targets before passing them to GSAP', () => {
    const nodeA = {} as HTMLDivElement;
    const nodeB = {} as HTMLDivElement;

    expect(collectGsapTargets([nodeA, null, undefined, nodeB])).toEqual([nodeA, nodeB]);
  });
});
