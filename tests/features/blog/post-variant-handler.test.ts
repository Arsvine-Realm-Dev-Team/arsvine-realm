import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBlogPostEntryMock,
  getPostBySlugAndContentLocaleMock,
  hasValidAccessGrantMock,
  serializeMock,
} = vi.hoisted(() => ({
  getBlogPostEntryMock: vi.fn(),
  getPostBySlugAndContentLocaleMock: vi.fn(),
  hasValidAccessGrantMock: vi.fn(),
  serializeMock: vi.fn(),
}));

vi.mock('@/features/blog/server/blog', () => ({
  getBlogPostEntry: getBlogPostEntryMock,
  getPostBySlugAndContentLocale: getPostBySlugAndContentLocaleMock,
  isBlogContentLocale: (value: unknown) =>
    typeof value === 'string' && ['zh-CN', 'zh-TW', 'en', 'ja', 'ru', 'fr'].includes(value),
}));

vi.mock('@/shared/lib/content/access-grant', () => ({
  hasValidAccessGrant: hasValidAccessGrantMock,
}));

vi.mock('next-mdx-remote/serialize', () => ({
  serialize: serializeMock,
}));

import handler from '@/pages/api/post-variant';

function createMockResponse() {
  const headers = new Map<string, string | string[]>();
  let statusCode = 200;
  let body: unknown;

  return {
    res: {
      setHeader(name: string, value: string | string[]) {
        headers.set(name, value);
      },
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        body = payload;
        return this;
      },
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body;
    },
    getHeader(name: string) {
      return headers.get(name);
    },
  };
}

describe('/api/post-variant', () => {
  beforeEach(() => {
    getBlogPostEntryMock.mockReset();
    getPostBySlugAndContentLocaleMock.mockReset();
    hasValidAccessGrantMock.mockReset();
    serializeMock.mockReset();
  });

  it('rejects unauthorized protected requests before fetching article content', async () => {
    getBlogPostEntryMock.mockResolvedValue({
      slug: 'protected-post',
      access: { mode: 'totp', group: 'family' },
    });
    hasValidAccessGrantMock.mockReturnValue(false);

    const mock = createMockResponse();
    await handler({
      method: 'GET',
      query: { locale: 'zh-CN', slug: 'protected-post' },
      cookies: {},
    } as never, mock.res as never);

    expect(mock.statusCode).toBe(403);
    expect(mock.body).toEqual({
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Access grant required.' },
    });
    expect(getPostBySlugAndContentLocaleMock).not.toHaveBeenCalled();
    expect(serializeMock).not.toHaveBeenCalled();
    expect(mock.getHeader('Cache-Control')).toBe('private, no-store');
    expect(mock.getHeader('Vary')).toBe('Cookie');
  });

  it('allows protected content only after a valid access grant', async () => {
    getBlogPostEntryMock.mockResolvedValue({
      slug: 'protected-post',
      access: { mode: 'totp', group: 'family' },
    });
    hasValidAccessGrantMock.mockReturnValue(true);
    getPostBySlugAndContentLocaleMock.mockResolvedValue({
      meta: {
        slug: 'protected-post',
        title: 'Protected Post',
        date: '2026-06-08',
        excerpt: 'Secret',
        tags: [],
        readingMinutes: 1,
        access: { mode: 'totp', group: 'family' },
      },
      content: '# secret',
    });
    serializeMock.mockResolvedValue({
      compiledSource: 'compiled',
      frontmatter: {},
      scope: {},
    });

    const mock = createMockResponse();
    await handler({
      method: 'GET',
      query: { locale: 'zh-CN', slug: 'protected-post' },
      cookies: { arsvine_post_access: 'signed-token' },
    } as never, mock.res as never);

    expect(mock.statusCode).toBe(200);
    expect(getPostBySlugAndContentLocaleMock).toHaveBeenCalledWith(
      'protected-post',
      'zh-CN',
    );
    expect(serializeMock).toHaveBeenCalledWith('# secret');
  });
});
