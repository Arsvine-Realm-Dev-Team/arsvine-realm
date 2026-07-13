import React, { useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import { useTranslations } from 'next-intl';
import styles from '../../../shared/ui/detail/StandaloneDetailView.module.scss';
import hudStyles from '../../../app/styles/Shell.module.scss';
import { useHud } from '../../../features/hud/model/HudProvider';
import { useTransition } from '../../../features/navigation/model/TransitionProvider';
import LazyImage from '../../../shared/ui/LazyImage';
import Lightbox from '../../../shared/ui/Lightbox';
import HreflangLinks from '../../../shared/ui/HreflangLinks';
import LocaleFallbackBanner from '../../../shared/ui/LocaleFallbackBanner';
import DetailFooterNav from '../../../shared/ui/detail/DetailFooterNav';
import DetailGallerySection from '../../../shared/ui/detail/DetailGallerySection';
import DetailHero from '../../../shared/ui/detail/DetailHero';
import DetailRailNav from '../../../shared/ui/detail/DetailRailNav';
import LifeLinksSection from './detail/LifeLinksSection';
import RevealParagraphSection from '../../../shared/ui/detail/RevealParagraphSection';
import { useDetailHeroParallax } from '@/shared/hooks/useDetailHeroParallax';
import { useDetailScrollReveal } from '@/shared/hooks/useDetailScrollReveal';
import { useDetailSectionNav, type DetailSectionNavItem } from '@/shared/hooks/useDetailSectionNav';
import { useDetailTitleReveal } from '@/shared/hooks/useDetailTitleReveal';
import { useTypingSubtitle } from '@/shared/hooks/useTypingSubtitle';
import useGalleryLightbox from '@/shared/hooks/useGalleryLightbox';
import { resolveImageUrl } from '@/shared/lib/cdn';
import type { Locale } from '@/shared/contracts/locale';
import type { LifeItem, TranslationStatus } from '../../../shared/types';

export interface LifeDetailPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  item: LifeItem;
  allItems: LifeItem[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  originLocale: Locale;
}

export default function LifeDetailPage({
  locale,
  item,
  allItems,
  translationStatus,
  actualLocale,
  originLocale,
}: LifeDetailPageProps) {
  return (
    <LifeDetailContent
      key={`${locale}-${item.id}`}
      locale={locale}
      item={item}
      allItems={allItems}
      translationStatus={translationStatus}
      actualLocale={actualLocale}
      originLocale={originLocale}
    />
  );
}

function LifeDetailContent({
  locale,
  item,
  allItems,
  translationStatus,
  actualLocale,
  originLocale,
}: Omit<LifeDetailPageProps, 'messages'>) {
  const { isInverted } = useHud();
  const { navigateTo } = useTransition();
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const tDetail = useTranslations('detail');

  const currentIndex = allItems.findIndex((entry) => entry.id === item.id);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const heroBgRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitle = useTypingSubtitle(item.description, 120, 2200);
  const { visible, setRef } = useDetailScrollReveal(wrapperRef);
  const { activeNav, bindSectionRef, isPastHero, scrollToSection } = useDetailSectionNav({
    rootRef: wrapperRef,
    depsKey: [
      item.articleContent?.length ?? 0,
      item.galleryImages?.length ?? 0,
      item.links?.length ?? 0,
    ].join('|'),
  });

  useDetailHeroParallax(wrapperRef, heroBgRef);
  useDetailTitleReveal({
    titleRef,
    wrapperClassName: styles.charWrapper,
    innerClassName: styles.charInner,
  });

  const paragraphs = item.articleContent
    ? item.articleContent.split(/\n\s*\n+/).map((paragraph) => paragraph.trim()).filter(Boolean)
    : [];
  const galleryImages = item.galleryImages || [];
  const links = item.links || [];

  const navItems = useMemo<DetailSectionNavItem[]>(() => {
    const items: DetailSectionNavItem[] = [{ id: 'hero', label: tNav('top') }];
    if (paragraphs.length > 0) {
      items.push({ id: 'story', label: tNav('story') });
    }
    if (galleryImages.length > 0) {
      items.push({ id: 'archive', label: tNav('archive') });
    }
    if (links.length > 0) {
      items.push({ id: 'links', label: tNav('signal') });
    }
    return items;
  }, [galleryImages.length, links.length, paragraphs.length, tNav]);

  const {
    bindThumbnailRef,
    clickedThumbnailRect,
    closeLightbox,
    currentLightboxImageIndex,
    getClosingRect,
    isLightboxOpen,
    openLightbox,
    showNextImage,
    showPrevImage,
  } = useGalleryLightbox(galleryImages.length);

  const handleBack = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    navigateTo(`/${locale}/content#life`);
  }, [locale, navigateTo]);

  const coverImage = resolveImageUrl(item.imageUrl, 'large');
  let revealCursor = 0;
  const storyRevealIndices = paragraphs.map(() => revealCursor++);
  const galleryRevealIndices = galleryImages.map(() => revealCursor++);

  return (
    <div ref={wrapperRef} className={`${styles.pageWrapper} ${isInverted ? hudStyles.inverted : ''}`}>
      <Head>
        <title>{`${item.title.toUpperCase()} // LIFE`}</title>
        <meta name="description" content={item.title} />
        <meta property="og:type" content="article" />
        <HreflangLinks basePath={`/life/${item.id}`} />
      </Head>

      <div className={styles.mainContent}>
        {translationStatus !== 'source' && (
          <LocaleFallbackBanner
            requestedLocale={locale}
            actualLocale={actualLocale}
            originLocale={originLocale}
            status={translationStatus}
          />
        )}

        <DetailHero
          styles={styles}
          title={item.title}
          subtitle={subtitle.displayed}
          subtitleDone={subtitle.done}
          titleRef={titleRef}
          heroBgRef={heroBgRef}
          sectionRef={bindSectionRef('hero')}
          backgroundImage={coverImage}
        />

        {paragraphs.length > 0 && (
          <RevealParagraphSection
            styles={styles}
            sectionRef={bindSectionRef('story')}
            sectionId="story"
            className={styles.timelineSection}
            itemClassName={styles.timelineTextOnly}
            textClassName={styles.timelineText}
            paragraphs={paragraphs}
            title={tDetail('storyLog')}
            visible={visible}
            setRef={setRef}
            revealIndices={storyRevealIndices}
          />
        )}

        {galleryImages.length > 0 && (
          <DetailGallerySection
            styles={styles}
            sectionRef={bindSectionRef('archive')}
            className={styles.gallerySection}
            title={tDetail('archive')}
            contentClassName={styles.galleryGrid}
          >
            {galleryImages.map((image, index) => {
              const revealIndex = galleryRevealIndices[index];
              return (
                <div
                  key={`${resolveImageUrl(image.src, 'card')}-${index}`}
                  className={styles.galleryItem}
                  onClick={(event) => openLightbox(index, event, 'gallery')}
                  ref={(element) => {
                    bindThumbnailRef(`gallery_${index}`)(element);
                    setRef(revealIndex)(element);
                  }}
                  data-reveal-idx={revealIndex}
                >
                  <LazyImage
                    src={image.src}
                    alt={image.caption || `${item.title} gallery ${index + 1}`}
                    quality="medium"
                    preset="card"
                  />
                  <div className={styles.galleryOverlay} />
                  <div className={styles.galleryCornerTL} />
                  <div className={styles.galleryCornerBR} />
                  {image.caption && (
                    <div className={styles.galleryCaption}>{image.caption}</div>
                  )}
                </div>
              );
            })}
          </DetailGallerySection>
        )}

        {links.length > 0 && (
          <LifeLinksSection
            links={links}
            sectionRef={bindSectionRef('links')}
            styles={styles}
            title={tDetail('signalOutput')}
          />
        )}

        <DetailFooterNav
          styles={styles}
          previous={prevItem
            ? {
                href: `/${locale}/life/${prevItem.id}`,
                title: prevItem.title,
                cursorLabel: 'PREVIOUS',
                onClick: (event) => {
                  event.preventDefault();
                  navigateTo(`/${locale}/life/${prevItem.id}`);
                },
              }
            : null}
          next={nextItem
            ? {
                href: `/${locale}/life/${nextItem.id}`,
                title: nextItem.title,
                cursorLabel: 'NEXT',
                onClick: (event) => {
                  event.preventDefault();
                  navigateTo(`/${locale}/life/${nextItem.id}`);
                },
              }
            : null}
          fallback={{
            href: `/${locale}/content#life`,
            title: tCommon('returnToMain'),
            cursorLabel: 'BACK',
            onClick: handleBack as React.MouseEventHandler<HTMLAnchorElement>,
          }}
        />
      </div>

      <DetailRailNav
        styles={styles}
        isPastHero={isPastHero}
        activeNav={activeNav}
        navItems={navItems}
        onBack={handleBack as React.MouseEventHandler<HTMLButtonElement>}
        onNavigateSection={scrollToSection}
      />

      {isLightboxOpen && galleryImages.length > 0 && (
        <Lightbox
          image={galleryImages[currentLightboxImageIndex]}
          onClose={closeLightbox}
          onPrev={galleryImages.length > 1 ? showPrevImage : null}
          onNext={galleryImages.length > 1 ? showNextImage : null}
          thumbnailRect={clickedThumbnailRect}
          currentIndex={currentLightboxImageIndex}
          totalImages={galleryImages.length}
          getClosingRectForIndex={getClosingRect}
        />
      )}
    </div>
  );
}
