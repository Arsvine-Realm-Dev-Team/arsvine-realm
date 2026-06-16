import type { Project } from '../../types';
import { cover, gallery, post } from '../../lib/cdn';

// ============================================================
// Web / Frontend Projects
// ============================================================
export const webProjects: Project[] = [
  {
    id: 1,
    title: 'Arsvine Realm',
    description: '一个使用 Next.js 构建的个人作品集网站 （Portfolio）',
    role: 'Design & Development & Modification',
    year: '2026',
    status: 'shipped',
    tech: ['UI/UX', 'DevOps'],
    highlights: [
      '科幻风格 HUD 设计',
      '超 42 种动画样式',
      '基于通用模板再开发',
      '融合鹰角设计美学',
    ],
    link: '#',
    liveUrl: '',
    imageUrl: cover('arsvine-realm-preview.webp'),
    galleryImages: [
      { src: post('arsvine-realm-sceenshot-1.png') },
      { src: post('arsvine-realm-sceenshot-2.png') },
    ],
    articleContent: `Arsvine Realm，即本站。使用 Next.js 构建，部署在 Vercel 上，采用 Serverless 架构。设计上融合了科幻风格的 HUD 元素，提供了超过 42 种动画样式，整体设计灵感来源于鹰角的美学风格。

项目基于一个通用的个人作品集模板 RainMorime 进行再开发，添加了大量自定义设计和功能，以展示个人项目和技能。网站内容涵盖了多个领域的项目，包括 Web 开发、游戏开发等，旨在为访客提供一个全面了解个人能力和经历的平台。`,
  },
  {
    id: 2,
    title: '终末地卡池模拟及规划器',
    description: '一个基于原生 JS 与 HTML，使用 Python 后端的网页，帮助玩家进行《明日方舟：终末地》中的卡池规划',
    role: 'Full Stack Developer',
    year: '2026',
    status: 'wip',
    tech: ['JS', 'HTML', 'Python'],
    highlights: [
      '响应式设计',
      '深色模式支持',
    ],
    link: '#',
    liveUrl: '',
    imageUrl: cover('endfield-planner-preview.png'),
    galleryImages: [
      { src: post('endfield-planner-screenshot-1.png') },
    ],
    articleContent: `使用 Python Flask 构建后端 API，Waitress 作为生产服务器，处理卡池数据和规划算法。前端使用原生 JavaScript 实现动态交互和响应式布局，确保在各种设备上都有良好体验。
    
    目前项目处于开发中，计划后续添加更多功能，如用户账户数据导入系统、数据可视化等。当前页面提供的链接 https://endfield.arsvine.com 是占位地址，后续会部署正式版本。
    
    项目分为两个页面，主页面提供卡池模拟功能，用户可以选择往期、当期甚至未来卡池进行抽卡模拟。另一个页面提供规划器功能，帮助玩家根据自己的资源和目标进行最优抽卡策略规划，系统在进行蒙特卡洛模拟后给出评分和建议。`,
  },
];

// ============================================================
// Game / Creative Projects
// ============================================================
export const gameProjects: Project[] = [];

// ============================================================
// Early / Learning Projects
// ============================================================
export const earlyProjects: Project[] = [
  {
    id: 3,
    title: '早期项目',
    description: '学习过程中留下的遗产，各种各样',
    role: 'Student',
    year: '201x',
    status: 'archived',
    tech: ['HTML', 'CSS', 'JavaScript', 'Python', 'C++', 'C#', 'Scratch', 'Unity'],
    link: '#',
    imageUrl: cover('gitblock-cover.png'),
    galleryImages: [
      { src: gallery('gitblock-allindo.png') },
    ],
    articleContent: `有太多早期项目，多数也没有保留记录了。`,
  },
];

export const learnProjects = earlyProjects;
export const workProjects = [...webProjects, ...gameProjects];

// ============================================================
// 详情页正文里需要被识别为"可复制"的关键词。
// 当 articleContent 文本中出现下列任何 pattern 字符串时，会被
// 自动渲染为"点击复制"按钮（保留 Markdown 链接 [text](url) 的
// 解析能力），无需手写额外 Markdown。
//
// 把你的服务器 IP / QQ 群号 / Discord 邀请码 / 邮箱别名等加在这里。
// 数组为空则只保留 Markdown 链接解析能力。
// ============================================================
export interface CopyableToken {
  /** 要匹配的字符串（按完整字面量匹配，特殊字符会自动正则转义） */
  pattern: string;
  /** 鼠标悬浮提示，可选 */
  label?: string;
}

export const copyableTokens: CopyableToken[] = [
  { pattern: 'arsvine.com', label: '主站地址' },
  { pattern: 'www.arsvine.com', label: '主站 WWW 地址' },
  { pattern: 'https://endfield.arsvine.com', label: '终末地规划器地址，暂未上线' },
  { pattern: '2162371684', label: '个人 QQ 号' },
  { pattern: 'Details', label: '查看详情' },
];
