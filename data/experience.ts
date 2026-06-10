import type { ExperienceItem } from '../types';
import { gallery } from '../lib/cdn';

// ============================================================
// Timeline — Replace with your own education & work history!
// ============================================================
export const experienceData: ExperienceItem[] = [
  {
    id: 'highschool',
    type: 'education',
    duration: '2019 - 2025',
    title: '高中时期',
    location: '宿迁市第一高级中学',
    details: [
      '宿迁市第一高级中学',
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
    title: '大学时光',
    location: '江苏大学',
    details: [
      '江苏大学',
      '计算机科学与技术',
    ],
    alignment: 'left',
    galleryImages: [
      { src: gallery('university-gallery-1.jpg') },
      { src: gallery('university-gallery-2.jpg') },
    ],
  },
  {
    id: 'internship',
    type: 'work',
    duration: '??? - ???',
    title: '实习经历',
    location: '罗德岛',
    details: [
      '罗德岛制药',
      '工程部'
    ],
    alignment: 'left',
    galleryImages: [],
  },
];
