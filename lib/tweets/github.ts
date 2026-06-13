import type { TweetIndexItem, TweetItem, TweetMonthGroup, TweetMonthGroupsPage } from './types';

const OWNER = process.env.TWEETS_GITHUB_OWNER;
const REPO = process.env.TWEETS_GITHUB_REPO;
const BRANCH = process.env.TWEETS_GITHUB_BRANCH ?? 'main';
const TOKEN = process.env.TWEETS_GITHUB_TOKEN;
const STRESS_TEST_ENABLED = process.env.TWEETS_STRESS_TEST === '1';
const STRESS_TEST_YEARS = parsePositiveInt(process.env.TWEETS_STRESS_YEARS, 6);
const STRESS_TEST_MONTHS_PER_YEAR = parsePositiveInt(process.env.TWEETS_STRESS_MONTHS_PER_YEAR, 12);
const STRESS_TEST_TWEETS_PER_MONTH = parsePositiveInt(process.env.TWEETS_STRESS_TWEETS_PER_MONTH, 24);

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

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

function buildStressTweet(month: string, index: number): TweetItem {
  const year = month.slice(0, 4);
  const monthNumber = month.slice(5, 7);
  const day = String((index % 28) + 1).padStart(2, '0');
  const hour = String((index * 3) % 24).padStart(2, '0');
  const minute = String((index * 7) % 60).padStart(2, '0');
  const createdAt = `${year}-${monthNumber}-${day}T${hour}:${minute}:00+08:00`;
  const langs: Array<TweetItem['lang']> = ['zh-CN', 'zh-TW', 'en', 'ja', 'other'];
  const lang = langs[index % langs.length] ?? 'zh-CN';
  // 每 5 条注入一段 <Explain>，覆盖打字机 reveal、hover/focus tooltip、
  // 切换原文/译文（译文里被 strip 掉，保持纯文本）等行为。
  const withExplain = index % 5 === 0;
  const baseContent =
    `压力测试推文 ${month} / ${String(index + 1).padStart(2, '0')}。\n` +
    '这一条用于测试长列表、长文本、按月预加载、Load More，以及多语言回退在高数量下的表现。';
  const content = withExplain
    ? `${baseContent}\n` +
      `备注：<Explain note="句级注解 tooltip 的压测样本，hover/focus 触发；移动端切换为底部 fixed 面板。">这里是被注解的短语</Explain>，` +
      `译文里不会保留该标签。`
    : baseContent;

  const translations: NonNullable<TweetItem['translations']> = {};
  if (lang !== 'zh-CN') {
    translations['zh-CN'] = {
      content: `这是一条 ${lang} 原文的压测翻译版本 ${month}-${String(index + 1).padStart(2, '0')}。`,
      sourceLang: lang,
      translatedAt: createdAt,
      model: 'stress-preview',
      promptKey: 'translate-to-zh-CN',
      stale: index % 9 === 0,
    };
  }
  if (lang !== 'zh-TW') {
    translations['zh-TW'] = {
      content: `這是一條 ${lang} 原文的壓測翻譯版本 ${month}-${String(index + 1).padStart(2, '0')}。`,
      sourceLang: lang,
      translatedAt: createdAt,
      model: 'stress-preview',
      promptKey: 'translate-to-zh-TW',
      stale: index % 7 === 0,
    };
  }
  if (lang !== 'en') {
    translations.en = {
      content: `Stress-preview translation ${month}-${String(index + 1).padStart(2, '0')} from ${lang}.`,
      sourceLang: lang,
      translatedAt: createdAt,
      model: 'stress-preview',
      promptKey: 'translate-to-en',
      stale: index % 11 === 0,
    };
  }

  return {
    id: `${year}${monthNumber}${day}-${String(index + 1).padStart(3, '0')}`,
    createdAt,
    updatedAt: createdAt,
    content,
    lang,
    tags: [
      `year-${year}`,
      `month-${monthNumber}`,
      index % 2 === 0 ? 'preview' : 'stress',
    ],
    visibility: 'public',
    pinned: index % 10 === 0,
    translations,
  };
}

function buildStressMonthGroups(): TweetMonthGroup[] {
  const now = new Date();
  const groups: TweetMonthGroup[] = [];

  for (let yearOffset = 0; yearOffset < STRESS_TEST_YEARS; yearOffset += 1) {
    const year = now.getFullYear() - yearOffset;
    for (let monthIndex = STRESS_TEST_MONTHS_PER_YEAR; monthIndex >= 1; monthIndex -= 1) {
      const month = `${year}-${String(monthIndex).padStart(2, '0')}`;
      const tweets = Array.from(
        { length: STRESS_TEST_TWEETS_PER_MONTH },
        (_, index) => buildStressTweet(month, index),
      );

      groups.push({
        month,
        count: tweets.length,
        updatedAt: tweets[0]?.updatedAt,
        tweets: sortTweets(tweets),
      });
    }
  }

  return groups;
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
  if (STRESS_TEST_ENABLED) {
    return buildStressMonthGroups();
  }

  const index = await getTweetIndex();

  const monthlyTweets = await Promise.all(
    index.map(async (item) => {
      const tweets = await fetchGitHubJson<TweetItem[]>(item.path);
      const visibleTweets = sortTweets(
        tweets.filter((tweet) => (tweet.visibility ?? 'public') === 'public'),
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

export async function getTweetMonthGroupsPage(
  offset: number,
  limit: number,
): Promise<TweetMonthGroupsPage> {
  const allGroups = await getTweetMonthGroups();
  return {
    monthGroups: allGroups.slice(offset, offset + limit),
    totalMonths: allGroups.length,
  };
}

export async function getTweets(): Promise<TweetItem[]> {
  const groups = await getTweetMonthGroups();
  return groups.flatMap((group) => group.tweets);
}
