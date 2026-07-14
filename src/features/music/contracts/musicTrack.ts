export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  /** COS / CDN objectKey. Project audio uses realm/audio/... */
  objectKey?: string;
  /** Compatibility for tests and migration data; new catalogs should prefer objectKey. */
  src?: string;
  order?: number;
  date?: string;
  /** Optional duration in seconds. */
  duration?: number;
}
