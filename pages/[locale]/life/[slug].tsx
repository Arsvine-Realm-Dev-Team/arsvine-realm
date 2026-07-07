import React, { useCallback, useMemo, useRef } from 'react';
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import styles from '../../../styles/StandaloneDetailView.module.scss';
import hudStyles from '../../../styles/Home.module.scss';
import { useApp } from '../../../contexts/AppContext';
import { useTransition } from '../../../contexts/TransitionContext';
import LazyImage from '../../../components/shared/LazyImage';
import Lightbox from '../../../components/interactive/Lightbox';
import HreflangLinks from '../../../components/shared/HreflangLinks';
import LocaleFallbackBanner from '../../../components/shared/LocaleFallbackBanner';
import DetailFooterNav from '../../../components/detail/standalone/DetailFooterNav';
import DetailGallerySection from '../../../components/detail/standalone/DetailGallerySection';
import DetailHero from '../../../components/detail/standalone/DetailHero';
import DetailRailNav from '../../../components/detail/standalone/DetailRailNav';
import LifeLinksSection from '../../../components/detail/standalone/LifeLinksSection';
import RevealParagraphSection from '../../../components/detail/standalone/RevealParagraphSection';
import { useDetailHeroParallax } from '../../../hooks/useDetailHeroParallax';
import { useDetailScrollReveal } from '../../../hooks/useDetailScrollReveal';
import { useDetailSectionNav, type DetailSectionNavItem } from '../../../hooks/useDetailSectionNav';
import { useDetailTitleReveal } from '../../../hooks/useDetailTitleReveal';
import { useTypingSubtitle } from '../../../hooks/useTypingSubtitle';
import useGalleryLightbox from '../../../hooks/useGalleryLightbox';
import { loadLife, loadMessages, resolveLifeItem } from '../../../lib/i18n-data';
import { defaultLocale, locales, type Locale } from '../../../i18n/config';
import type { LifeItem, TranslationStatus } from '../../../types';

interface PageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  item: LifeItem;
  allItems: LifeItem[];
  translationStatus: TranslationStatus;
  actualLocale: Locale;
  originLocale: Locale;
}

export const getStaticPaths: GetStaticPaths = async () => {
  const baseLife = loadLife(defaultLocale);
  const baseIds = [...baseLife.gameData, ...baseLife.travelData, ...baseLife.otherData].map((item) => item.id);
  const paths = locales.flatMap((locale) =>
    baseIds.map((slug) => ({ params: { locale, slug } })),
  );
  return { paths, fallback: false };
};

export const getStaticProps: GetStaticProps<PageProps> = async ({ params }) => {
  const locale = params?.locale as Locale;
  const messages = await loadMessages(locale);
  const resolved = resolveLifeItem(params?.slug as string, locale);
  if (!resolved) {
    return { notFound: true };
  }

  const life = loadLife(locale);
  const allItems = [...life.gameData, ...life.travelData, ...life.otherData];

  return {
    props: {
      locale,
      messages,
      item: resolved.item,
      allItems,
      translationStatus: resolved.status,
      actualLocale: resolved.actualLocale,
      originLocale: resolved.originLocale,
    },
  };
};

export default function LifeDetailPage({
  locale,
  item,
  allItems,
  translationStatus,
  actualLocale,
  originLocale,
}: PageProps) {
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
}: Omit<PageProps, 'messages'>) {
  const { isInverted } = useApp();
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

  const coverImage = item.imageUrl.split('?')[0];
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
                  key={`${image.src}-${index}`}
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
