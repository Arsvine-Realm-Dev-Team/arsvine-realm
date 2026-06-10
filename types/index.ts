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
  /** preconnect 域名列表 */
  preconnect: SiteFontPreconnect[];
  /** 主样式表 href（如 Google Fonts CSS） */
  stylesheet: string;
}

export interface SiteLocale {
  /** <html lang> */
  htmlLang: string;
  /** og:locale */
  ogLocale: string;
  /** RSS <language> */
  rssLanguage: string;
}

export interface SitePages {
  /** /content 页 SEO description（无详情视图打开时） */
  content: { description: string };
  /** /friends 页 title / description / 顶部 heading */
  friends: { title: string; description: string; heading: string };
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
