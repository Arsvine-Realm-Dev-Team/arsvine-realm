# Asset Distribution and Publishing

## Boundary

`public/` is reserved for identity and boot-critical files: the avatar/logo, favicons, PWA icons and manifest, and required local display fonts. Owned content images, audio, QR images, decorative titles, maps, and textures belong in Tencent COS. Explicit third-party avatars may remain external URLs.

Application data stores stable `catalogKey` identities. A private versioned catalog resolves them to immutable hashed `realm/...` or `shared/...` object keys during SSG/ISR. Site-shell decoration uses a sanitized public manifest:

```text
realm/site-catalog/current.json
realm/site-catalog/versions/<version>/assets.json
```

The public manifest contains only object keys and display metadata. Missing manifests or entries remove optional decoration and never block content or navigation.

The public bucket must allow `GET`/`HEAD` CORS requests from `https://arsvine.com`, its intended subdomains, and the documented local `http://dev.arsvine.com` origin. Keep the Referer allowlist aligned with the same origins. If the CDN caches CORS responses, include the request `Origin` in its cache key (or honour `Vary: Origin`); otherwise a production response can poison the local manifest cache.

## Local workflow

Prepare and build without publishing a pointer:

```bash
pnpm assets:prepare
pnpm assets:build
pnpm assets:publish -- --dry-run
```

Publishing requires `COS_PUBLIC_BUCKET`, `COS_PUBLIC_REGION`, the documented private COS variables, `COS_SECRET_ID`, `COS_SECRET_KEY`, `NEXT_PUBLIC_SITE_URL`, and `REVALIDATE_SECRET`. `COS_SESSION_TOKEN` and `COSCLI_PATH` are optional. Credentials are passed directly to COSCLI with `--init-skip`; never run `coscli config init`.

```bash
pnpm assets:publish
pnpm assets:publish -- --rollback 20260710T120000Z
```

The command uploads immutable objects and catalogs, verifies both version manifests, switches public/private pointers last, then calls `/api/revalidate-assets`. A failed upload or verification does not switch pointers. A failed revalidation leaves the previous rendered pages available and can be retried.

## Initial migration

Keep local fallbacks until every site-shell catalog key has been published and verified through `cdn.arsvine.com`. After production verification, remove the corresponding files from `public/`. Future replacements retain the same catalog key, publish a new hashed object, switch the pointer, and require no code change.
