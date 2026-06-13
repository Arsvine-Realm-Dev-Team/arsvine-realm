import { startTransition, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useApp } from '../../contexts/AppContext';
import type { Locale } from '../../i18n/config';
import type { TweetMonthGroup } from '../../lib/tweets/types';
import styles from '../../styles/TweetsSection.module.scss';
import cardStyles from '../../styles/BlogPostCard.module.scss';

interface TweetsSectionProps {
  locale: Locale;
  monthGroups: TweetMonthGroup[];
  initialVisibleMonths: number;
  generatedAt?: string;
}

function formatDate(value: string, locale: Locale): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function formatMonthLabel(value: string, locale: Locale): string {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(date);
}

export default function TweetsSection({
  locale,
  monthGroups,
  initialVisibleMonths,
  generatedAt,
}: TweetsSectionProps) {
  const t = useTranslations('pages.tweets');
  const { isInverted } = useApp();
  const [visibleMonthCount, setVisibleMonthCount] = useState(
    Math.max(1, initialVisibleMonths),
  );

  const formattedGeneratedAt = useMemo(() => {
    if (!generatedAt) return '';
    return formatDate(generatedAt, locale);
  }, [generatedAt, locale]);

  const visibleGroups = useMemo(
    () => monthGroups.slice(0, visibleMonthCount),
    [monthGroups, visibleMonthCount],
  );
  const hasMoreMonths = visibleMonthCount < monthGroups.length;

  const handleLoadMore = () => {
    startTransition(() => {
      setVisibleMonthCount((current) => Math.min(current + 1, monthGroups.length));
    });
  };

  const tweetContentStyle = isInverted ? { color: '#161616' } : undefined;

  return (
    <section className={styles.tweetsSection}>
      <div className={styles.header}>
        <h2 className={styles.heading}>{t('heading')}</h2>
        <p className={styles.description}>{t('description')}</p>
      </div>

      {monthGroups.length === 0 ? (
        <p className={styles.emptyState}>{t('empty')}</p>
      ) : (
        <>
          <div className={styles.monthGroupList}>
            {visibleGroups.map((group) => (
              <section key={group.month} className={styles.monthGroup}>
                <div className={styles.monthHeader}>
                  <h3 className={styles.monthHeading}>
                    {formatMonthLabel(group.month, locale)}
                  </h3>
                  <span className={styles.monthMeta}>
                    {group.tweets.length}
                  </span>
                </div>

                <div className={styles.tweetList}>
                  {group.tweets.map((tweet) => (
                    <article
                      key={tweet.id}
                      className={`${cardStyles.card}${tweet.pinned ? ` ${cardStyles.pinned}` : ''}`}
                    >
                      <div className={cardStyles.cardInner}>
                        <div className={cardStyles.cardContent}>
                          <div className={styles.tweetMetaRow}>
                            <div className={styles.tweetMetaLeft}>
                              <time className={cardStyles.cardDate} dateTime={tweet.createdAt}>
                                {formatDate(tweet.createdAt, locale)}
                              </time>
                              {tweet.pinned ? (
                                <span className={cardStyles.cardPinnedBadge} aria-label={t('pinned')}>
                                  {t('pinned')}
                                </span>
                              ) : null}
                            </div>
                            <span className={styles.tweetId}>{tweet.id}</span>
                          </div>

                          <p className={styles.tweetContent} style={tweetContentStyle}>
                            {tweet.content}
                          </p>

                          <div className={cardStyles.cardFooter}>
                            {tweet.tags?.length ? (
                              <div className={cardStyles.cardTags}>
                                {tweet.tags.map((tag) => (
                                  <span key={tag} className={cardStyles.cardTag}>
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            ) : <span />}

                            {tweet.lang ? (
                              <span className={cardStyles.cardReadingTime}>{tweet.lang}</span>
                            ) : <span />}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {hasMoreMonths ? (
            <button
              type="button"
              className={styles.loadMoreButton}
              onClick={handleLoadMore}
            >
              {t('loadMore')}
            </button>
          ) : null}
        </>
      )}

      {formattedGeneratedAt ? (
        <p className={styles.generatedAt}>{t('generatedAt', { value: formattedGeneratedAt })}</p>
      ) : null}
    </section>
  );
}
