# Music Files

Audio playback is hosted on **Tencent COS** (Hong Kong bucket `arsvine-cdn`,
region `ap-hongkong`) and served from `https://cdn.arsvine.com/realm/audio/...` in
production. The bucket is **public-read / private-write** — do **not** drop
private files here.

Set the CDN base in your environment to switch the player to COS:

```env
NEXT_PUBLIC_MEDIA_CDN=https://cdn.arsvine.com
```

When `NEXT_PUBLIC_MEDIA_CDN` is **unset** (typical local dev), `data/music.ts`
falls back to `/music/<file>` and reads audio from this folder — drop the same
filenames here to test playback offline.

Supported formats: anything the browser's native HTML5 `<audio>` element can
decode (`.mp3`, `.m4a`, `.flac`, `.wav`, `.ogg`).

The playlist itself is configured in [`data/music.ts`](../../data/music.ts) —
add or rename tracks there, no component changes required.

> Audio files in this directory are excluded from git via `.gitignore`.
> Tencent COS bills outbound traffic, so avoid wiring large audio into
> auto-play / loops. Watch the monthly outbound-traffic package usage.
