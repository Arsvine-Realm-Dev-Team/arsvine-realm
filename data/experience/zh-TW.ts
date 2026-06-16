import type { ExperienceItem } from '../../types';
import { gallery } from '../../lib/cdn';

// ============================================================
// Timeline
// ============================================================
export const experienceData: ExperienceItem[] = [
  {
    id: 'highschool',
    type: 'education',
    duration: '2019 - 2025',
    title: '高中時期',
    location: '宿遷市第一高級中學',
    details: [
      '在這裡完成了高中階段的主要學習，也逐漸確定了對程式、設計、遊戲與架空寫作的長期興趣。',
      '那段時間更像一段基礎設施建設：知識、習慣、審美與自學能力，都在緩慢成形。',
    ],
    alignment: 'right',
    galleryImages: [
      { src: gallery('highschool-gallery-1.jpg') },
      { src: gallery('highschool-gallery-2.jpg') },
    ],
  },
  {
    id: 'university',
    type: 'education',
    duration: '2025 - 至今',
    title: '大學時光',
    location: '江蘇大學',
    details: [
      '電腦科學與技術專業在讀，繼續把課程學習、工程實踐和個人興趣並行推進。',
      '課外主要折騰個人網站、AI 工作流、IM 擬人系統、遊戲開發與一些審美實驗。',
      '鎮江是暫居地，也是很多記錄開始沉澱成 Arsvine Realm 的地方。',
    ],
    alignment: 'left',
    galleryImages: [
      { src: gallery('university-gallery-1.jpg') },
      { src: gallery('university-gallery-2.jpg') },
      { src: gallery('photo-ujs-1.webp') },
      { src: gallery('photo-ujs-2.webp') },
      { src: gallery('photo-ujs-3.webp') },
      { src: gallery('photo-ujs-4.webp') },
      { src: gallery('photo-ujs-5.webp') },
    ],
  },
  {
    id: 'rhodes-island',
    type: 'work',
    duration: '長期在艦',
    title: '羅德島記錄',
    location: '《明日方舟》 · 羅德島',
    details: [
      '虛構經歷：羅德島製藥來自《明日方舟》，並非真實實習或工作經歷。',
      '作為長期玩家與博士，日常內容包括戰術部署、資源規劃、活動研究，以及在衛戍協議裡反覆加班。',
      '它更像一個精神座標：在混亂世界中維持秩序、理想和一點不服輸的工程精神。',
    ],
    alignment: 'left',
    galleryImages: [],
  },
];
