/* eslint-disable @next/next/no-img-element -- gallery thumbnails use raw img elements for arbitrary asset URLs and lightbox transitions */
import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/ExperienceDetailView.module.scss';
import Lightbox from '../interactive/Lightbox';

const ExperienceDetailView = ({ item }) => {
  const { title, duration, location, details, type, galleryImages } = item || {};

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentLightboxImageIndex, setCurrentLightboxImageIndex] = useState(0);
  const [clickedThumbnailRect, setClickedThumbnailRect] = useState(null);
  const [currentLightboxSourceInfo, setCurrentLightboxSourceInfo] = useState(null);

  const thumbnailRefs = useRef({});

  if (!item) return null;

  const imagesForGallery = galleryImages || [];

  
  const openLightbox = (index, event, sourceType = 'thumb') => { // ADDED sourceType, default to 'thumb'
    if (index >= 0 && index < imagesForGallery.length) {
      let rect = null;
      if (event && event.currentTarget) { 
        rect = event.currentTarget.getBoundingClientRect();
      } else {
        const refKey = `${sourceType}_${index}`;
        const thumb = thumbnailRefs.current[refKey];
        if (thumb) rect = thumb.getBoundingClientRect();
      }
      setClickedThumbnailRect(rect);
      setCurrentLightboxImageIndex(index);
      setCurrentLightboxSourceInfo({ index, type: sourceType }); // SET source info
      setIsLightboxOpen(true);
    }
  };

  
  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setCurrentLightboxSourceInfo(null); // CLEAR source info
    setClickedThumbnailRect(null);
  };

  
  const showNextImage = () => {
    const nextIndex = (currentLightboxImageIndex + 1) % imagesForGallery.length;
    setClickedThumbnailRect(null);
    setCurrentLightboxImageIndex(nextIndex);
    // Keep currentLightboxSourceInfo for now
  };

  
  const showPrevImage = () => {
    const prevIndex = (currentLightboxImageIndex - 1 + imagesForGallery.length) % imagesForGallery.length;
    setClickedThumbnailRect(null);
    setCurrentLightboxImageIndex(prevIndex);
    // Keep currentLightboxSourceInfo
  };

  // RENAMED and MODIFIED function for closing rect
  const getClosingRect = () => {
    if (!currentLightboxSourceInfo) {
      console.warn("ExperienceDetailView: getClosingRect - No currentLightboxSourceInfo available.");
      return null;
    }
    const { index: closingIndex, type: closingType } = currentLightboxSourceInfo;
    const refKey = `${closingType}_${closingIndex}`;
    const thumb = thumbnailRefs.current[refKey];
    if (thumb) {
      return thumb.getBoundingClientRect();
    }
    console.warn(`ExperienceDetailView: getClosingRect - No thumbnail ref found for key: ${refKey}`);
    return null;
  };

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
                onClick={(e) => openLightbox(imgIndex, e, 'thumb')} // Pass sourceType 'thumb'
                ref={el => { thumbnailRefs.current[`thumb_${imgIndex}`] = el; }} // Assign ref with 'thumb_' prefix
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
          getClosingRectForIndex={getClosingRect} // CHANGED prop to pass the new function
        />
      )}

    </div>
  );
};

export default ExperienceDetailView; 
