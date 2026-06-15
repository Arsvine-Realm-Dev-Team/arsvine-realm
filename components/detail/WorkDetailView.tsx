/* eslint-disable @next/next/no-img-element -- gallery and lightbox assets use raw img elements for arbitrary URLs and animation interop */
/* eslint-disable react-hooks/refs -- callback refs intentionally maintain an imperative thumbnail map for lightbox closing animations */
import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/WorkDetailView.module.scss';
import Lightbox from '../interactive/Lightbox';
import { CopyToClipboard } from 'react-copy-to-clipboard';

// Reusing ProjectCard might be complex due to layout differences in detail view.
// Let's build a dedicated detail view component.

const WorkDetailView = ({ item }) => {
  const { title, description, tech, imageUrl, link, galleryImages, articleContent } = item || {};
  const imageStyle = imageUrl ? { backgroundImage: `url(${imageUrl})` } : {};

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentLightboxImageIndex, setCurrentLightboxImageIndex] = useState(0);
  const [clickedThumbnailRect, setClickedThumbnailRect] = useState(null);
  const [currentLightboxSourceInfo, setCurrentLightboxSourceInfo] = useState(null);
  const [copiedTextId, setCopiedTextId] = useState(null);

  const thumbnailRefs = useRef({});

  const imagesForGallery = galleryImages || [];

  if (!item) return null;

  const openLightbox = (index, event, sourceType = 'thumb') => { // ADDED sourceType, default to 'thumb'
    if (index >= 0 && index < imagesForGallery.length) {
      let rect = null;
      if (event && event.currentTarget) { 
        rect = event.currentTarget.getBoundingClientRect();
      } else {
        // Fallback if no event.currentTarget (e.g., if called programmatically for article images later)
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
    setClickedThumbnailRect(null); // Reset thumbnailRect on close
  };

  const showNextImage = () => {
    const nextIndex = (currentLightboxImageIndex + 1) % imagesForGallery.length;
    setClickedThumbnailRect(null); 
    setCurrentLightboxImageIndex(nextIndex);
    // Keep currentLightboxSourceInfo as is for now, assuming next/prev is within the same source type context
  };

  const showPrevImage = () => {
    const prevIndex = (currentLightboxImageIndex - 1 + imagesForGallery.length) % imagesForGallery.length;
    setClickedThumbnailRect(null); 
    setCurrentLightboxImageIndex(prevIndex);
    // Keep currentLightboxSourceInfo
  };
  // --- End State and Functions --- 

  // --- ADD Copy Text Handler --- 
  const handleCopy = (text, id) => {
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 1500);
  };
  // --- END ADD ---

  // --- ADD Paragraph splitting --- 
  const paragraphs = articleContent ? articleContent.split('\n\n') : [];
  const bindThumbnailRef = (key) => (element) => {
    thumbnailRefs.current[key] = element;
  };

  // --- ADD Function to render markdown link --- 
  const renderTextWithCopy = (text) => {
    const parts = text.split(/(\[[^\]]+\]\([^\)]+\))/g); // Split by markdown links
    return parts.map((part, index) => {
      const match = part.match(/\[([^\]]+)\]\(([^\)]+)\)/);
      if (match) {
        const linkText = match[1];
        const linkUrl = match[2];
        if (linkUrl.startsWith('copy:')) {
          const textToCopy = linkUrl.substring(5);
          const copyId = `copy-${index}`;
          return (
            <CopyToClipboard key={index} text={textToCopy} onCopy={() => handleCopy(textToCopy, copyId)}>
              <span className={styles.copyableLink}>
                {linkText}
                {copiedTextId === copyId && <span className={styles.copyFeedback}>Copied!</span>}
              </span>
            </CopyToClipboard>
          );
        } else {
          return <a key={index} href={linkUrl} target="_blank" rel="noopener noreferrer">{linkText}</a>;
        }
      }
      return part;
    });
  };
  // --- END ADD ---

  // RENAMED and MODIFIED function for closing rect
  const getClosingRect = () => {
    if (!currentLightboxSourceInfo) {
      console.warn("WorkDetailView: getClosingRect - No currentLightboxSourceInfo available.");
      return null;
    }
    const { index: closingIndex, type: closingType } = currentLightboxSourceInfo;
    const refKey = `${closingType}_${closingIndex}`;
    const thumb = thumbnailRefs.current[refKey];
    if (thumb) {
      return thumb.getBoundingClientRect();
    }
    console.warn(`WorkDetailView: getClosingRect - No thumbnail ref found for key: ${refKey}`);
    return null;
  };

  return (
    <div className={styles.detailContainer}>
      {/* Back button removed, handled globally */}

      <h3 className={styles.detailTitle}>{title}</h3>
      
      {/* Top Section: Image + Description/Tags */}
      <div className={styles.detailContent}> 
          <div className={styles.detailImageContainer}>
              <div className={styles.detailImage} style={imageStyle}>
                 {!imageUrl && <span>Image not available</span>} 
                 <div className={styles.imageScanlineOverlay}></div> 
              </div>
          </div>

          <div className={styles.detailText}>
              <p className={styles.detailDescription}>{description}</p>
              
              {/* --- REMOVE Article Content Rendering from here --- */}
              {/* {articleContent && ( ... )} */}

              {tech && tech.length > 0 && (
                  <div className={styles.detailTechContainer}>
                       <span className={styles.techLabel}>Technologies:</span> 
                       <div className={styles.detailTechTags}> 
                           {tech.map((tag, index) => (
                               <span key={index} className={styles.detailTechTag}>{tag}</span>
                           ))} 
                       </div> 
                  </div>
              )}

              {link && link !== '#' && (
                  <a 
                      href={link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className={styles.detailLink}
                  >
                      Visit Project / Link
                  </a>
              )}
          </div>
      </div> 
      {/* --- End Top Section --- */}

      {/* --- MOVE Article Content Rendering HERE (Below Top Section) --- */}
      {articleContent && (
        <div className={styles.articleSection}>
          {paragraphs.map((paragraph, index) => {
            // --- ADD Image Insertion Logic for Personal Website --- 
            let imagesToRenderAfter = []; // Use array to hold multiple images
            // --- MODIFY: Pass paragraph to a new function --- 
            const renderParagraphContent = (paragraphText) => {
              const parts = [];
              let lastIndex = 0;
              // Regex to find Markdown links OR copyable text
              const combinedRegex = /(\[(.*?)\]\((.*?)\))/g;
              let match;

              while ((match = combinedRegex.exec(paragraphText)) !== null) {
                // Text before the match
                if (match.index > lastIndex) {
                  parts.push(paragraphText.substring(lastIndex, match.index));
                }
                
                if (match[1]) { // Markdown link found (group 1)
                  const linkText = match[2];
                  const linkUrl = match[3];
                  if (linkUrl.includes('bilibili.com')) {
                    parts.push(
                      <span key={lastIndex} className={styles.iconLinkContainer}>
                        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineIconLink} aria-label={linkText}>
                          <span className={styles.inlineIconSvgContainer}>
                            <svg className={styles.inlineIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"/></g></svg>
                          </span>
                          <span className={styles.inlineIconText}>{linkText}</span>
                          <div className={styles.iconRipple}></div>
                        </a>
                      </span>
                    );
                  } else if (linkUrl.includes('github.com')) {
                    parts.push(
                      <span key={lastIndex} className={styles.iconLinkContainer}>
                        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineIconLink} aria-label={linkText}>
                          <span className={styles.inlineIconSvgContainer}>
                            <svg className={styles.inlineIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                              <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor"></path>
                            </svg>
                          </span>
                          <span className={styles.inlineIconText}>{linkText}</span>
                          <div className={styles.iconRipple}></div>
                        </a>
                      </span>
                    );
                  } else {
                    parts.push(
                      <a key={lastIndex} href={linkUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                        {linkText}
                      </a>
                    );
                  }
                }
                
                lastIndex = match.index + match[0].length;
              }

              // Text after the last match
              if (lastIndex < paragraphText.length) {
                parts.push(paragraphText.substring(lastIndex));
              }
              
              return <>{parts.map((part, i) => <React.Fragment key={i}>{part}</React.Fragment>)}</>;
            };
            // --- END MODIFY ---
            
            // To insert images between paragraphs, match by item.id and index:
            // if (item.id === 1 && index === 1) {
            //   const imgIdx = imagesForGallery.findIndex(img => img.src === 'your-url');
            //   if (imgIdx !== -1) imagesToRenderAfter.push({ info: imagesForGallery[imgIdx], lightboxIndex: imgIdx, isLightboxClickable: true });
            // }
            return (
              <React.Fragment key={index}>
                <p>{renderParagraphContent(paragraph)}</p>
                {/* Render the specific images if conditions are met */}
                {imagesToRenderAfter.length > 0 && imagesToRenderAfter.map((imgData, imgIndex) => (
                   <figure 
                      key={`${index}-img-${imgIndex}`} 
                      className={`${styles.articleImageFigure} ${imgData.isLightboxClickable ? styles.clickableFigure : ''}`} 
                      onClick={imgData.isLightboxClickable ? (e) => openLightbox(imgData.lightboxIndex, e, 'article') : undefined}
                       ref={imgData.isLightboxClickable && typeof imgData.lightboxIndex === 'number'
                         ? bindThumbnailRef(`article_${imgData.lightboxIndex}`)
                         : undefined}
                   >
                    <img 
                      src={imgData.info ? imgData.info.src : imgData.src} // Handle both formats
                      alt={imgData.info ? imgData.info.caption : imgData.caption} 
                      className={styles.articleImage}
                    />
                    {(imgData.info ? imgData.info.caption : imgData.caption) && 
                      <figcaption className={styles.articleImageCaption}>
                        {imgData.info ? imgData.info.caption : imgData.caption}
                      </figcaption>
                    }
                  </figure>
                ))}
              </React.Fragment>
            );
          })}
        </div>
      )}
      {/* --- END MOVE --- */}

      {/* --- Add Related Images Section --- */}
      {imagesForGallery.length > 0 && (
        <div className={styles.relatedImagesSection}>
          <h4 className={styles.relatedImagesTitle}>Gallery</h4>
          <div className={styles.thumbnailGrid}>
            {imagesForGallery.map((img, index) => (
              <button 
                key={index} 
                className={styles.thumbnailButton} 
                onClick={(e) => openLightbox(index, e, 'thumb')} // Pass sourceType 'thumb'
                ref={bindThumbnailRef(`thumb_${index}`)} // Assign ref with 'thumb_' prefix
              >
                <img 
                  src={img.src} 
                  alt={img.caption || `${title} thumbnail ${index + 1}`} 
                  className={styles.thumbnailImage}
                />
              </button>
            ))}
          </div>
        </div>
      )}
      {/* --- End Related Images --- */}

      {/* --- Render Lightbox --- */} 
      {isLightboxOpen && imagesForGallery.length > 0 && (
        <Lightbox 
          image={imagesForGallery[currentLightboxImageIndex]} // Pass the full image object
          onClose={closeLightbox}
          onPrev={imagesForGallery.length > 1 ? showPrevImage : null}
          onNext={imagesForGallery.length > 1 ? showNextImage : null}
          thumbnailRect={clickedThumbnailRect} // Pass thumbnailRect
          currentIndex={currentLightboxImageIndex} // Pass currentIndex
          totalImages={imagesForGallery.length}   // Pass totalImages
          getClosingRectForIndex={getClosingRect} // CHANGED prop to pass the new function
        />
      )}
      {/* --- End Lightbox --- */}

    </div>
  );
};

export default WorkDetailView; 
