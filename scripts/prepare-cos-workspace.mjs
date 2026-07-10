import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const WORKSPACE_ROOT = path.join(REPO_ROOT, 'cos-workspace');
const LEGACY_ROOT = path.join(WORKSPACE_ROOT, 'public-root-legacy');
const PUBLIC_ROOT = path.join(WORKSPACE_ROOT, 'public-root');
const META_ROOT = path.join(WORKSPACE_ROOT, '_meta', 'realm');
const CANONICAL_DATE = ['2026', '07', '09'];

const PROJECT_ITEMS = [
  {
    id: 'arsvine-realm',
    title: 'Arsvine Realm',
    description: '一个以个人档案、作品展示与写作入口为核心的 Next.js 个人站。',
    tech: ['Next.js', 'UI/UX', 'Vercel', 'i18n', 'DevOps'],
    collection: 'web-projects',
    date: '2026-01-01',
    cover: 'covers/arsvine-realm-preview.webp',
    gallery: ['posts/arsvine-realm-screenshot-1.png', 'posts/arsvine-realm-screenshot-2.png'],
  },
  {
    id: 'endfield-planner',
    title: '终末地卡池模拟及规划器',
    description: '面向《明日方舟：终末地》的抽卡模拟与资源规划工具。',
    tech: ['JavaScript', 'HTML', 'Python', 'Flask', 'Monte Carlo'],
    collection: 'web-projects',
    date: '2026-01-01',
    cover: 'covers/endfield-planner-preview.png',
    gallery: ['posts/endfield-planner-screenshot-1.png'],
  },
  {
    id: 'early-projects',
    title: '早期项目',
    description: '学习过程中留下的各种实验、半成品和遗产。',
    tech: ['HTML', 'CSS', 'JavaScript', 'Python', 'C++', 'C#', 'Scratch', 'Unity'],
    collection: 'early-projects',
    date: '2019-01-01',
    cover: 'covers/gitblock-cover.png',
    gallery: ['gallery/gitblock-allindo.png'],
  },
];

const LIFE_ITEMS = [
  {
    id: 'arknights',
    title: '明日方舟',
    description: '不只是策略塔防，而是一套关于秩序、灾难、理想与系统设计的长期样本。',
    tech: ['策略', '塔防', '移动端', '官方'],
    collection: 'life-games',
    cover: 'covers/arknights-cover.png',
    gallery: ['gallery/arknights-screenshot-1.png', 'gallery/arknights-screenshot-2.png'],
  },
  {
    id: 'arknights-endfield',
    title: '明日方舟：终末地',
    description: '我期待的不是简单的 3D 化，而是开拓、生产、战斗与秩序重建。',
    tech: ['3D RPG', '策略', '动作', '工厂建设', '跨平台'],
    collection: 'life-games',
    cover: 'covers/endfield-cover.webp',
    gallery: ['gallery/endfield-screenshot-1.webp'],
  },
  {
    id: 'death-stranding',
    title: '死亡搁浅',
    description: '它把行走、负重、孤独和连接做成了可被体验的东西。',
    tech: ['动作', '开放世界', '绳系游戏', 'PS4/PS5'],
    collection: 'life-games',
    cover: 'covers/death-stranding-cover.jpg',
    gallery: ['gallery/death-stranding-screenshot-1.jpg', 'gallery/death-stranding-screenshot-2.jpg'],
  },
  {
    id: 'zhenjiang',
    title: '镇江',
    description: '一座没有强行证明自己的江南老城，安静、松弛，也有自己的褶皱。',
    tech: ['暂居', '旅行'],
    collection: 'life-travel',
    cover: 'covers/zhenjiang-cover.jpg',
    gallery: [
      'gallery/zhenjiang-gallery-1.jpg',
      'gallery/zhenjiang-gallery-2.jpg',
      'gallery/zhenjiang-gallery-3.webp',
      'gallery/zhenjiang-gallery-4.webp',
      'gallery/zhenjiang-gallery-5.webp',
    ],
  },
  {
    id: 'game-dev',
    title: '游戏开发与设计',
    description: '创造自己脑海中的世界，也研究系统、界面、规则和叙事如何共同支撑一个世界。',
    tech: ['编程', '设计'],
    collection: 'life-other',
    cover: 'covers/game-dev-cover.webp',
    gallery: ['gallery/game-dev-gallery-1.png'],
  },
];

const EXPERIENCE_ITEMS = [
  {
    id: 'highschool',
    title: '高中时期',
    location: '宿迁市第一高级中学',
    type: 'education',
    gallery: ['gallery/highschool-gallery-1.jpg', 'gallery/highschool-gallery-2.jpg'],
  },
  {
    id: 'university',
    title: '大学时光',
    location: '江苏大学',
    type: 'education',
    gallery: [
      'gallery/university-gallery-1.jpg',
      'gallery/university-gallery-2.jpg',
      'gallery/photo-ujs-1.webp',
      'gallery/photo-ujs-2.webp',
      'gallery/photo-ujs-3.webp',
      'gallery/photo-ujs-4.webp',
      'gallery/photo-ujs-5.webp',
    ],
  },
];

const LOCAL_LINK_ITEMS = [
  {
    id: 'arning',
    title: '小宁arning',
    description: '给我提供了许多摄影素材，Respect！',
    avatar: 'avatar/avatar-arning-1.webp',
  },
  {
    id: 'may-rain',
    title: '梅莉薇尔·伊芙利特',
    description: '可以留白嘛',
    avatar: 'avatar/avatar-may-rain-1.webp',
  },
];

const AUDIO_ITEMS = [
  {
    file: 'dont-be-so-serious.m4a',
    id: 'dont-be-so-serious',
    title: "Don't Be So Serious",
    artist: 'Low Roar',
  },
  {
    file: 'jane-doe.m4a',
    id: 'jane-doe',
    title: 'Jane Doe',
    artist: 'Unknown Artist',
  },
  {
    file: 'never-feat-evil-neuro.m4a',
    id: 'never-feat-evil-neuro',
    title: 'NEVER (feat. Evil Neuro)',
    artist: 'Neuro-sama',
  },
  {
    file: 'somniomancer-null-set.m4a',
    id: 'somniomancer-null-set',
    title: 'Somniomancer (Null Set)',
    artist: 'Monster Siren Records, Crywolf',
  },
];

function toPosix(value) {
  return value.split(path.sep).join('/');
}

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function normalizeTags(values) {
  return values
    .map((value) => {
      const slug = slugify(value);
      return slug || String(value).trim();
    })
    .filter(Boolean);
}

function makeSource(relativePath) {
  return `public-root/${relativePath}`;
}

function prefixRecordId(record, prefix) {
  return {
    ...record,
    id: `${prefix}-${record.id}`,
  };
}

async function ensureEmptyDir(targetPath) {
  await rm(targetPath, { recursive: true, force: true });
  await mkdir(targetPath, { recursive: true });
}

async function copyFileStrict(sourcePath, destinationPath) {
  await mkdir(path.dirname(destinationPath), { recursive: true });
  await cp(sourcePath, destinationPath, { force: true });
}

async function copyDirectoryContents(sourceDir, destinationDir) {
  await mkdir(destinationDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    await cp(path.join(sourceDir, entry.name), path.join(destinationDir, entry.name), {
      recursive: true,
      force: true,
    });
  }
}

async function buildLegacyIndex(root) {
  const files = new Map();
  async function walk(currentDir) {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (!entry.isFile()) continue;
      files.set(toPosix(path.relative(root, fullPath)), fullPath);
    }
  }
  await walk(root);
  return files;
}

function buildImageDestination(section, slug, variant, ext) {
  return toPosix(path.join('realm', 'images', section, ...CANONICAL_DATE, `${slug}-${variant}${ext}`));
}

async function stageStructuredAssets(legacyFiles) {
  const sourceMap = new Map();

  const stageLegacyAsset = async (legacyRelative, outputRelative) => {
    const sourcePath = legacyFiles.get(legacyRelative);
    if (!sourcePath) {
      throw new Error(`Missing legacy asset: ${legacyRelative}`);
    }
    const destinationPath = path.join(PUBLIC_ROOT, ...outputRelative.split('/'));
    await copyFileStrict(sourcePath, destinationPath);
    sourceMap.set(legacyRelative, makeSource(outputRelative));
    return makeSource(outputRelative);
  };

  const worksRecords = [];
  for (const [index, item] of PROJECT_ITEMS.entries()) {
    const slug = slugify(item.id);
    const coverSource = await stageLegacyAsset(
      item.cover,
      buildImageDestination('works', slug, 'cover', path.extname(item.cover)),
    );

    for (const [galleryIndex, legacyRelative] of item.gallery.entries()) {
      const variant = legacyRelative.startsWith('posts/') ? `shot-${galleryIndex + 1}` : `gallery-${galleryIndex + 1}`;
      await stageLegacyAsset(
        legacyRelative,
        buildImageDestination('works', slug, variant, path.extname(legacyRelative)),
      );
    }

    worksRecords.push({
      id: slug,
      status: 'published',
      title: item.title,
      description: item.description,
      alt: `${item.title} cover`,
      source: coverSource,
      tags: normalizeTags(item.tech),
      collection: item.collection,
      order: index + 1,
      date: item.date,
    });
  }

  const lifeCollections = [];
  const lifeGalleryRecords = [];
  for (const [index, item] of LIFE_ITEMS.entries()) {
    const slug = slugify(item.id);
    const coverSource = await stageLegacyAsset(
      item.cover,
      buildImageDestination('life', slug, 'cover', path.extname(item.cover)),
    );

    const coverRecord = {
      id: slug,
      status: 'published',
        title: item.title,
        description: item.description,
        alt: `${item.title} cover`,
        source: coverSource,
        tags: normalizeTags(item.tech),
        collection: item.collection,
      order: index + 1,
      date: '2026-07-09',
    };
    lifeCollections.push({ cover: coverRecord });

    for (const [galleryIndex, legacyRelative] of item.gallery.entries()) {
      const variant = `gallery-${galleryIndex + 1}`;
      const source = await stageLegacyAsset(
        legacyRelative,
        buildImageDestination('life', slug, variant, path.extname(legacyRelative)),
      );
      lifeGalleryRecords.push({
        id: `${slug}-${variant}`,
        status: 'published',
        title: item.title,
        description: item.description,
        alt: `${item.title} gallery ${galleryIndex + 1}`,
        source,
        tags: normalizeTags(item.tech),
        collection: item.collection,
        order: galleryIndex + 1,
        date: '2026-07-09',
      });
    }
  }

  const experienceRecords = [];
  for (const entry of EXPERIENCE_ITEMS) {
    const slug = slugify(entry.id);
    for (const [index, legacyRelative] of entry.gallery.entries()) {
      const source = await stageLegacyAsset(
        legacyRelative,
        buildImageDestination('experience', slug, `gallery-${index + 1}`, path.extname(legacyRelative)),
      );
      experienceRecords.push({
        id: `${slug}-gallery-${index + 1}`,
        status: 'published',
        title: entry.title,
        description: entry.location,
        alt: `${entry.title} gallery ${index + 1}`,
        source,
        tags: [slugify(entry.type), slugify(entry.location)].filter(Boolean),
        collection: 'experience',
        order: index + 1,
        date: '2026-07-09',
      });
    }
  }

  const linkRecords = [];
  for (const [index, link] of LOCAL_LINK_ITEMS.entries()) {
    const slug = slugify(link.id);
    const source = await stageLegacyAsset(
      link.avatar,
      buildImageDestination('links', slug, 'avatar', path.extname(link.avatar)),
    );
    linkRecords.push({
      id: slug,
      status: 'published',
      title: link.title,
      description: link.description,
      alt: `${link.title} avatar`,
      source,
      tags: ['friend-link'],
      collection: 'links',
      order: index + 1,
      date: '2026-07-09',
    });
  }

  const usedLegacy = new Set(sourceMap.keys());
  for (const [legacyRelative] of legacyFiles) {
    if (usedLegacy.has(legacyRelative)) continue;
    if (legacyRelative.startsWith('fonts/') || legacyRelative.startsWith('music/') || legacyRelative === 'test/echo.txt') {
      continue;
    }
    const parsed = path.posix.parse(legacyRelative);
    await stageLegacyAsset(
      legacyRelative,
      toPosix(path.join('realm', 'images', 'archive', ...CANONICAL_DATE, `${slugify(parsed.name)}${parsed.ext}`)),
    );
  }

  for (const item of AUDIO_ITEMS) {
    const sourcePath = legacyFiles.get(`music/${item.file}`);
    if (!sourcePath) {
      throw new Error(`Missing legacy audio file: music/${item.file}`);
    }
    const destination = toPosix(path.join('realm', 'audio', ...CANONICAL_DATE, `${item.id}${path.extname(item.file)}`));
    await copyFileStrict(sourcePath, path.join(PUBLIC_ROOT, ...destination.split('/')));
    sourceMap.set(`music/${item.file}`, makeSource(destination));
  }

  await copyDirectoryContents(path.join(LEGACY_ROOT, 'fonts'), path.join(PUBLIC_ROOT, 'shared', 'fonts'));
  const cssPath = path.join(PUBLIC_ROOT, 'shared', 'fonts', 'google-fonts.css');
  const css = await readFile(cssPath, 'utf-8');
  await writeFile(cssPath, css.replaceAll('https://cdn.arsvine.com/fonts/', 'https://cdn.arsvine.com/shared/fonts/'));

  const homeRecords = [
    worksRecords[0],
    worksRecords[1],
    lifeCollections[0]?.cover,
    lifeCollections.find((entry) => entry.cover.id === 'zhenjiang')?.cover,
  ].filter(Boolean).map((entry, index) => ({
    ...prefixRecordId(entry, 'home'),
    collection: 'home-featured',
    order: index + 1,
  }));

  const collectionEntries = [
    {
      slug: 'web-projects',
      title: 'Web Projects',
      description: 'Project covers from the portfolio.',
      items: worksRecords.filter((item) => item.collection === 'web-projects').map((item) => prefixRecordId(item, 'collection-web-projects')),
    },
    {
      slug: 'early-projects',
      title: 'Early Projects',
      description: 'Archived learning-era project visuals.',
      items: worksRecords.filter((item) => item.collection === 'early-projects').map((item) => prefixRecordId(item, 'collection-early-projects')),
    },
    {
      slug: 'life-games',
      title: 'Life Games',
      description: 'Game-related gallery images.',
      items: lifeGalleryRecords.filter((item) => item.collection === 'life-games').map((item) => prefixRecordId(item, 'collection-life-games')),
    },
    {
      slug: 'life-travel',
      title: 'Travel',
      description: 'Travel gallery images.',
      items: lifeGalleryRecords.filter((item) => item.collection === 'life-travel').map((item) => prefixRecordId(item, 'collection-life-travel')),
    },
    {
      slug: 'life-other',
      title: 'Other Interests',
      description: 'Other interest gallery images.',
      items: lifeGalleryRecords.filter((item) => item.collection === 'life-other').map((item) => prefixRecordId(item, 'collection-life-other')),
    },
    {
      slug: 'experience',
      title: 'Experience',
      description: 'Timeline-related gallery images.',
      items: experienceRecords.map((item) => prefixRecordId(item, 'collection-experience')),
    },
  ];

  const collections = {
    collections: [
      ...collectionEntries,
    ],
  };

  const audioRecords = AUDIO_ITEMS.map((item, index) => ({
    id: item.id,
    status: 'published',
    title: item.title,
    artist: item.artist,
    source: makeSource(toPosix(path.join('realm', 'audio', ...CANONICAL_DATE, `${item.id}${path.extname(item.file)}`))),
    order: index + 1,
    date: '2026-07-09',
  }));

  return {
    homeRecords,
    worksRecords,
    collections,
    linkRecords,
    audioRecords,
    legacyAssetSources: Object.fromEntries(sourceMap),
  };
}

async function verifyWorkspace(root) {
  const requiredDirs = ['fonts', 'music', 'covers', 'gallery', 'posts', 'avatar'];
  for (const dir of requiredDirs) {
    const dirPath = path.join(root, dir);
    const info = await stat(dirPath).catch(() => null);
    if (!info?.isDirectory()) {
      throw new Error(`Missing required legacy directory: ${dirPath}`);
    }
  }
}

async function main() {
  await verifyWorkspace(LEGACY_ROOT);
  await ensureEmptyDir(PUBLIC_ROOT);
  await mkdir(META_ROOT, { recursive: true });

  const legacyFiles = await buildLegacyIndex(LEGACY_ROOT);
  const generated = await stageStructuredAssets(legacyFiles);

  await writeFile(path.join(META_ROOT, 'home.json'), `${JSON.stringify(generated.homeRecords, null, 2)}\n`);
  await writeFile(path.join(META_ROOT, 'works.json'), `${JSON.stringify(generated.worksRecords, null, 2)}\n`);
  await writeFile(path.join(META_ROOT, 'collections.json'), `${JSON.stringify(generated.collections, null, 2)}\n`);
  await writeFile(path.join(META_ROOT, 'links.json'), `${JSON.stringify(generated.linkRecords, null, 2)}\n`);
  await writeFile(path.join(META_ROOT, 'audio.json'), `${JSON.stringify(generated.audioRecords, null, 2)}\n`);
  await writeFile(path.join(META_ROOT, 'legacy-asset-sources.json'), `${JSON.stringify(generated.legacyAssetSources, null, 2)}\n`);

  console.log('[prepare-cos-workspace] prepared public-root and catalog metadata');
}

main().catch((error) => {
  console.error('[prepare-cos-workspace] FAILED:', error.message);
  process.exit(1);
});
