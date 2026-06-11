# scripts/images

Drop image files here, then run:

```bash
node scripts/convert-images.mjs              # convert all to WebP (q=75), output to scripts/images/out
node scripts/convert-images.mjs jpg          # convert all to JPG (q=80, mozjpeg, 4:2:0)
node scripts/convert-images.mjs avif --quality 50
node scripts/convert-images.mjs --help
```

Source files are never modified; outputs go to `scripts/images/out/` (preserving subdirectory structure). Re-runs skip files whose output already exists — pass `--overwrite` to force re-encode.

`scripts/images/out/` is gitignored. The `images/` directory itself stays committed via `.gitkeep`.
