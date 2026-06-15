/**
 * i18n 数据加载器。
 *
 * Pages Router 的数据读取发生在 Node 侧，这里统一使用显式静态 registry：
 *   - 消除动态 require 带来的 Critical dependency 告警
 *   - 保留现有 data/<topic>/<locale>.ts 组织方式
 *   - 新增 locale 时只需在本文件补一条映射
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
import * as projectsEN from '../data/projects/en';
import * as projectsZHTW from '../data/projects/zh-TW';
import * as lifeZH from '../data/life';
import * as lifeEN from '../data/life/en';
import * as lifeZHTW from '../data/life/zh-TW';
import * as experienceZH from '../data/experience';
import * as experienceEN from '../data/experience/en';
import * as experienceZHTW from '../data/experience/zh-TW';
import * as friendsZH from '../data/friendLinks';
import * as friendsEN from '../data/friendLinks/en';
import * as friendsZHTW from '../data/friendLinks/zh-TW';
import * as skillsZH from '../data/skills';
import * as skillsEN from '../data/skills/en';
import * as skillsZHTW from '../data/skills/zh-TW';
import * as siteZH from '../data/site';
import enMessages from '../locales/en.json';
import zhCNMessages from '../locales/zh-CN.json';
import zhTWMessages from '../locales/zh-TW.json';

interface ProjectsModule {
  webProjects: Project[];
  gameProjects: Project[];
  earlyProjects: Project[];
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

type LocalizedModuleMap<T> = Record<Locale, T>;

const projectModules: LocalizedModuleMap<ProjectsModule> = {
  'zh-CN': projectsZH as ProjectsModule,
  'zh-TW': projectsZHTW as ProjectsModule,
  en: projectsEN as ProjectsModule,
};

const lifeModules: LocalizedModuleMap<LifeModule> = {
  'zh-CN': lifeZH as LifeModule,
  'zh-TW': lifeZHTW as LifeModule,
  en: lifeEN as LifeModule,
};

const experienceModules: LocalizedModuleMap<ExperienceModule> = {
  'zh-CN': experienceZH as ExperienceModule,
  'zh-TW': experienceZHTW as ExperienceModule,
  en: experienceEN as ExperienceModule,
};

const friendLinkModules: LocalizedModuleMap<FriendsModule> = {
  'zh-CN': friendsZH as FriendsModule,
  'zh-TW': friendsZHTW as FriendsModule,
  en: friendsEN as FriendsModule,
};

const skillModules: LocalizedModuleMap<SkillsModule> = {
  'zh-CN': skillsZH as SkillsModule,
  'zh-TW': skillsZHTW as SkillsModule,
  en: skillsEN as SkillsModule,
};

const messageModules: LocalizedModuleMap<Record<string, unknown>> = {
  'zh-CN': zhCNMessages as Record<string, unknown>,
  'zh-TW': zhTWMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
};

function loadLocalizedModule<T>(registry: LocalizedModuleMap<T>, locale: Locale): T {
  return registry[locale] ?? registry[defaultLocale];
}

/** 加载 locale 对应的 projects 模块，缺失时回退默认 locale */
export function loadProjects(locale: Locale): ProjectsModule {
  return loadLocalizedModule(projectModules, locale);
}

/**
 * 在指定 locale 下解析单个 web project：
 *   - locale 命中该 id                  → source / translated
 *   - locale 缺译且 origin locale 可读   → fallback 到原文
 *   - 否则回退 defaultLocale            → fallback
 */
export function resolveWebProject(
  id: number,
  locale: Locale,
): { project: Project; status: TranslationStatus; actualLocale: Locale; originLocale: Locale } | null {
  const current = loadProjects(locale).webProjects.find((project) => project.id === id);
  if (current) {
    const origin = current.originLocale ?? defaultLocale;
    return {
      project: current,
      status: locale === origin ? 'source' : 'translated',
      actualLocale: locale,
      originLocale: origin,
    };
  }

  const defaults = loadProjects(defaultLocale).webProjects.find((project) => project.id === id);
  if (!defaults) return null;

  const origin = defaults.originLocale ?? defaultLocale;
  if (origin !== defaultLocale) {
    const fromOrigin = loadProjects(origin).webProjects.find((project) => project.id === id);
    if (fromOrigin) {
      return {
        project: fromOrigin,
        status: 'fallback',
        actualLocale: origin,
        originLocale: origin,
      };
    }
  }

  return {
    project: defaults,
    status: 'fallback',
    actualLocale: defaultLocale,
    originLocale: origin,
  };
}

export function loadLife(locale: Locale): LifeModule {
  return loadLocalizedModule(lifeModules, locale);
}

/**
 * 在指定 locale 下解析单个 life item，逻辑与 resolveWebProject 对应。
 */
export function resolveLifeItem(
  slug: string,
  locale: Locale,
): { item: LifeItem; status: TranslationStatus; actualLocale: Locale; originLocale: Locale } | null {
  const flatten = (mod: LifeModule) => [...mod.gameData, ...mod.travelData, ...mod.otherData];

  const current = flatten(loadLife(locale)).find((item) => item.id === slug);
  if (current) {
    const origin = current.originLocale ?? defaultLocale;
    return {
      item: current,
      status: locale === origin ? 'source' : 'translated',
      actualLocale: locale,
      originLocale: origin,
    };
  }

  const defaults = flatten(loadLife(defaultLocale)).find((item) => item.id === slug);
  if (!defaults) return null;

  const origin = defaults.originLocale ?? defaultLocale;
  if (origin !== defaultLocale) {
    const fromOrigin = flatten(loadLife(origin)).find((item) => item.id === slug);
    if (fromOrigin) {
      return {
        item: fromOrigin,
        status: 'fallback',
        actualLocale: origin,
        originLocale: origin,
      };
    }
  }

  return {
    item: defaults,
    status: 'fallback',
    actualLocale: defaultLocale,
    originLocale: origin,
  };
}

export function loadExperience(locale: Locale): ExperienceModule {
  return loadLocalizedModule(experienceModules, locale);
}

export function loadFriendLinks(locale: Locale): FriendsModule {
  return loadLocalizedModule(friendLinkModules, locale);
}

export function loadSkills(locale: Locale): SkillsModule {
  return loadLocalizedModule(skillModules, locale);
}

/** 根据 locale 选友链页底部「致谢服务」配置（来源于 site.ts） */
export function loadServices(_locale: Locale): { heading: string; items: ServiceCredit[] } | undefined {
  return siteZH.siteConfig.pages.friends.services;
}

/** 加载 locale 对应的 messages（locales/<locale>.json） */
export async function loadMessages(locale: Locale): Promise<Record<string, unknown>> {
  return loadLocalizedModule(messageModules, locale);
}
