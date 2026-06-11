// ============================================================
// Data Types
// ============================================================

export interface GalleryImage {
  src: string;
  caption?: string;
  isMobile?: boolean;
  invertedSrc?: string;
}

export interface Project {
  id: number;
  title: string;
  description: string;
  tech: string[];
  link: string;
  imageUrl: string;
  galleryImages: GalleryImage[];
  articleContent?: string;
  role?: string;
  year?: string;
  highlights?: string[];
  liveUrl?: string;
  githubUrl?: string;
  videoUrl?: string | string[];
  status?: 'shipped' | 'wip' | 'archived';
  isConfidential?: boolean;
  noHero?: boolean;
  invertedImageUrl?: string;
}

export interface LifeItemLink {
  href: string;
  text: string;
  sub: string;
}

export interface LifeItem {
  id: string;
  title: string;
  description: string;
  tech: string[];
  link?: string;
  imageUrl: string;
  galleryImages: GalleryImage[];
  articleContent?: string;
  links?: LifeItemLink[];
}

export interface ExperienceItem {
  id: string;
  type: 'education' | 'work' | 'volunteer';
  duration: string;
  title: string;
  location: string;
  details: string[];
  alignment: 'left' | 'right';
  galleryImages: GalleryImage[];
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  articleContent?: string;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  tags: string[];
  readingTime: string;
  /** 置顶到博客列表最前；feed/sitemap 仍按日期排序 */
  pinned?: boolean;
}

export interface FriendLink {
  id: string;
  name: string;
  description: string;
  url: string;
  avatar: string;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
  relatedProjects: number[];
  description: string;
}

export interface SkillCategory {
  id: string;
  name: string;
  skills: Skill[];
}

// ============================================================
// Music Player
// ============================================================

export interface MusicTrack {
  /** 歌曲标题 */
  title: string;
  /** 艺术家 */
  artist: string;
  /** 音频文件路径（如 /music/foo.m4a）或完整外链 URL，浏览器原生 HTML5 <audio> 支持的格式皆可（mp3/m4a/flac/wav/ogg 等） */
  src: string;
}

// ============================================================
// Site Configuration
// ============================================================

export interface SiteAssets {
  /** 浏览器 favicon */
  icon: string;
  /** og:image */
  ogImage: string;
  /** twitter:image */
  twitterImage: string;
}

export interface SiteFontPreconnect {
  href: string;
  crossOrigin?: 'anonymous';
}

export interface SiteFonts {
  /** preconnect 列表。当前统一指向自有 CDN（cdn.arsvine.com） */
  cdnPreconnect: SiteFontPreconnect[];
  /** 真理之源：完整的 Google Fonts CSS URL。仅供 scripts/fetch-google-fonts.mjs
   *  读取并抓取，浏览器不直接加载它。修改后需重跑脚本 + 重新上传 COS。 */
  googleStylesheet: string;
  /** 浏览器实际加载的 stylesheet href。由 scripts/fetch-google-fonts.mjs 抓取
   *  googleStylesheet 后改写 url 生成，托管在 cdn.arsvine.com/fonts/。 */
  cdnStylesheet: string;
}

export interface SiteLocale {
  /** <html lang> */
  htmlLang: string;
  /** og:locale */
  ogLocale: string;
  /** RSS <language> */
  rssLanguage: string;
}

/** /friends 页底部「致谢服务」区一条目：使用了对方提供的接口/服务，不属于朋友 */
export interface ServiceCredit {
  /** 服务方展示名 */
  name: string;
  /** 一行说明文案 */
  description: string;
  /** 服务方主页 / 项目主页 */
  url: string;
  /** Logo / 头像图 URL */
  avatar: string;
}

export interface SitePages {
  /** /content 页 SEO description（无详情视图打开时） */
  content: { description: string };
  /**
   * /friends 页：
   *  - heading：两列友链区标题
   *  - services：底部"致谢服务"区，可选；缺省 / items 为空则整段不渲染
   */
  friends: {
    title: string;
    description: string;
    heading: string;
    services?: { heading: string; items: ServiceCredit[] };
  };
  /** /copyright 页 title / description */
  copyright: { title: string; description: string };
}

// ============================================================
// Hook Return Types
// ============================================================

export type ColumnPhase = 'idle' | 'retracting' | 'expanding';

export interface AnimationSequenceState {
  isLoading: boolean;
  mainVisible: boolean;
  linesAnimated: boolean;
  hudVisible: boolean;
  leftPanelAnimated: boolean;
  textVisible: boolean;
  animationsComplete: boolean;
  leversVisible: boolean;
  pulsingNormalIndices: number[] | null;
  pulsingReverseIndices: number[] | null;
  handleLoadingComplete: () => void;
  columnPhase: ColumnPhase;
  retractColumns: (onComplete: () => void) => void;
  expandColumns: (onComplete?: () => void) => void;
}

export interface PowerSystemState {
  powerLevel: number;
  isInverted: boolean;
  isTesseractActivated: boolean;
  isDischarging: boolean;
  chargeBattery: () => void;
  handleDischargeLeverPull: () => void;
  handleActivateTesseract: () => void;
  deactivateTesseract: () => void;
}

export interface RealtimeStatsState {
  currentTime: string;
  runtime: string;
  totalVisits: number | string;
  currentVisitors: number;
}

export interface FateTypingState {
  displayedFateText: string;
  isFateTypingActive: boolean;
}

export interface EnvData {
  temp: number;
  rad: number;
  o2: number;
  pollution: string;
  acidRain: string;
}

export interface EnvParamsTypingState {
  displayedEnvParams: string;
  isEnvParamsTyping: boolean;
  envData: EnvData | null;
  envDataVersion: number;
}

export interface ColumnHoverState {
  randomHudTexts: string[];
  branchText1: string;
  branchText2: string;
  branchText3: string;
  branchText4: string;
  handleColumnMouseEnter: (index: number) => void;
  handleColumnMouseLeave: (index: number) => void;
}

// ============================================================
// Context Type
// ============================================================

export interface AppContextValue
  extends AnimationSequenceState,
    PowerSystemState,
    RealtimeStatsState,
    FateTypingState,
    EnvParamsTypingState,
    ColumnHoverState {}

// ============================================================
// Component Props
// ============================================================

export interface NavLink {
  label: string;
  target: string;
}
