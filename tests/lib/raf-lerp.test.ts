import { describe, expect, it } from 'vitest';

import { clamp, isAtRest, lerp, lowPass } from '../../lib/raf-lerp';

describe('lerp', () => {
  it('returns a when t = 0', () => {
    expect(lerp(0, 10, 0)).toBe(0);
  });
  it('returns b when t = 1', () => {
    expect(lerp(0, 10, 1)).toBe(10);
  });
  it('returns the midpoint for t = 0.5', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
  });
  it('extrapolates past b for t > 1', () => {
    expect(lerp(0, 10, 1.5)).toBe(15);
  });
  it('handles negative direction', () => {
    expect(lerp(10, 0, 0.5)).toBe(5);
  });
});

describe('clamp', () => {
  it('returns the value when in range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('returns the lower bound when below', () => {
    expect(clamp(-1, 0, 10)).toBe(0);
  });
  it('returns the upper bound when above', () => {
    expect(clamp(11, 0, 10)).toBe(10);
  });
  it('returns the bound exactly at boundary', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });
});

describe('lowPass', () => {
  it('returns a*next + (1-a)*prev', () => {
    expect(lowPass(0, 10, 0.5)).toBe(5);
  });
  it('alpha = 1 returns next directly', () => {
    expect(lowPass(99, 10, 1)).toBe(10);
  });
  it('alpha = 0 returns prev unchanged', () => {
    expect(lowPass(99, 10, 0)).toBe(99);
  });
});

describe('isAtRest', () => {
  it('returns true within epsilon', () => {
    expect(isAtRest(1.0, 1.04)).toBe(true);
  });
  it('returns false outside epsilon', () => {
    expect(isAtRest(1.0, 1.5)).toBe(false);
  });
  it('uses a custom epsilon', () => {
    expect(isAtRest(1.0, 1.5, 1)).toBe(true);
  });
});
