import type { AssetReference, ExternalAssetReference, ManagedAssetReference } from '../types';

export const DEFAULT_CDN_BASE = 'https://cdn.arsvine.com';
export const REALM_NAMESPACE = 'realm/';
export const SHARED_NAMESPACE = 'shared/';

export const IMAGE_PRESET_PARAMS = {
  thumb: 'eo-img.resize=w/320&eo-img.format=webp',
  card: 'eo-img.resize=w/720&eo-img.format=webp',
  large: 'eo-img.resize=l/1800&eo-img.format=webp',
  blur: 'eo-img.resize=w/32&eo-img.format=webp',
  rawDisplay: 'eo-img.format=webp',
  thumbAvif: 'eo-img.resize=w/320&eo-img.format=avif',
  cardAvif: 'eo-img.resize=w/720&eo-img.format=avif',
  largeAvif: 'eo-img.resize=l/1800&eo-img.format=avif',
} as const;

export type ImagePreset = keyof typeof IMAGE_PRESET_PARAMS;

const AVIF_FALLBACK_PRESET: Partial<Record<ImagePreset, ImagePreset>> = {
  thumb: 'thumbAvif',
  card: 'cardAvif',
  large: 'largeAvif',
};

const LEGACY_MEDIA_CDN = process.env.NEXT_PUBLIC_CDN_BASE || DEFAULT_CDN_BASE;

export function normalizeCdnBase(base = process.env.NEXT_PUBLIC_CDN_BASE || DEFAULT_CDN_BASE) {
  return base.replace(/\/+$/, '');
}

export function normalizeObjectKey(objectKey: string) {
  return objectKey.replace(/^\/+/, '');
}

export function hasAllowedCdnNamespace(objectKey: string) {
  const normalized = normalizeObjectKey(objectKey);
  return normalized.startsWith(REALM_NAMESPACE) || normalized.startsWith(SHARED_NAMESPACE);
}

export function isManagedObjectKey(value: string) {
  return hasAllowedCdnNamespace(value);
}

export function isManagedAssetReference(value: AssetReference): value is ManagedAssetReference {
  return typeof value === 'object' && !!value && 'objectKey' in value;
}

export function isExternalAssetReference(value: AssetReference): value is ExternalAssetReference {
  return typeof value === 'object' && !!value && 'url' in value;
}

export function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export function assertAllowedManagedObjectKey(objectKey: string) {
  const normalized = normalizeObjectKey(objectKey);
  if (!hasAllowedCdnNamespace(normalized)) {
    throw new Error(`Unsupported CDN objectKey namespace: ${objectKey}`);
  }
  return normalized;
}

export function managedAsset(objectKey: string, meta: Omit<ManagedAssetReference, 'objectKey'> = {}): ManagedAssetReference {
  return {
    objectKey: assertAllowedManagedObjectKey(objectKey),
    ...meta,
  };
}

export function externalAsset(url: string, meta: Omit<ExternalAssetReference, 'url'> = {}): ExternalAssetReference {
  return { url, ...meta };
}

export function buildManagedAssetUrl(objectKey: string) {
  const cleanKey = assertAllowedManagedObjectKey(objectKey);
  return `${normalizeCdnBase()}/${cleanKey}`;
}

export function buildImageUrl(objectKey: string, preset: ImagePreset) {
  const cleanKey = assertAllowedManagedObjectKey(objectKey);
  return `${normalizeCdnBase()}/${cleanKey}?${IMAGE_PRESET_PARAMS[preset]}`;
}

export function buildImagePictureSources(objectKey: string, preset: ImagePreset) {
  const cleanKey = assertAllowedManagedObjectKey(objectKey);
  const webpUrl = buildImageUrl(cleanKey, preset);
  const avifPreset = AVIF_FALLBACK_PRESET[preset];
  return {
    avifUrl: avifPreset ? buildImageUrl(cleanKey, avifPreset) : null,
    webpUrl,
  };
}

export function resolveRawAssetUrl(asset: AssetReference | null | undefined) {
  if (!asset) {
    return '';
  }

  if (typeof asset === 'string') {
    if (!asset) {
      return '';
    }
    if (isAbsoluteUrl(asset) || asset.startsWith('/')) {
      return asset;
    }
    if (isManagedObjectKey(asset)) {
      return buildManagedAssetUrl(asset);
    }
    return `${normalizeCdnBase(LEGACY_MEDIA_CDN)}/${normalizeObjectKey(asset)}`;
  }

  if (isManagedAssetReference(asset)) {
    return buildManagedAssetUrl(asset.objectKey);
  }

  if (isExternalAssetReference(asset)) {
    return asset.url;
  }

  return '';
}

export function resolveImageUrl(asset: AssetReference | null | undefined, preset: ImagePreset) {
  if (!asset) {
    return '';
  }

  if (typeof asset === 'string') {
    if (isAbsoluteUrl(asset) || asset.startsWith('/')) {
      return asset;
    }
    if (isManagedObjectKey(asset)) {
      return buildImageUrl(asset, preset);
    }
    return `${normalizeCdnBase(LEGACY_MEDIA_CDN)}/${normalizeObjectKey(asset)}`;
  }

  if (isManagedAssetReference(asset)) {
    return buildImageUrl(asset.objectKey, preset);
  }

  if (isExternalAssetReference(asset)) {
    return asset.url;
  }

  return '';
}

export function resolveImagePictureSources(asset: AssetReference | null | undefined, preset: ImagePreset) {
  if (!asset) {
    return null;
  }

  if (typeof asset === 'string') {
    if (isManagedObjectKey(asset)) {
      return buildImagePictureSources(asset, preset);
    }
    return null;
  }

  if (isManagedAssetReference(asset)) {
    return buildImagePictureSources(asset.objectKey, preset);
  }

  return null;
}

export function resolveAssetAlt(asset: AssetReference | null | undefined, fallback = '') {
  if (!asset || typeof asset === 'string') {
    return fallback;
  }

  return asset.alt || fallback;
}

export function rawSharedAsset(key: string) {
  return buildManagedAssetUrl(`shared/${normalizeObjectKey(key)}`);
}

export function rawRealmAsset(key: string) {
  return buildManagedAssetUrl(`realm/${normalizeObjectKey(key)}`);
}

// Legacy helpers are kept only to avoid breaking existing static content before
// the canonical realm/shared objectKey inventory is uploaded.
export const cdn = (key: string): string => `${normalizeCdnBase(LEGACY_MEDIA_CDN)}/${normalizeObjectKey(key)}`;
export const cover = (key: string): string => cdn(`covers/${key}`);
export const gallery = (key: string): string => cdn(`gallery/${key}`);
export const post = (key: string): string => cdn(`posts/${key}`);
export const avatar = (key: string): string => cdn(`avatar/${key}`);
export const music = (key: string): string => cdn(`music/${key}`);
export const asset = (key: string): string => cdn(`assets/${key}`);
export const font = (key: string): string => rawSharedAsset(`fonts/${key}`);
