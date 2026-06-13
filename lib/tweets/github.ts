import type { TweetIndexItem, TweetItem, TweetMonthGroup } from './types';

const OWNER = process.env.TWEETS_GITHUB_OWNER;
const REPO = process.env.TWEETS_GITHUB_REPO;
const BRANCH = process.env.TWEETS_GITHUB_BRANCH ?? 'main';
const TOKEN = process.env.TWEETS_GITHUB_TOKEN;

function assertEnv() {
  if (!OWNER) throw new Error('Missing TWEETS_GITHUB_OWNER');
  if (!REPO) throw new Error('Missing TWEETS_GITHUB_REPO');
  if (!TOKEN) throw new Error('Missing TWEETS_GITHUB_TOKEN');
}

async function fetchGitHubContent(path: string): Promise<string> {
  assertEnv();

  const url =
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}` +
    `?ref=${encodeURIComponent(BRANCH)}`;

  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github.raw',
      Authorization: `Bearer ${TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'arsvine-realm',
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${path}: ${res.status} ${res.statusText}`);
  }

  return res.text();
}

async function fetchGitHubJson<T>(path: string): Promise<T> {
  const text = await fetchGitHubContent(path);

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Invalid JSON in ${path}`);
  }
}

function sortTweets(tweets: TweetItem[]): TweetItem[] {
  return tweets.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

async function getTweetIndex(): Promise<TweetIndexItem[]> {
  let index: TweetIndexItem[];
  try {
    index = await fetchGitHubJson<TweetIndexItem[]>('tweets/index.json');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    // Fresh private repos may not have tweets/index.json yet; treat that as "no tweets".
    if (message.includes('Failed to fetch tweets/index.json: 404')) {
      return [];
    }
    throw error;
  }

  return index;
}

export async function getTweetMonthGroups(): Promise<TweetMonthGroup[]> {
  const index = await getTweetIndex();

  const monthlyTweets = await Promise.all(
    index.map(async (item) => {
      const tweets = await fetchGitHubJson<TweetItem[]>(item.path);
      const visibleTweets = sortTweets(
        tweets.filter((tweet) => tweet.visibility !== 'hidden'),
      );

      return {
        month: item.month,
        count: item.count,
        updatedAt: item.updatedAt,
        tweets: visibleTweets,
      } satisfies TweetMonthGroup;
    }),
  );

  return monthlyTweets
    .filter((group) => group.tweets.length > 0);
}

export async function getTweets(): Promise<TweetItem[]> {
  const groups = await getTweetMonthGroups();
  return groups.flatMap((group) => group.tweets);
}
