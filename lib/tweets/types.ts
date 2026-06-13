export type TweetLang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'other';

export type TweetItem = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  content: string;
  lang?: TweetLang;
  tags?: string[];
  visibility?: 'public' | 'hidden';
  pinned?: boolean;
};

export type TweetIndexItem = {
  month: string;
  path: string;
  count?: number;
  updatedAt?: string;
};

export type TweetMonthGroup = {
  month: string;
  count?: number;
  updatedAt?: string;
  tweets: TweetItem[];
};
