import type { ExperienceItem } from '../../types';
import { gallery } from '../../lib/cdn';

export const experienceData: ExperienceItem[] = [
  {
    id: 'highschool',
    type: 'education',
    duration: '2019 - 2025',
    title: '高中時期',
    location: '宿遷市第一高級中學',
    details: [
      '宿遷市第一高級中學',
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
      '江蘇大學',
      '電腦科學與技術',
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
    id: 'internship',
    type: 'work',
    duration: '??? - ???',
    title: '實習經歷',
    location: '羅德島',
    details: [
      '羅德島製藥',
      '工程部',
    ],
    alignment: 'left',
    galleryImages: [],
  },
];
