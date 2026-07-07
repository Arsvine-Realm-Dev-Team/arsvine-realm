import type { ContentBlogIndex } from './types';

const OWNER = process.env.GITHUB_OWNER?.trim();
const REPO = process.env.GITHUB_REPO?.trim();
const BRANCH = process.env.GITHUB_BRANCH?.trim() || 'main';
const READ_TOKEN = process.env.GITHUB_READ_TOKEN?.trim();

// 上游请求超时 8s。Vercel SSR 默认 10s 上限，留 2s 余量给 MDX 编译/序列化等下游操作；
// 不设超时 + GitHub 5xx/限流会直接拉满整页 → 504。
const FETCH_TIMEOUT_MS = 8000;
const GITHUB_CONTENTS_API_BASE_URL = new URL('https://api.github.com');
const CONTROL_CHAR_RE = /[\u0000-\u001F\u007F]/;
const PROTOCOL_PREFIX_RE = /^[A-Za-z][A-Za-z\d+.-]*:/;

let blogIndexCache: { data: ContentBlogIndex; ts: number } | null = null;
const BLOG_INDEX_TTL_MS = 60_000;

export function hasContentRepoConfig() {
  return Boolean(OWNER && REPO && READ_TOKEN);
}

function assertEnv() {
  if (!OWNER) throw new Error('Missing GITHUB_OWNER');
  if (!REPO) throw new Error('Missing GITHUB_REPO');
  if (!READ_TOKEN) throw new Error('Missing GITHUB_READ_TOKEN');
}

export function normalizeContentPath(path: string) {
  const trimmed = path.trim();
  if (!trimmed) {
    throw new Error('Invalid content path.');
  }

  if (CONTROL_CHAR_RE.test(trimmed)) {
    throw new Error('Invalid content path.');
  }

  if (
    trimmed.startsWith('/')
    || trimmed.startsWith('\\')
    || trimmed.startsWith('//')
    || trimmed.includes('\\')
    || trimmed.includes('?')
    || trimmed.includes('#')
    || PROTOCOL_PREFIX_RE.test(trimmed)
  ) {
    throw new Error('Invalid content path.');
  }

  const normalizedSegments = trimmed.split('/').map((segment) => {
    if (!segment) {
      throw new Error('Invalid content path.');
    }

    let decodedSegment: string;
    try {
      decodedSegment = decodeURIComponent(segment);
    } catch {
      throw new Error('Invalid content path.');
    }

    if (
      decodedSegment === '.'
      || decodedSegment === '..'
      || decodedSegment.includes('/')
      || decodedSegment.includes('\\')
      || decodedSegment.includes('?')
      || decodedSegment.includes('#')
      || CONTROL_CHAR_RE.test(decodedSegment)
    ) {
      throw new Error('Invalid content path.');
    }

    return encodeURIComponent(decodedSegment);
  });

  return normalizedSegments.join('/');
}

function buildContentsUrl(path: string) {
  assertEnv();
  const normalizedPath = normalizeContentPath(path);
  const url = new URL(
    `/repos/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/contents/${normalizedPath}`,
    GITHUB_CONTENTS_API_BASE_URL,
  );
  url.searchParams.set('ref', BRANCH);
  return url.toString();
}

export async function fetchGitHubContent(path: string): Promise<string> {
  if (!hasContentRepoConfig()) {
    throw new Error('Content repository is not configured.');
  }

  let response: Response;
  try {
    response = await fetch(buildContentsUrl(path), {
      headers: {
        Accept: 'application/vnd.github.raw',
        Authorization: `Bearer ${READ_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'arsvine-realm-content-reader',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      throw new Error(`Timed out fetching ${path} after ${FETCH_TIMEOUT_MS}ms`);
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function fetchGitHubJson<T>(path: string): Promise<T> {
  const text = await fetchGitHubContent(path);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON in ${path}`);
  }
}

export async function getContentBlogIndex(): Promise<ContentBlogIndex> {
  if (blogIndexCache && Date.now() - blogIndexCache.ts < BLOG_INDEX_TTL_MS) {
    return blogIndexCache.data;
  }
  try {
    const data = await fetchGitHubJson<ContentBlogIndex>('blog-index.json');
    blogIndexCache = { data, ts: Date.now() };
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (
      message.includes('Content repository is not configured') ||
      message.includes('Failed to fetch blog-index.json: 404')
    ) {
      return {
        version: 1,
        updatedAt: new Date(0).toISOString(),
        posts: [],
      };
    }
    // 上游超时 / 5xx / 限流时若有 stale cache 则回退到 stale 数据避免整页 504；
    // 无 stale 则把错误抛出去，由调用方决定是 500 还是降级空数据。
    if (blogIndexCache) {
      console.warn('[content/github] blog-index fetch failed, serving stale cache:', message);
      return blogIndexCache.data;
    }
    throw error;
  }
}
