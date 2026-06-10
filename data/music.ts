import type { MusicTrack } from '../types';
import { music } from '../lib/cdn';

// ============================================================
// Music Playlist
// ------------------------------------------------------------
// 音频文件托管在腾讯云 COS（香港桶 `arsvine-cdn`），通过
// `cdn.arsvine.com` 对外。所有 src 通过 lib/cdn.ts 的 `music()`
// helper 生成 `${NEXT_PUBLIC_MEDIA_CDN}/music/<file>`。
//
// 当 `NEXT_PUBLIC_MEDIA_CDN` 未设置（本地 dev 常见），src 退化为
// 相对路径 `/music/<file>`，需要本地 `public/music/` 下放同名
// 文件（已被 .gitignore 排除）才能播放。
//
// 文件名约定：小写、连字符分隔、去除空格 / 引号 / 括号，避免
// URL 编码与跨平台命名问题。
// ============================================================

export const musicPlaylist: MusicTrack[] = [
  {
    title: 'JANE DOE',
    artist: '米津玄師, 宇多田ヒカル',
    src: music('jane-doe.m4a'),
  },
  {
    title: "Don't Be So Serious",
    artist: 'Low Roar',
    src: music('dont-be-so-serious.m4a'),
  },
  {
    title: 'NEVER (feat. Evil Neuro)',
    artist: 'Neuro-sama, Evil Neuro',
    src: music('never-feat-evil-neuro.m4a'),
  },
];
