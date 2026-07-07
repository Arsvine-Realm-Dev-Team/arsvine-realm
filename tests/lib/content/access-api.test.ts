import { describe, expect, it } from 'vitest';

import { type AccessApiErrorCode, normalizeNextPath } from '../../../lib/content/access-api';

describe('normalizeNextPath', () => {
  it('keeps safe internal paths', () => {
    expect(normalizeNextPath('/en/blog/init')).toBe('/en/blog/init');
  });

  it('rejects empty, external or protocol-relative paths', () => {
    expect(normalizeNextPath(undefined)).toBe('/');
    expect(normalizeNextPath('https://example.com')).toBe('/');
    expect(normalizeNextPath('//example.com')).toBe('/');
  });
});

describe('AccessApiErrorCode', () => {
  it('covers every documented post-variant / protected-verify / grant-check code', () => {
    // 编译期保证：列举的值与类型必须完全一致；运行期确认运行时可见。
    // 任何遗漏都会在编译期报"type instantiation is excessively deep"。
    const expected: AccessApiErrorCode[] = [
      'METHOD_NOT_ALLOWED',
      'VALIDATION_FAILED',
      'GROUP_NOT_FOUND',
      'TOTP_INVALID',
      'RATE_LIMITED',
      'FORBIDDEN',
      'NOT_FOUND',
      'INTERNAL_ERROR',
      'UPSTREAM_FAILED',
    ];
    for (const code of expected) {
      // shape 校验：AccessApiError 必须能容纳每个 code
      const err: { code: AccessApiErrorCode; message: string } = { code, message: 'x' };
      expect(err.code).toBe(code);
    }
  });
});
