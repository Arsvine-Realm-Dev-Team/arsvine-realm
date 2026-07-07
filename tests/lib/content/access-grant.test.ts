import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createAccessGrant,
  getAccessGrantCookieName,
  hasValidAccessGrant,
  setAccessGrantCookie,
  clearAccessGrantCookie,
  verifyAccessGrant,
} from '../../../lib/content/access-grant';

const ORIGINAL_SECRET = process.env.ACCESS_GRANT_SECRET;
const TEST_SECRET = 'test-access-grant-secret-do-not-use-in-prod';

beforeEach(() => {
  process.env.ACCESS_GRANT_SECRET = TEST_SECRET;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.ACCESS_GRANT_SECRET;
  } else {
    process.env.ACCESS_GRANT_SECRET = ORIGINAL_SECRET;
  }
});

describe('createAccessGrant / verifyAccessGrant', () => {
  it('signs a valid grant for the matching group', () => {
    const token = createAccessGrant('friends-a');
    expect(verifyAccessGrant(token, 'friends-a')).toBe(true);
  });

  it('rejects a grant when the group does not match', () => {
    const token = createAccessGrant('friends-a');
    expect(verifyAccessGrant(token, 'friends-b')).toBe(false);
  });

  it('rejects a grant when the cookie value is missing', () => {
    expect(verifyAccessGrant(undefined, 'friends-a')).toBe(false);
    expect(verifyAccessGrant('', 'friends-a')).toBe(false);
  });

  it('rejects an expired grant', () => {
    const token = createAccessGrant('friends-a', -1);
    expect(verifyAccessGrant(token, 'friends-a')).toBe(false);
  });

  it('rejects a tampered signature', () => {
    const token = createAccessGrant('friends-a');
    // base64url 末尾两字符是签名；把第一字符替换为不同的合法 base64url 字符
    const tampered = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(verifyAccessGrant(tampered, 'friends-a')).toBe(false);
  });

  it('rejects a tampered payload (group swapped)', () => {
    // 重新签发一个 friends-b 的 token，然后试图把它作为 friends-a 验过；
    // 关键点是 payload 整体重写后 sig 必然不匹配 —— 即使手动修 group 也会被拒。
    const original = createAccessGrant('friends-a');
    const decoded = JSON.parse(Buffer.from(original, 'base64url').toString('utf8'));
    const tampered = Buffer.from(
      JSON.stringify({ ...decoded, group: 'friends-b' }),
      'utf8',
    ).toString('base64url');
    expect(verifyAccessGrant(tampered, 'friends-a')).toBe(false);
    expect(verifyAccessGrant(tampered, 'friends-b')).toBe(false);
  });

  it('rejects corrupted base64url input', () => {
    expect(verifyAccessGrant('!!!not-base64!!!', 'friends-a')).toBe(false);
  });

  it('rejects a payload missing required fields', () => {
    const malformed = Buffer.from(JSON.stringify({ group: 'friends-a' }), 'utf8').toString(
      'base64url',
    );
    expect(verifyAccessGrant(malformed, 'friends-a')).toBe(false);
  });

  it('rejects a wrong-type payload (sig is a number)', () => {
    const wrong = Buffer.from(
      JSON.stringify({ group: 'friends-a', exp: Date.now() + 60_000, sig: 12345 }),
      'utf8',
    ).toString('base64url');
    expect(verifyAccessGrant(wrong, 'friends-a')).toBe(false);
  });

  it('throws when ACCESS_GRANT_SECRET is missing on sign', () => {
    delete process.env.ACCESS_GRANT_SECRET;
    expect(() => createAccessGrant('friends-a')).toThrow(/Missing ACCESS_GRANT_SECRET/);
  });

  it('rejects a grant signed with a different secret', () => {
    const token = createAccessGrant('friends-a');
    process.env.ACCESS_GRANT_SECRET = 'rotated-secret';
    expect(verifyAccessGrant(token, 'friends-a')).toBe(false);
    process.env.ACCESS_GRANT_SECRET = TEST_SECRET;
    expect(verifyAccessGrant(token, 'friends-a')).toBe(true);
  });
});

describe('hasValidAccessGrant', () => {
  it('reads the grant from the cookies bag', () => {
    const token = createAccessGrant('friends-a');
    expect(hasValidAccessGrant({ cookies: { arsvine_post_access: token } }, 'friends-a')).toBe(
      true,
    );
  });

  it('returns false when the cookie is absent', () => {
    expect(hasValidAccessGrant({ cookies: {} }, 'friends-a')).toBe(false);
  });

  it('exposes a stable cookie name', () => {
    expect(getAccessGrantCookieName()).toBe('arsvine_post_access');
  });
});

describe('setAccessGrantCookie / clearAccessGrantCookie', () => {
  function mockResponse() {
    const headers: Record<string, string | string[]> = {};
    return {
      headers,
      getHeader(name: string) {
        return headers[name];
      },
      setHeader(name: string, value: string | string[]) {
        headers[name] = value;
      },
    } as unknown as Parameters<typeof setAccessGrantCookie>[0];
  }

  it('writes a Set-Cookie header with HttpOnly, SameSite=Lax, Path=/', () => {
    const res = mockResponse();
    setAccessGrantCookie(res, 'friends-a', 60_000);
    const setCookie = res.getHeader('Set-Cookie');
    expect(typeof setCookie).toBe('string');
    expect(setCookie as string).toMatch(/^arsvine_post_access=/);
    expect(setCookie as string).toContain('Path=/');
    expect(setCookie as string).toContain('HttpOnly');
    expect(setCookie as string).toContain('SameSite=Lax');
    expect(setCookie as string).toContain('Max-Age=60');
  });

  it('omits Secure in non-production', () => {
    const previous = process.env['NODE_ENV'];
    // ProcessEnv 字段在 TS 类型里是 readonly；测试临时改 NODE_ENV 触发 secure 开关。
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'development';
    try {
      const res = mockResponse();
      setAccessGrantCookie(res, 'friends-a');
      expect(res.getHeader('Set-Cookie') as string).not.toContain('Secure');
    } finally {
      (process.env as Record<string, string | undefined>)['NODE_ENV'] = previous;
    }
  });

  it('emits Secure in production', () => {
    const previous = process.env['NODE_ENV'];
    (process.env as Record<string, string | undefined>)['NODE_ENV'] = 'production';
    try {
      const res = mockResponse();
      setAccessGrantCookie(res, 'friends-a');
      expect(res.getHeader('Set-Cookie') as string).toContain('Secure');
    } finally {
      (process.env as Record<string, string | undefined>)['NODE_ENV'] = previous;
    }
  });

  it('clearAccessGrantCookie writes Max-Age=0', () => {
    const res = mockResponse();
    clearAccessGrantCookie(res);
    const setCookie = res.getHeader('Set-Cookie') as string;
    expect(setCookie).toContain('arsvine_post_access=');
    expect(setCookie).toContain('Max-Age=0');
  });
});
