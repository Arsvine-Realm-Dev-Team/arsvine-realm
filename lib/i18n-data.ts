/**
 * i18n 数据加载器 — 把语言变体的 data/<topic>/*.ts 解析成统一接口。
 *
 * 当前架构（务实做法，避免对原有 data 文件做激进切割）：
 *   - 每组内容收纳在 data/<topic>/ 下：
 *       - index.ts      → zh-CN（默认 locale）
 *       - en.ts         → 英文版
 *       - zh-TW.ts      → 繁体版
 *   - 文件结构与原文件一一对应，导出相同的命名导出。
 *   - 缺译时 fallback 到 defaultLocale 的数据，并通过 `fellBack` 字段标记。
 *
 * 加载使用静态 import 而非 await import：Pages Router 的 getStaticProps
 * 跑在 Node 端，静态 import 让 webpack 可以做 tree-shaking 与 build-time
 * 静态分析，比异步路径稳。代价是新增 locale 必须改这个文件。
 */
import type {
  Project,
  LifeItem,
  ExperienceItem,
  FriendLink,
  SkillCategory,
  ServiceCredit,
  TranslationStatus,
} from '../types';
import { defaultLocale, type Locale } from '../i18n/config';

import * as projectsZH from '../data/projects';
import * as lifeZH from '../data/life';
import * as experienceZH from '../data/experience';
import * as friendsZH from '../data/friendLinks';
import * as skillsZH from '../data/skills';
import * as siteZH from '../data/site';

// 翻译版可选 import。新增 locale 时复制下面两行模式。
// (条件导入靠 try/catch + require 在 Node 端实现；webpack 静态分析下
// 不存在的文件会让 require 抛错，被我们 catch 后 fallback 到 zh-CN。)

interface ProjectsModule {
  webProjects: Project[];
  gameProjects: Project[];
  earlyProjects: Project[];
  learnProjects: Project[];
  workProjects: Project[];
  copyableTokens: typeof projectsZH.copyableTokens;
}

interface LifeModule {
  gameData: LifeItem[];
  travelData: LifeItem[];
  otherData: LifeItem[];
  alsoPlayGames: string[];
  artPlaceholderText: string;
}

interface ExperienceModule {
  experienceData: ExperienceItem[];
}

interface FriendsModule {
  friendLinksData: FriendLink[];
}

interface SkillsModule {
  skillCategories: SkillCategory[];
  skillsData: typeof skillsZH.skillsData;
}

function tryLoad<T>(loader: () => T): T | null {
  try {
    return loader();
  } catch {
    return null;
  }
}

function hasVariant(modulePath: string): boolean {
  return tryLoad(() => require(modulePath)) !== null;
}

/** 加载 locale 对应的 projects 模块，缺失时回退默认 locale */
export function loadProjects(locale: Locale): ProjectsModule {
  if (locale === defaultLocale) return projectsZH as ProjectsModule;
  // 其他 locale：尝试 require，失败回退
  const variant = tryLoad<ProjectsModule>(() => require(`../data/projects/${locale}`));
  return variant ?? (projectsZH as ProjectsModule);
}

export function hasProjectsLocaleVariant(locale: Locale): boolean {
  return locale === defaultLocale || hasVariant(`../data/projects/${locale}`);
}

/**
 * 在指定 locale 下解析单个 web project：
 *   - 若 locale 自身的 data 文件存在该 id     → status = 'source' 或 'translated'
 *   - 否则退到原文 locale（originLocale）       → status = 'fallback'
 *   - 原文也找不到则退到 defaultLocale          → status = 'fallback'
 *
 * `originLocale` 取自项目数据；缺省视为 defaultLocale。
 * 返回的 `project` 字段一定来自实际可读到的 locale 的 data 文件。
 */
export function resolveWebProject(
  id: number,
  locale: Locale,
): { project: Project; status: TranslationStatus; actualLocale: Locale; originLocale: Locale } | null {
  // 先尝试当前 locale 自有数据
  const current = loadProjects(locale).webProjects.find((p) => p.id === id);
  if (current) {
    const origin = (current.originLocale ?? defaultLocale) as Locale;
    return {
      project: current,
      status: locale === origin ? 'source' : 'translated',
      actualLocale: locale,
      originLocale: origin,
    };
  }

  // 没找到 → 用 defaultLocale 数据里同 id 的项目兜底
  const defaults = loadProjects(defaultLocale).webProjects.find((p) => p.id === id);
  if (!defaults) return null;
  const origin = (defaults.originLocale ?? defaultLocale) as Locale;

  // 优先回退到原文 locale；否则回到 defaultLocale
  if (origin !== defaultLocale) {
    const fromOrigin = loadProjects(origin).webProjects.find((p) => p.id === id);
    if (fromOrigin) {
      return { project: fromOrigin, status: 'fallback', actualLocale: origin, originLocale: origin };
    }
  }
  return { project: defaults, status: 'fallback', actualLocale: defaultLocale, originLocale: origin };
}

export function loadLife(locale: Locale): LifeModule {
  if (locale === defaultLocale) return lifeZH as LifeModule;
  const variant = tryLoad<LifeModule>(() => require(`../data/life/${locale}`));
  return variant ?? (lifeZH as LifeModule);
}

export function hasLifeLocaleVariant(locale: Locale): boolean {
  return locale === defaultLocale || hasVariant(`../data/life/${locale}`);
}

/**
 * 在指定 locale 下解析单个 life item，逻辑与 resolveWebProject 对应。
 */
export function resolveLifeItem(
  slug: string,
  locale: Locale,
): { item: LifeItem; status: TranslationStatus; actualLocale: Locale; originLocale: Locale } | null {
  const flatten = (mod: LifeModule) => [...mod.gameData, ...mod.travelData, ...mod.otherData];

  const current = flatten(loadLife(locale)).find((i) => i.id === slug);
  if (current) {
    const origin = (current.originLocale ?? defaultLocale) as Locale;
    return {
      item: current,
      status: locale === origin ? 'source' : 'translated',
      actualLocale: locale,
      originLocale: origin,
    };
  }

  const defaults = flatten(loadLife(defaultLocale)).find((i) => i.id === slug);
  if (!defaults) return null;
  const origin = (defaults.originLocale ?? defaultLocale) as Locale;

  if (origin !== defaultLocale) {
    const fromOrigin = flatten(loadLife(origin)).find((i) => i.id === slug);
    if (fromOrigin) {
      return { item: fromOrigin, status: 'fallback', actualLocale: origin, originLocale: origin };
    }
  }
  return { item: defaults, status: 'fallback', actualLocale: defaultLocale, originLocale: origin };
}

export function loadExperience(locale: Locale): ExperienceModule {
  if (locale === defaultLocale) return experienceZH as ExperienceModule;
  const variant = tryLoad<ExperienceModule>(() => require(`../data/experience/${locale}`));
  return variant ?? (experienceZH as ExperienceModule);
}

export function loadFriendLinks(locale: Locale): FriendsModule {
  if (locale === defaultLocale) return friendsZH as FriendsModule;
  const variant = tryLoad<FriendsModule>(() => require(`../data/friendLinks/${locale}`));
  return variant ?? (friendsZH as FriendsModule);
}

export function loadSkills(locale: Locale): SkillsModule {
  if (locale === defaultLocale) return skillsZH as SkillsModule;
  const variant = tryLoad<SkillsModule>(() => require(`../data/skills/${locale}`));
  return variant ?? (skillsZH as SkillsModule);
}

/** 根据 locale 选友链页底部「致谢服务」配置（来源于 site.ts） */
export function loadServices(_locale: Locale): { heading: string; items: ServiceCredit[] } | undefined {
  // 致谢服务区不分语言：avatar/url 是固定的，只有 heading 受 locale 影响
  // heading 由 locales/<locale>.json 的 pages.friends.servicesHeading 提供
  return siteZH.siteConfig.pages.friends.services;
}

/** 加载 locale 对应的 messages（locales/<locale>.json） */
export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  const messages = await import(`../locales/${locale}.json`);
  return messages.default;
}
