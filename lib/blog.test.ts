import { describe, expect, it } from 'vitest';

import { normalizeAccess } from './blog';

describe('normalizeAccess', () => {
  it('returns the public shape when mode is not totp', () => {
    expect(normalizeAccess({ mode: 'public' })).toEqual({ mode: 'public' });
  });

  it('returns public when input is undefined', () => {
    expect(normalizeAccess(undefined)).toEqual({ mode: 'public' });
  });

  it('trims the totp group and falls back to undefined on empty', () => {
    expect(normalizeAccess({ mode: 'totp', group: '  friends-a  ' })).toEqual({
      mode: 'totp',
      group: 'friends-a',
    });
    expect(normalizeAccess({ mode: 'totp', group: '   ' })).toEqual({
      mode: 'totp',
      group: undefined,
    });
  });

  it('omits group key when none provided', () => {
    const result = normalizeAccess({ mode: 'totp' });
    expect(result).toEqual({ mode: 'totp', group: undefined });
  });
});
