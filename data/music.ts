import type { MusicTrack } from '../types';

// ============================================================
// Music Playlist
// ------------------------------------------------------------
// Audio files are hosted on Tencent COS (Hong Kong bucket
// `arsvine-cdn`, region `ap-hongkong`) and served from
// `cdn.arsvine.com` in production. Set
//   NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
// in the deployment environment to switch playback to COS.
//
// When `NEXT_PUBLIC_MEDIA_CDN` is unset (typical local dev), `src`
// falls back to the relative `/music/...` path under `public/`, which
// keeps the player working without an internet round-trip.
//
// Supported formats: anything decodable by the browser's native HTML5
// <audio> element (mp3 / m4a / flac / wav / ogg). Local files in
// public/music/ are gitignored by project convention.
// ============================================================

const MEDIA_CDN = process.env.NEXT_PUBLIC_MEDIA_CDN || '';
const track = (file: string): string => `${MEDIA_CDN}/music/${file}`;

export const musicPlaylist: MusicTrack[] = [
  {
    title: 'JANE DOE',
    artist: '米津玄師, 宇多田ヒカル',
    src: track('JANE DOE.m4a'),
  },
  {
    title: "Don't Be So Serious",
    artist: 'Low Roar',
    src: track("Don't Be So Serious.m4a"),
  },
  {
    title: 'NEVER (feat. Evil Neuro)',
    artist: 'Neuro-sama, Evil Neuro',
    src: track('NEVER (feat. Evil Neuro).m4a'),
  },
];
