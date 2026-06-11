import type { Project } from '../../types';
import { cover, gallery, post } from '../../lib/cdn';

export const webProjects: Project[] = [
  {
    id: 1,
    title: 'Arsvine Realm',
    description: '一個使用 Next.js 建構的個人作品集網站（Portfolio）。',
    role: '設計 / 開發 / 再改造',
    year: '2026',
    status: 'shipped',
    tech: ['UI/UX', 'DevOps'],
    highlights: [
      '科幻風格 HUD 設計',
      '超過 42 種動畫樣式',
      '基於通用模板再開發',
      '融合鷹角設計美學',
    ],
    link: '#',
    liveUrl: 'https://arsvine.com',
    imageUrl: cover('arsvine-realm-preview.webp'),
    galleryImages: [
      { src: post('arsvine-realm-sceenshot-1.png') },
      { src: post('arsvine-realm-sceenshot-2.png') },
    ],
    articleContent: `Arsvine Realm，也就是本站。使用 Next.js 建構，部署在 Vercel 上，採用 Serverless 架構。設計上融合了科幻風格的 HUD 元素，提供超過 42 種動畫樣式，整體靈感則來自鷹角的美學風格。

本專案基於通用個人作品集模板 RainMorime 再開發而成，額外加入了大量自訂設計與功能，用來展示我的專案與技能。網站內容涵蓋多個領域，包括 Web 開發、遊戲開發等，希望讓訪客能更完整地了解我的能力與經歷。`,
  },
  {
    id: 2,
    title: '終末地卡池模擬及規劃器',
    description: '一個基於原生 JS 與 HTML，搭配 Python 後端的網頁工具，幫助玩家進行《明日方舟：終末地》的卡池規劃。',
    role: 'Full Stack Developer',
    year: '2026',
    status: 'wip',
    tech: ['JS', 'HTML', 'Python'],
    highlights: [
      '響應式設計',
      '支援深色模式',
    ],
    link: '#',
    liveUrl: 'https://endfield.arsvine.com',
    imageUrl: cover('endfield-planner-preview.png'),
    galleryImages: [
      { src: post('endfield-planner-screenshot-1.png') },
    ],
    articleContent: `後端使用 Python Flask 建構 API，並由 Waitress 作為生產伺服器，負責處理卡池資料與規劃演算法。前端則以原生 JavaScript 完成動態互動與響應式版面，確保在各類裝置上都能保持良好體驗。

目前專案仍在開發中，後續預計加入更多功能，例如使用者帳號資料匯入系統、資料視覺化等。現在頁面上提供的 https://endfield.arsvine.com 仍是占位地址，之後會部署正式版本。

專案分成兩個頁面。主頁面提供卡池模擬功能，玩家可以選擇往期、當期甚至未來卡池進行抽卡模擬；另一個頁面則是規劃器，協助玩家根據自身資源與目標制定更合適的抽卡策略，系統會在執行蒙地卡羅模擬後給出評分與建議。`,
  },
];

export const gameProjects: Project[] = [];

export const earlyProjects: Project[] = [
  {
    id: 3,
    title: '早期專案',
    description: '學習過程中留下來的各種遺產。',
    role: 'Student',
    year: '201x',
    status: 'archived',
    tech: ['HTML', 'CSS', 'JavaScript', 'Python', 'C++', 'C#', 'Scratch', 'Unity'],
    link: '#',
    imageUrl: cover('gitblock-cover.png'),
    galleryImages: [
      { src: gallery('gitblock-allindo.png') },
    ],
    articleContent: `早期專案實在太多了，多數也沒有完整保留下來。`,
  },
];

export const learnProjects = earlyProjects;
export const workProjects = [...webProjects, ...gameProjects];

export interface CopyableToken {
  pattern: string;
  label?: string;
}

export const copyableTokens: CopyableToken[] = [
  { pattern: 'arsvine.com', label: '主站地址' },
  { pattern: 'www.arsvine.com', label: '主站 WWW 地址' },
  { pattern: 'https://endfield.arsvine.com', label: '終末地規劃器地址，尚未上線' },
  { pattern: '2162371684', label: '個人 QQ 號' },
  { pattern: 'Details', label: '查看詳情' },
];
