import React, { useState, useEffect, useRef } from 'react';
import styles from '../../styles/LifeDetailView.module.scss';
import Lightbox from '../interactive/Lightbox';
import LazyImage from '../shared/LazyImage';


const LifeDetailView = ({ item }) => {
  const { title, description, tech, imageUrl, articleContent, galleryImages } = item || {};
  const imageStyle = imageUrl ? { backgroundImage: `url(${imageUrl})` } : {};

  const paragraphs = articleContent ? articleContent.split('\n\n') : [];

  const MINECRAFT_EXTRA_IMAGES = [];
  const imagesForGallery = galleryImages && galleryImages.length > 0
    ? galleryImages
    : (item?.id === 'mc' ? MINECRAFT_EXTRA_IMAGES : []);

  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentLightboxImageIndex, setCurrentLightboxImageIndex] = useState(0);
  const [clickedThumbnailRect, setClickedThumbnailRect] = useState(null);
  const [currentLightboxSourceInfo, setCurrentLightboxSourceInfo] = useState(null);

  const thumbnailRefs = useRef({});

  if (!item) return null;

  // 获取特定图片在特定 Life Item (如 WA, physical-games, qinghai) 中的动态图片说明
  const getDynamicCaption = (imageSrc) => {
    return null;
  };

  // 打开灯箱
  const openLightbox = (index, event, sourceType) => { // ADDED sourceType
    if (imagesForGallery && imagesForGallery.length > 0 && index >= 0 && index < imagesForGallery.length) {
      let rect;
      if (event && event.currentTarget) {
        rect = event.currentTarget.getBoundingClientRect();
      } else {
        const refKey = `${sourceType}_${index}`;
        const thumb = thumbnailRefs.current[refKey];
        if (thumb) {
          rect = thumb.getBoundingClientRect();
        }
      }
      setClickedThumbnailRect(rect);
      setCurrentLightboxImageIndex(index);
      setCurrentLightboxSourceInfo({ index, type: sourceType }); // SET source info
      setIsLightboxOpen(true);
    }
  };

  // 关闭灯箱
  const closeLightbox = () => {
    setIsLightboxOpen(false);
    setCurrentLightboxSourceInfo(null); // CLEAR source info
  };

  // 显示下一张灯箱图片 
  const showNextImage = () => {
    if (imagesForGallery.length > 0) {
      const nextIndex = (currentLightboxImageIndex + 1) % imagesForGallery.length;
      setCurrentLightboxImageIndex(nextIndex);
      setClickedThumbnailRect(null); 
      // Keep currentLightboxSourceInfo as is, assuming next/prev still refers to the same original gallery structure
    }
  };

  // 显示上一张灯箱图片
  const showPrevImage = () => {
    if (imagesForGallery.length > 0) {
      const prevIndex = (currentLightboxImageIndex - 1 + imagesForGallery.length) % imagesForGallery.length;
      setCurrentLightboxImageIndex(prevIndex);
      setClickedThumbnailRect(null); 
      // Keep currentLightboxSourceInfo
    }
  };

  // RENAMED and MODIFIED function
  const getClosingRect = () => {
    if (!currentLightboxSourceInfo) return null;
    const { index: closingIndex, type: closingType } = currentLightboxSourceInfo;
    const refKey = `${closingType}_${closingIndex}`;
    const thumb = thumbnailRefs.current[refKey];
    if (thumb) {
      return thumb.getBoundingClientRect();
    }
    return null;
  };

  return (
    <div className={styles.detailContainer}>
      {/* 返回按钮 (已移除) 
      <button className={styles.backButton} onClick={onBack}>
        ← BACK
      </button>
      */}

      <h3 className={styles.detailTitle}>{title}</h3>
      
      <div className={styles.detailContent}>
          <div className={styles.detailImageContainer}>
              <div className={styles.detailImage} style={imageStyle}>
                 {!imageUrl && <span>Image not available</span>} {/* 无主图时显示占位文本 */}
                 <div className={styles.imageScanlineOverlay}></div> {/* 图片扫描线覆盖层 */}
              </div>
          </div>

          <div className={styles.detailText}>
              <p className={styles.detailDescription}>{description}</p>
              
              {/* 渲染文章内容，并在段落间插入图片/链接 */}
              {articleContent && (
                <div className={styles.articleSection}>
                  {paragraphs.map((paragraph, index) => {
                    let imagesToRenderAfter = []; // 存储在此段落后渲染的图片或链接对象

                    // To insert images between paragraphs for specific items,
                    // match by item.id and paragraph index, then push to imagesToRenderAfter.
                    // Example:
                    // if (item.id === 'my-item' && index === 1) {
                    //   const imgIdx = imagesForGallery.findIndex(img => img.src === 'your-image-url');
                    //   if (imgIdx !== -1) imagesToRenderAfter.push({ info: imagesForGallery[imgIdx], lightboxIndex: imgIdx });
                    // }
                    
                    const isStrayQuote = false;

                    return (
                      <React.Fragment key={index}>
                        {/* 渲染段落文本或引用块 */}
                        {isStrayQuote ? (
                          <blockquote key={`${index}-text`} className={styles.articleBlockquote}>
                            {paragraph.split('\n').map((line, lineIndex) => <span key={lineIndex} style={{ display: 'block' }}>{line}</span>)}
                          </blockquote>
                        ) : (
                          <p key={`${index}-text`}>{paragraph}</p>
                        )}

                        {/* 在段落后渲染图片和链接 */}
                        {imagesToRenderAfter.length > 0 && (
                          <>
                            {/* 渲染图片行 (若适用) */}
                            {imagesToRenderAfter.every(i => typeof i === 'object' && i.info) && imagesToRenderAfter.length === 2 && (
                              <div className={styles.inlineImageRow} key={`${index}-img-row`}> 
                                {imagesToRenderAfter.map(({ info, lightboxIndex }) => (
                                  <figure 
                                    key={`row_img_${lightboxIndex}`}
                                    className={`${styles.articleImageFigure} ${styles.clickableFigure} ${styles.rowFigure}`} 
                                    onClick={(e) => openLightbox(lightboxIndex, e, 'article')} // Pass sourceType
                                    ref={el => { thumbnailRefs.current[`article_${lightboxIndex}`] = el; }} // MODIFIED REF KEY
                                  >
                                    <LazyImage 
                                      src={info.src} 
                                      alt={info.caption || `${title} illustration`} 
                                      className={styles.articleImage}
                                      quality="medium"
                                    />
                                    {info.caption && <figcaption className={styles.articleImageCaption}>{info.caption}</figcaption>}
                                  </figure>
                                ))}
                              </div>
                            )}

                            {/* 渲染堆叠图片 (排除已在行中渲染的) */}
                            {imagesToRenderAfter
                              .filter(renderItem => typeof renderItem === 'object' && renderItem.info)
                              .map(({ info, lightboxIndex, sourceTypeIdentifier }, itemIndex) => { // Added sourceTypeIdentifier
                                const finalSourceType = `article${sourceTypeIdentifier ? '_' + sourceTypeIdentifier : ''}`;
                                return (
                                <figure 
                                  key={`stack_img_${lightboxIndex}`}
                                  className={`${styles.articleImageFigure} ${styles.clickableFigure}`} 
                                  onClick={(e) => openLightbox(lightboxIndex, e, finalSourceType)} // Use finalSourceType
                                  ref={el => { thumbnailRefs.current[`${finalSourceType}_${lightboxIndex}`] = el; }} // Use finalSourceType in ref key
                                >
                                  <LazyImage 
                                    src={info.src} 
                                    alt={info.caption || `${title} illustration`} 
                                    className={styles.articleImage}
                                    quality="medium"
                                  />
                                  {info.caption && <figcaption className={styles.articleImageCaption}>{info.caption}</figcaption>}
                                </figure>
                               );
                              })
                            }
                            
                            {/* 如果存在分隔符 'separator', 则渲染链接列表 */}
                            {imagesToRenderAfter.includes('separator') && (
                              <div className={styles.articleLinkList} key={`${index}-link-list`}>
                                {imagesToRenderAfter
                                  .filter(renderItem => typeof renderItem === 'object' && renderItem.type === 'link')
                                  .map(linkItem => (
                                    <div key={linkItem.href} className={styles.articleLinkItem}>
                                      {linkItem.href.includes('bilibili.com') ? ( // Bilibili 链接特殊处理 (带图标和波纹)
                                        <span className={styles.iconLinkContainer}> 
                                          <a href={linkItem.href} target="_blank" rel="noopener noreferrer" className={styles.inlineIconLink} aria-label={linkItem.text}>
                                            <span className={styles.inlineIconSvgContainer}> {/* SVG 图标容器 */} 
                                              <svg className={styles.inlineIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path fill="none" d="M0 0h24v24H0z"/><path fill="currentColor" d="M18.223 3.086a1.25 1.25 0 0 1 0 1.768L17.08 5.996h1.17A3.75 3.75 0 0 1 22 9.747v7.5a3.75 3.75 0 0 1-3.75 3.75H5.75A3.75 3.75 0 0 1 2 17.247v-7.5a3.75 3.75 0 0 1 3.75-3.75h1.166L5.775 4.855a1.25 1.25 0 1 1 1.767-1.768l2.652 2.652c.079.079.145.165.198.257h3.213c.053-.092.12-.18.199-.258l2.651-2.652a1.25 1.25 0 0 1 1.768 0zm.027 5.42H5.75a1.25 1.25 0 0 0-1.247 1.157l-.003.094v7.5c0 .659.51 1.199 1.157 1.246l.093.004h12.5a1.25 1.25 0 0 0 1.247-1.157l.003-.093v-7.5c0-.69-.56-1.25-1.25-1.25zm-10 2.5c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25zm7.5 0c.69 0 1.25.56 1.25 1.25v1.25a1.25 1.25 0 1 1-2.5 0v-1.25c0-.69.56-1.25 1.25-1.25z"/></g></svg>
                                            </span>
                                            <span className={styles.inlineIconText}>{linkItem.text}</span> {/* 链接文本在 a 标签内 */}
                                            <div className={styles.iconRipple}></div> {/* 点击波纹效果 */}
                                          </a>
                                        </span>
                                      ) : (
                                        <a href={linkItem.href} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>{linkItem.text}</a> // 普通链接
                                      )}
                                    </div>
                                  ))}
                              </div>
                            )}
                          </> 
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* 相关图片缩略图展示区域 */}
              {imagesForGallery.length > 0 && (
                <div className={styles.relatedImagesSection}>
                  <h4 className={styles.relatedImagesTitle}>Gallery</h4>
                  <div className={styles.thumbnailGrid}>
                    {imagesForGallery.map((img, idx) => ( // Changed index to idx to avoid conflict
                      <button 
                        key={`thumb_btn_${idx}`} 
                        className={styles.thumbnailButton} 
                        onClick={(e) => openLightbox(idx, e, 'thumb')} // Pass sourceType, use idx
                        ref={el => { thumbnailRefs.current[`thumb_${idx}`] = el; }} // MODIFIED REF KEY, use idx
                      >
                        <LazyImage 
                          src={img.src} 
                          alt={img.caption || `${title} thumbnail ${idx + 1}`} 
                          className={styles.thumbnailImage}
                          quality="low"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 技术标签展示区域 */}
              {tech && tech.length > 0 && (
                  <div className={styles.detailTechContainer}>
                       <span className={styles.techLabel}>Tags:</span> 
                       <div className={styles.detailTechTags}> 
                           {tech.map((tag, index) => (
                               <span key={index} className={styles.detailTechTag}>{tag}</span>
                           ))} 
                       </div> 
                  </div>
              )}
          </div>
      </div>

      {/* 灯箱组件 (当 isLightboxOpen 为 true 且有图片对象时渲染) */}
      {isLightboxOpen && imagesForGallery.length > 0 && (
        <Lightbox 
          image={imagesForGallery[currentLightboxImageIndex]}
          onClose={closeLightbox}
          onPrev={imagesForGallery.length > 1 ? showPrevImage : null}
          onNext={imagesForGallery.length > 1 ? showNextImage : null}
          thumbnailRect={clickedThumbnailRect}
          currentIndex={currentLightboxImageIndex}
          totalImages={imagesForGallery.length}
          getClosingRectForIndex={getClosingRect} // CHANGED prop name to pass the new function
        />
      )}

    </div>
  );
};

export default LifeDetailView; 