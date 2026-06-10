import { type RefObject } from 'react';
import styles from '../../styles/Home.module.scss';
import cardStyles from '../../styles/BlogPostCard.module.scss';
import type { BlogPostMeta } from '../../types';

interface BlogSectionProps {
  blogSectionRef: RefObject<HTMLDivElement>;
  posts: BlogPostMeta[];
  handleBlogItemClick: (slug: string) => void;
}

export default function BlogSection({
  blogSectionRef,
  posts,
  handleBlogItemClick,
}: BlogSectionProps) {
  return (
    <div ref={blogSectionRef} className={styles.contentSection}>
      <h2>Blog</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', marginTop: '20px' }}>
        {posts.map((post, i) => (
          <div
            key={post.slug}
            className={`${cardStyles.card}${post.pinned ? ` ${cardStyles.pinned}` : ''}`}
            role="link"
            tabIndex={0}
            data-cursor-no-magnetic
            onClick={() => handleBlogItemClick(post.slug)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleBlogItemClick(post.slug); }}
          >
            <div className={cardStyles.cardInner}>
              <span className={cardStyles.cardIndex}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={cardStyles.cardContent}>
                <div className={cardStyles.cardHeader}>
                  <h4 className={cardStyles.cardTitle}>
                    {post.title}{post.pinned && (
                      <span className={cardStyles.cardPinnedBadge} aria-label="Pinned">PINNED</span>
                    )}
                  </h4>
                  {post.date && <span className={cardStyles.cardDate}>{post.date}</span>}
                </div>
                <p className={cardStyles.cardExcerpt}>{post.excerpt}</p>
                <div className={cardStyles.cardFooter}>
                  {post.tags.length > 0 ? (
                    <div className={cardStyles.cardTags}>
                      {post.tags.map((tag) => (
                        <span key={tag} className={cardStyles.cardTag}>{tag}</span>
                      ))}
                    </div>
                  ) : <span />}
                  {post.readingTime && (
                    <span className={cardStyles.cardReadingTime}>{post.readingTime}</span>
                  )}
                </div>
              </div>
              <span className={cardStyles.cardArrow}>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
