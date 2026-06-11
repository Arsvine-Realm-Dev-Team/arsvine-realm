import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';
import type { BlogPostMeta, TranslationStatus } from '../types';
import { defaultLocale, locales, isLocale, type Locale } from '../i18n/config';

const BLOG_DIR = path.join(process.cwd(), 'content', 'blog');
const blogContentLocales = [...locales, 'ja', 'ru', 'fr'] as const;
export type BlogContentLocale = (typeof blogContentLocales)[number];

const specialPostLocales: Partial<Record<string, BlogContentLocale[]>> = {
  init: ['zh-CN', 'zh-TW', 'en', 'ja', 'ru', 'fr'],
};

/**
 * 多语言 MDX 文件命名约定（当前推荐）：
 *   - content/blog/<slug>/zh-CN.mdx
 *   - content/blog/<slug>/en.mdx
 *   - content/blog/<slug>/zh-TW.mdx
 *   - content/blog/<slug>/ja.mdx
 *   - content/blog/<slug>/ru.mdx
 *   - content/blog/<slug>/fr.mdx
 *
 * 历史兼容：
 *   - content/blog/foo.mdx        → zh-CN
 *   - content/blog/foo.en.mdx     → en
 *   - content/blog/foo.zh-TW.mdx  → zh-TW
 */

interface FileEntry {
  slug: string;
  locale: BlogContentLocale;
  relativePath: string;
}

function isBlogContentLocale(value: string): value is BlogContentLocale {
  return (blogContentLocales as readonly string[]).includes(value);
}

function walkBlogFiles(dir: string, rootDir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkBlogFiles(fullPath, rootDir));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(path.relative(rootDir, fullPath));
    }
  }

  return files;
}

function listAllFiles(): FileEntry[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return walkBlogFiles(BLOG_DIR, BLOG_DIR).map((relativePath) => {
    const normalizedPath = relativePath.replace(/\\/g, '/');
    const segments = normalizedPath.split('/');

    if (segments.length === 2) {
      const [slug, filename] = segments;
      const stem = filename.replace(/\.mdx$/, '');
      if (isBlogContentLocale(stem)) {
        return { slug, locale: stem, relativePath };
      }
    }

    const filename = segments[segments.length - 1];
    const stem = filename.replace(/\.mdx$/, '');
    const match = stem.match(/^(.+)\.([A-Za-z-]+)$/);
    if (match && isBlogContentLocale(match[2])) {
      return { slug: match[1], locale: match[2], relativePath };
    }

    return { slug: stem, locale: defaultLocale, relativePath };
  });
}

/** 列出所有 slug（去重，跨 locale） */
export function getPostSlugs(): string[] {
  const slugs = new Set<string>();
  for (const entry of listAllFiles()) slugs.add(entry.slug);
  return [...slugs];
}

function readEntry(entry: FileEntry) {
  const filePath = path.join(BLOG_DIR, entry.relativePath);
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);
  const stats = readingTime(content);

  // 仅当 frontmatter 显式给出且值是合法 locale 时才采纳，
  // 否则不在 meta 上写该字段（Next.js getStaticProps 不允许 undefined）。
  const rawOrigin = typeof data.originLocale === 'string' ? data.originLocale : undefined;
  const originLocale: Locale | undefined = rawOrigin && isLocale(rawOrigin) ? rawOrigin : undefined;

  const meta: BlogPostMeta = {
    slug: entry.slug,
    title: data.title || 'Untitled',
    date: data.date || '',
    excerpt: data.excerpt || '',
    tags: data.tags || [],
    readingTime: stats.text,
    pinned: Boolean(data.pinned),
    ...(originLocale ? { originLocale } : {}),
  };

  return { meta, content };
}

export function getAvailablePostContentLocales(slug: string): BlogContentLocale[] {
  const all = listAllFiles().filter((entry) => entry.slug === slug);
  const localeSet = new Set(all.map((entry) => entry.locale));
  const preferredOrder = specialPostLocales[slug] ?? [...locales];
  const ordered = preferredOrder.filter((locale) => localeSet.has(locale));
  const extras = [...localeSet].filter((locale) => !ordered.includes(locale));
  return [...ordered, ...extras];
}

export function getPostBySlugAndContentLocale(slug: string, locale: BlogContentLocale) {
  const entry = listAllFiles().find((file) => file.slug === slug && file.locale === locale);
  if (!entry) {
    throw new Error(`No post variant found for slug: ${slug}, locale: ${locale}`);
  }
  return { ...readEntry(entry), actualLocale: locale };
}

/**
 * 获取指定 slug 在指定 locale 下的内容；缺译时 fallback 到 defaultLocale。
 * fellBack=true 表示返回的是 fallback 版本。
 *
 * 同时给出 translationStatus 字段（'source' / 'translated' / 'fallback'），
 * UI 应优先使用该字段而不是 fellBack（fellBack 保留以兼容旧调用方）。
 */
export function getPostBySlugAndLocale(slug: string, locale: Locale) {
  const all = listAllFiles();
  const requested = all.find((e) => e.slug === slug && e.locale === locale);
  if (requested) {
    const entry = readEntry(requested);
    // 若 frontmatter 未声明 originLocale，默认这份文件就是该 locale 下的原创，
    // 而不是从 defaultLocale 翻译而来 —— 否则像 init/en.mdx 这种亲手写的源文
    // 会被错误地标成 translated 并弹出"译自简体中文"横幅。
    const origin = entry.meta.originLocale ?? locale;
    const status: TranslationStatus = locale === origin ? 'source' : 'translated';
    return { ...entry, requestedLocale: locale, actualLocale: locale, fellBack: false, translationStatus: status };
  }
  const fallback = all.find((e) => e.slug === slug && e.locale === defaultLocale);
  if (fallback) {
    const entry = readEntry(fallback);
    const fell = locale !== defaultLocale;
    const status: TranslationStatus = fell ? 'fallback' : (entry.meta.originLocale && entry.meta.originLocale !== locale ? 'translated' : 'source');
    return { ...entry, requestedLocale: locale, actualLocale: defaultLocale, fellBack: fell, translationStatus: status };
  }
  throw new Error(`No post found for slug: ${slug}`);
}

/** 老 API：保留以兼容其他可能的调用方 */
export function getPostBySlug(slug: string) {
  return getPostBySlugAndLocale(slug, defaultLocale);
}

/** 列表页：返回指定 locale 下的全部 slug（包含 fallback） */
export function getAllPostsForLocale(locale: Locale): BlogPostMeta[] {
  const slugs = getPostSlugs();
  const posts = slugs
    .map((slug) => {
      const { meta } = getPostBySlugAndLocale(slug, locale);
      return meta;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

  return posts;
}

/** 老 API：默认 locale 的所有 post，保留兼容（如旧 RSS） */
export function getAllPosts(): BlogPostMeta[] {
  return getAllPostsForLocale(defaultLocale);
}
