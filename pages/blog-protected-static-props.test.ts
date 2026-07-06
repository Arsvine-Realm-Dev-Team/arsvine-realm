import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getBlogPostEntryMock,
  getPostMetaBySlugAndLocaleMock,
  getAllPostsForLocaleMock,
  getProtectedPostPublicMetaMock,
  getAvailablePostContentLocalesMock,
  normalizeAccessMock,
  getPostBySlugAndLocaleMock,
  getPostSlugsMock,
  loadMessagesMock,
  serializeMock,
} = vi.hoisted(() => ({
  getBlogPostEntryMock: vi.fn(),
  getPostMetaBySlugAndLocaleMock: vi.fn(),
  getAllPostsForLocaleMock: vi.fn(),
  getProtectedPostPublicMetaMock: vi.fn(),
  getAvailablePostContentLocalesMock: vi.fn(),
  normalizeAccessMock: vi.fn(),
  getPostBySlugAndLocaleMock: vi.fn(),
  getPostSlugsMock: vi.fn(),
  loadMessagesMock: vi.fn(),
  serializeMock: vi.fn(),
}));

vi.mock('gsap', () => ({
  default: { set: vi.fn(), to: vi.fn() },
}));

vi.mock('next/head', () => ({
  default: () => null,
}));

vi.mock('next/link', () => ({
  default: () => null,
}));

vi.mock('next/router', () => ({
  useRouter: () => ({ asPath: '', isFallback: false }),
}));

vi.mock('next-intl', () => ({
  useTranslations: () => () => '',
}));

vi.mock('next-mdx-remote', () => ({
  MDXRemote: () => null,
}));

vi.mock('next-mdx-remote/serialize', () => ({
  serialize: serializeMock,
}));

vi.mock('../components/mdx/MDXComponents', () => ({
  default: {},
}));

vi.mock('../components/shared/LocaleFallbackBanner', () => ({
  default: () => null,
}));

vi.mock('../components/shared/HreflangLinks', () => ({
  default: () => null,
}));

vi.mock('../components/shared/AnimatedTitleChars', () => ({
  AnimatedTitleChars: () => null,
}));

vi.mock('../components/blog/ProtectedPostGate', () => ({
  default: () => null,
}));

vi.mock('../components/blog/BlogStateShell', () => ({
  default: () => null,
}));

vi.mock('../components/blog/BlogDetailScaffold', () => ({
  default: () => null,
}));

vi.mock('../contexts/AppContext', () => ({
  useApp: () => ({ isInverted: false }),
}));

vi.mock('../contexts/TransitionContext', () => ({
  useTransition: () => ({ navigateTo: vi.fn() }),
}));

vi.mock('../hooks/useBlogPostState', () => ({
  __esModule: true,
  default: vi.fn(),
  blogContentLocaleLabels: {},
}));

vi.mock('../lib/blog', () => ({
  getBlogPostEntry: getBlogPostEntryMock,
  getPostMetaBySlugAndLocale: getPostMetaBySlugAndLocaleMock,
  getAllPostsForLocale: getAllPostsForLocaleMock,
  getProtectedPostPublicMeta: getProtectedPostPublicMetaMock,
  getPostSlugs: getPostSlugsMock,
  getAvailablePostContentLocales: getAvailablePostContentLocalesMock,
  getPostBySlugAndLocale: getPostBySlugAndLocaleMock,
  normalizeAccess: normalizeAccessMock,
}));

vi.mock('../lib/i18n-data', () => ({
  loadMessages: loadMessagesMock,
}));

describe('protected blog getStaticProps', () => {
  beforeEach(() => {
    getBlogPostEntryMock.mockReset();
    getPostMetaBySlugAndLocaleMock.mockReset();
    getAllPostsForLocaleMock.mockReset();
    getProtectedPostPublicMetaMock.mockReset();
    getAvailablePostContentLocalesMock.mockReset();
    normalizeAccessMock.mockReset();
    getPostBySlugAndLocaleMock.mockReset();
    getPostSlugsMock.mockReset();
    loadMessagesMock.mockReset();
    serializeMock.mockReset();
  });

  it('returns sanitized props and skips body fetch for protected posts', async () => {
    getBlogPostEntryMock.mockResolvedValue({
      slug: 'protected-post',
      access: { mode: 'totp', group: 'family' },
    });
    getPostMetaBySlugAndLocaleMock.mockResolvedValue({
      meta: {
        slug: 'protected-post',
        title: 'Protected Post',
        date: '2026-06-08',
        excerpt: 'Secret excerpt',
        tags: ['private'],
        readingMinutes: 9,
        access: { mode: 'totp', group: 'family' },
      },
      translationStatus: 'source',
      actualLocale: 'zh-CN',
      actualContentLocale: 'zh-CN',
    });
    getProtectedPostPublicMetaMock.mockReturnValue({
      slug: 'protected-post',
      title: 'Protected Post',
      date: '2026-06-08',
      excerpt: '',
      tags: [],
      readingMinutes: 0,
      access: { mode: 'totp', group: 'family' },
    });
    getAllPostsForLocaleMock.mockResolvedValue([]);
    loadMessagesMock.mockResolvedValue({});
    getAvailablePostContentLocalesMock.mockResolvedValue(['zh-CN']);
    normalizeAccessMock.mockReturnValue({ mode: 'totp', group: 'family' });

    const { getStaticProps } = await import('./[locale]/blog/[slug]');
    const result = await getStaticProps({
      params: { locale: 'zh-CN', slug: 'protected-post' },
    } as never);

    expect(result).toEqual({
      props: {
        locale: 'zh-CN',
        messages: {},
        meta: {
          slug: 'protected-post',
          title: 'Protected Post',
          date: '2026-06-08',
          excerpt: '',
          tags: [],
          readingMinutes: 0,
          access: { mode: 'totp', group: 'family' },
        },
        mdxSource: null,
        allPosts: [],
        translationStatus: 'source',
        actualLocale: 'zh-CN',
        actualContentLocale: 'zh-CN',
        availableContentLocales: ['zh-CN'],
        contentVariants: {},
        access: { mode: 'totp', group: 'family' },
        isProtected: true,
      },
      revalidate: 300,
    });
    expect(getPostBySlugAndLocaleMock).not.toHaveBeenCalled();
    expect(serializeMock).not.toHaveBeenCalled();
  });
});
