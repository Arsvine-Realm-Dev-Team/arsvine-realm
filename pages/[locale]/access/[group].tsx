import { useCallback, useRef, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import type { GetServerSideProps } from 'next';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../../components/layout/SectionPageLayout';
import HreflangLinks from '../../../components/shared/HreflangLinks';
import { getSiteUrl } from '../../../data/site';
import type { ProtectedVerifyResponse } from '../../../lib/content/access-api';
import { hasValidAccessGrant } from '../../../lib/content/access-grant';
import { getTotpGroup } from '../../../lib/content/totp';
import { loadMessages } from '../../../lib/i18n-data';
import { defaultLocale, locales, type Locale } from '../../../i18n/config';
import styles from '../../../styles/PostAccessPage.module.scss';

interface AccessPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  group: string;
  nextPath: string;
}

export default function AccessPage({ locale, group, nextPath }: AccessPageProps) {
  const router = useRouter();
  const t = useTranslations('pages.access');
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmittedTokenRef = useRef<string | null>(null);
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const submitToken = useCallback(async (nextToken: string) => {
    if (submitting || nextToken.length !== 6 || lastSubmittedTokenRef.current === nextToken) {
      return;
    }

    lastSubmittedTokenRef.current = nextToken;
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/protected-verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          group,
          token: nextToken,
          next: nextPath,
        }),
      });

      const json = (await response.json()) as ProtectedVerifyResponse;

      if (!response.ok || !json.ok || !json.redirectTo) {
        if ('error' in json) {
          throw new Error(json.error.message || t('invalidToken'));
        }
        throw new Error(t('invalidToken'));
      }

      await router.push(json.redirectTo);
    } catch (submissionError) {
      setError(
        submissionError instanceof Error ? submissionError.message : t('invalidToken'),
      );
    } finally {
      setSubmitting(false);
    }
  }, [group, nextPath, router, submitting, t]);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitToken(token);
  }, [submitToken, token]);

  const handleTokenChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const nextToken = event.target.value.replace(/\D+/g, '').slice(0, 6);
    lastSubmittedTokenRef.current = nextToken.length === 6 ? lastSubmittedTokenRef.current : null;
    setError('');
    setToken(nextToken);
    if (nextToken.length === 6) {
      void submitToken(nextToken);
    }
  }, [submitToken]);

  const handleFieldClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <>
      <Head>
        <title>{t('title')}</title>
        <meta name="description" content={t('description')} />
        <meta property="og:title" content={t('title')} />
        <meta property="og:description" content={t('description')} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${getSiteUrl()}/${locale}/access/${group}`} />
        <meta name="twitter:title" content={t('title')} />
        <meta name="twitter:description" content={t('description')} />
        <HreflangLinks basePath={`/access/${group}`} />
      </Head>

      <SectionPageLayout>
        <section className={styles.page}>
          <header className={styles.header}>
            <h2 className={styles.heading}>{t('heading')}</h2>
            <p className={styles.description}>{t('description')}</p>
          </header>

          <form className={styles.card} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="totp-token">
              {t('tokenLabel')}
            </label>
            <div
              className={styles.codeField}
              onClick={handleFieldClick}
              role="presentation"
            >
              <input
                ref={inputRef}
                id="totp-token"
                className={styles.hiddenInput}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                value={token}
                disabled={submitting}
                onChange={handleTokenChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
              <div className={styles.slotGrid} aria-hidden="true">
                {Array.from({ length: 6 }, (_, index) => {
                  const char = token[index] ?? '';
                  const isActive = isFocused && index === Math.min(token.length, 5) && token.length < 6;
                  const isFilled = char !== '';

                  return (
                    <span
                      key={index}
                      className={`${styles.slot}${isFilled ? ` ${styles.slotFilled}` : ''}${isActive ? ` ${styles.slotActive}` : ''}`}
                    >
                      {char || '\u00A0'}
                    </span>
                  );
                })}
              </div>
            </div>
            <p className={styles.hint}>{t('hint')}</p>
            <p className={styles.status} aria-live="polite">
              {submitting ? t('verifying') : '\u00A0'}
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <button className={styles.hiddenSubmit} type="submit" tabIndex={-1} aria-hidden="true" />
          </form>
        </section>
      </SectionPageLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<AccessPageProps> = async ({
  params,
  query,
  req,
}) => {
  const locale = (params?.locale as Locale) || defaultLocale;
  const group = typeof params?.group === 'string' ? params.group : '';
  const nextPath =
    typeof query.next === 'string' && query.next.startsWith('/') ? query.next : `/${locale}/content#blog`;

  if (!locales.includes(locale) || !group) {
    return { notFound: true };
  }

  if (!getTotpGroup(group)) {
    return { notFound: true };
  }

  if (hasValidAccessGrant(req, group)) {
    return {
      redirect: {
        destination: nextPath,
        permanent: false,
      },
    };
  }

  const messages = await loadMessages(locale);
  return {
    props: {
      locale,
      messages,
      group,
      nextPath,
    },
  };
};
