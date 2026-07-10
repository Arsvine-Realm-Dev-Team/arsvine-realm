import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/LazyImage.module.scss';
import {
  resolveAssetAlt,
  resolveImagePictureSources,
  resolveImageUrl,
  type ImagePreset,
} from '../../lib/cdn';

const QUALITY_PRESET_MAP: Record<string, ImagePreset> = {
  low: 'thumb',
  medium: 'card',
  high: 'large',
};

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  thumbnailSrc = null, 
  onLoad = null,
  enableWebP = true,
  quality = 'medium', // low, medium, high
  preset = null,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(thumbnailSrc || null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const effectivePreset = preset || QUALITY_PRESET_MAP[quality] || 'card';
  const pictureSources = resolveImagePictureSources(src, effectivePreset);
  const resolvedAlt = resolveAssetAlt(src, alt);

  // Generate processed image URL with quality parameters.
  // EO 参数统一由 lib/cdn.ts 里的固定 preset 映射控制。
  const getProcessedImageUrl = (originalUrl, requestedPreset) => {
    return resolveImageUrl(originalUrl, requestedPreset);
  };

  const getThumbnailUrl = (originalUrl) => {
    return resolveImageUrl(originalUrl, 'blur');
  };

  // Intersection Observer 用于检测图片是否进入视窗
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // 当图片进入视窗时开始渐进式加载
  useEffect(() => {
    if (!isInView) return;

    const loadImage = async () => {
      // 如果没有提供缩略图，先加载低质量版本
      if (!thumbnailSrc) {
        const thumbnailUrl = getThumbnailUrl(src);
        setCurrentSrc(thumbnailUrl);
        
        // 预加载缩略图
        const thumbnailImg = new Image();
        await new Promise((resolve) => {
          thumbnailImg.onload = resolve;
          thumbnailImg.src = thumbnailUrl;
        });
      }

      // 然后加载高质量版本
      const highQualityUrl = getProcessedImageUrl(src, effectivePreset);
      const highQualityImg = new Image();
      
      highQualityImg.onload = () => {
        setCurrentSrc(highQualityUrl);
        setIsLoaded(true);
        if (onLoad) onLoad();
      };
      
      highQualityImg.src = highQualityUrl;
    };

    loadImage();
  }, [effectivePreset, enableWebP, isInView, onLoad, quality, src, thumbnailSrc]);

  return (
    <div ref={imgRef} className={`${styles.lazyImageContainer} ${className}`}>
      {currentSrc ? (
        <picture>
          {enableWebP && pictureSources?.avifUrl && <source srcSet={pictureSources.avifUrl} type="image/avif" />}
          {enableWebP && pictureSources?.webpUrl && <source srcSet={pictureSources.webpUrl} type="image/webp" />}
          <img
            src={currentSrc}
            alt={resolvedAlt}
            className={`${styles.lazyImage} ${isLoaded ? styles.loaded : styles.loading}`}
            loading="lazy"
          />
        </picture>
      ) : (
        <div className={styles.placeholder}>
          <div className={styles.spinner}></div>
        </div>
      )}
    </div>
  );
};

export default LazyImage; 
