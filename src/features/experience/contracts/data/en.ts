import type { ExperienceItem } from '@/shared/types';
import { gallery } from '@/shared/lib/cdn';

// ============================================================
// Timeline
// ============================================================
export const experienceData: ExperienceItem[] = [
  {
    id: 'highschool',
    type: 'education',
    duration: '2019 - 2025',
    title: 'High School Years',
    location: 'Suqian No. 1 Senior High School',
    details: [
      'Completed my main high-school studies here, while gradually discovering long-term interests in programming, design, games, and fictional worldbuilding.',
      'That period felt like building basic infrastructure: knowledge, habits, taste, and self-learning slowly took shape.',
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
    duration: '2025 - Present',
    title: 'University Life',
    location: 'Jiangsu University',
    details: [
      'Currently studying Computer Science and Technology, while continuing to push coursework, engineering practice, and personal interests forward in parallel.',
      'Outside class, I mostly work on my personal website, AI workflows, IM persona systems, game development, and small visual experiments.',
      'Zhenjiang is my temporary home, and also the place where many records began settling into Arsvine Realm.',
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
    duration: 'Long-term onboard',
    title: 'Rhodes Island Record',
    location: 'Arknights · Rhodes Island',
    details: [
      'Fictional entry: Rhodes Island Pharmaceuticals is from Arknights, not a real internship or work experience.',
      'As a long-term player and Doctor, my daily work includes tactical deployment, resource planning, event research, and repeated overtime in Stronghold Protocol.',
      'To me, it works more like a spiritual coordinate: maintaining order, ideals, and a stubborn engineering spirit inside a chaotic world.',
    ],
    alignment: 'left',
    galleryImages: [],
  },
];
