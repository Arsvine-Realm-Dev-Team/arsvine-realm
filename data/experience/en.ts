import type { ExperienceItem } from '../../types';
import { gallery } from '../../lib/cdn';

export const experienceData: ExperienceItem[] = [
  {
    id: 'highschool',
    type: 'education',
    duration: '2019 - 2025',
    title: 'High School Years',
    location: 'Suqian No.1 Senior High School',
    details: [
      'Suqian No.1 Senior High School',
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
    title: 'University Days',
    location: 'Jiangsu University',
    details: [
      'Jiangsu University',
      'Computer Science and Technology',
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
    title: 'Internship',
    location: 'Rhodes Island',
    details: [
      'Rhodes Island Pharmaceutical',
      'Engineering Department',
    ],
    alignment: 'left',
    galleryImages: [],
  },
];
