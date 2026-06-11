import type { Project } from '../../types';
import { cover, gallery, post } from '../../lib/cdn';

export const webProjects: Project[] = [
  {
    id: 1,
    title: 'Arsvine Realm',
    description: 'A personal portfolio site built with Next.js.',
    role: 'Design, Development & Iteration',
    year: '2026',
    status: 'shipped',
    tech: ['UI/UX', 'DevOps'],
    highlights: [
      'Sci-fi HUD visual direction',
      'More than 42 animation patterns',
      'Rebuilt on top of a general template',
      'Blended with Hypergryph-inspired aesthetics',
    ],
    link: '#',
    liveUrl: 'https://arsvine.com',
    imageUrl: cover('arsvine-realm-preview.webp'),
    galleryImages: [
      { src: post('arsvine-realm-sceenshot-1.png') },
      { src: post('arsvine-realm-sceenshot-2.png') },
    ],
    articleContent: `Arsvine Realm is this very site. It is built with Next.js, deployed on Vercel, and runs on a Serverless-oriented setup. Visually, it combines sci-fi HUD elements with more than forty kinds of motion treatment, while drawing overall inspiration from Hypergryph's design sensibility.

The project began as a redevelopment of RainMorime, a general portfolio template. From there I added a large amount of custom design and functionality so the site could present my projects and skills in a way that feels more personal. The content spans multiple areas, including web development and game-related work, with the goal of giving visitors a fuller sense of what I care about and what I can build.`,
  },
  {
    id: 2,
    title: 'Endfield Gacha Simulator & Planner',
    description: 'A web tool built with vanilla JS, HTML, and a Python backend to help players plan pulls for Arknights: Endfield.',
    role: 'Full Stack Developer',
    year: '2026',
    status: 'wip',
    tech: ['JS', 'HTML', 'Python'],
    highlights: [
      'Responsive layout',
      'Dark mode support',
    ],
    link: '#',
    liveUrl: 'https://endfield.arsvine.com',
    imageUrl: cover('endfield-planner-preview.png'),
    galleryImages: [
      { src: post('endfield-planner-screenshot-1.png') },
    ],
    articleContent: `The backend is built with Python Flask and served in production with Waitress. It handles banner data and the planning logic. On the frontend, I use vanilla JavaScript for dynamic interaction and responsive layout so the tool remains comfortable to use across different devices.

The project is still in progress. I plan to add more features later, such as account data import and stronger data visualisation. The current link, https://endfield.arsvine.com, is only a placeholder for now and will point to the real deployment later.

The project is split into two pages. The main page focuses on banner simulation, allowing players to simulate pulls across past, current, and even future banners. The other page is a planner that helps players decide how to use their resources toward specific targets. After running Monte Carlo simulations, it produces a score and recommendation.`,
  },
];

export const gameProjects: Project[] = [];

export const earlyProjects: Project[] = [
  {
    id: 3,
    title: 'Early Projects',
    description: 'Assorted remnants from the learning years.',
    role: 'Student',
    year: '201x',
    status: 'archived',
    tech: ['HTML', 'CSS', 'JavaScript', 'Python', 'C++', 'C#', 'Scratch', 'Unity'],
    link: '#',
    imageUrl: cover('gitblock-cover.png'),
    galleryImages: [
      { src: gallery('gitblock-allindo.png') },
    ],
    articleContent: `There were simply too many early projects, and records for most of them are no longer preserved.`,
  },
];

export const learnProjects = earlyProjects;
export const workProjects = [...webProjects, ...gameProjects];

export interface CopyableToken {
  pattern: string;
  label?: string;
}

export const copyableTokens: CopyableToken[] = [
  { pattern: 'arsvine.com', label: 'Main site URL' },
  { pattern: 'www.arsvine.com', label: 'Main site WWW URL' },
  { pattern: 'https://endfield.arsvine.com', label: 'Endfield planner URL, not live yet' },
  { pattern: '2162371684', label: 'QQ account number' },
  { pattern: 'Details', label: 'View details' },
];
