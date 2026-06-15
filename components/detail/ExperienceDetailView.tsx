/* eslint-disable @next/next/no-img-element -- gallery thumbnails use raw img elements for arbitrary asset URLs and lightbox transitions */
import React from 'react';
import styles from '../../styles/ExperienceDetailView.module.scss';
import Lightbox from '../interactive/Lightbox';
import useGalleryLightbox from '../../hooks/useGalleryLightbox';

const ExperienceDetailView = ({ item }) => {
  const { title, duration, location, details, galleryImages } = item || {};
  const imagesForGallery = galleryImages || [];
  const {
    isLightboxOpen,
    currentLightboxImageIndex,
    clickedThumbnailRect,
    bindThumbnailRef,
    openLightbox,
    closeLightbox,
    showNextImage,
    showPrevImage,
    getClosingRect,
  } = useGalleryLightbox(imagesForGallery.length);

  if (!item) return null;

  return (
    <div className={styles.detailContainer}>
      <h3 className={styles.detailTitle}>{title}</h3>
      
      <div className={styles.detailMeta}>
        <span className={styles.detailDuration}>
          <span className={styles.metaLabel}>Duration:</span> 
          {typeof duration === 'string' && duration ? (
            duration.split(' - ').map((part, index, arr) => 
               <span key={index} className={styles.timelineNumber}>
                 {part}{index < arr.length - 1 ? ' - ' : ''}
               </span>
            )
          ) : (
            <span className={styles.timelineNumber}>N/A</span>
          )}
        </span>
        {location && (
           <span className={styles.detailLocation}>
              <span className={styles.metaLabel}>Location:</span>
              {location}
           </span>
        )}
      </div>

      <div className={styles.detailBody}>
         {details && details.map((line, index) => (
            <p key={index} className={styles.detailParagraph}>
              
              {line.split(/(\d{4}(?:\.\d{2})?)/g).map((part, partIndex) => 
                 /\d{4}(?:\.\d{2})?/.test(part) ? 
                 <span key={partIndex} className={styles.timelineNumber}>{part}</span> : 
                 part
              )}
            </p>
         ))}
      </div>

      {imagesForGallery.length > 0 && (
        <div className={styles.relatedImagesSection}>
          <h4 className={styles.relatedImagesTitle}>Gallery</h4>
          <div className={styles.thumbnailGrid}>
            {imagesForGallery.map((img, imgIndex) => (
              <button 
                key={imgIndex} 
                className={styles.thumbnailButton} 
                onClick={(e) => openLightbox(imgIndex, e, 'thumb')}
                ref={bindThumbnailRef(`thumb_${imgIndex}`)}
              >
                <img 
                  src={img.src} 
                  alt={img.caption || `${title} thumbnail ${imgIndex + 1}`} 
                  className={styles.thumbnailImage}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {isLightboxOpen && imagesForGallery.length > 0 && (
        <Lightbox 
          image={imagesForGallery[currentLightboxImageIndex]} 
          onClose={closeLightbox}
          onNext={imagesForGallery.length > 1 ? showNextImage : null}
          onPrev={imagesForGallery.length > 1 ? showPrevImage : null}
          thumbnailRect={clickedThumbnailRect} // Pass thumbnailRect
          currentIndex={currentLightboxImageIndex} // Pass currentIndex
          totalImages={imagesForGallery.length}   // Pass totalImages
          getClosingRectForIndex={getClosingRect}
        />
      )}

    </div>
  );
};

export default ExperienceDetailView; 
