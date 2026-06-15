import { type RefObject } from 'react';
import { useTranslations } from 'next-intl';
import styles from '../../styles/Home.module.scss';
import cardStyles from '../../styles/BlogPostCard.module.scss';
import { formatReadingTime } from '../../lib/format-reading-time';
import type { Locale } from '../../i18n/config';
import type { BlogPostMeta } from '../../types';

interface BlogSectionProps {
  blogSectionRef: RefObject<HTMLDivElement>;
  locale: Locale;
  posts: BlogPostMeta[];
  handleBlogItemClick: (post: BlogPostMeta) => void;
}

export default function BlogSection({
  blogSectionRef,
  locale,
  posts,
  handleBlogItemClick,
}: BlogSectionProps) {
  const t = useTranslations('sections.blog');

  return (
    <div ref={blogSectionRef} className={styles.contentSection}>
      <h2>{t('heading')}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', marginTop: '20px' }}>
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className={`${cardStyles.card}${post.pinned ? ` ${cardStyles.pinned}` : ''}`}
            role="link"
            tabIndex={0}
            data-cursor-no-magnetic
            onClick={() => handleBlogItemClick(post)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBlogItemClick(post); }}
          >
            <div className={cardStyles.cardInner}>
              <span className={cardStyles.cardIndex}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={cardStyles.cardContent}>
                <div className={cardStyles.cardHeader}>
                  <h4 className={cardStyles.cardTitle}>
                    {post.title}{post.pinned && (
                      <span className={cardStyles.cardPinnedBadge} aria-label={t('pinned')}>{t('pinned')}</span>
                    )}
                    {post.access.mode === 'totp' && (
                      <span className={cardStyles.cardPinnedBadge} aria-label={t('protected')}>
                        {t('protected')}
                      </span>
                    )}
                  </h4>
                  {post.date && <span className={cardStyles.cardDate}>{post.date}</span>}
                </div>
                {post.excerpt ? <p className={cardStyles.cardExcerpt}>{post.excerpt}</p> : null}
                {(post.tags.length > 0 || post.readingMinutes > 0) ? (
                  <div className={cardStyles.cardFooter}>
                    {post.tags.length > 0 ? (
                      <div className={cardStyles.cardTags}>
                        {post.tags.map((tag) => (
                          <span key={tag} className={cardStyles.cardTag}>{tag}</span>
                        ))}
                      </div>
                    ) : <span />}
                    {post.readingMinutes > 0 ? (
                      <span className={cardStyles.cardReadingTime}>{formatReadingTime(post.readingMinutes, locale)}</span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <span className={cardStyles.cardArrow}>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
