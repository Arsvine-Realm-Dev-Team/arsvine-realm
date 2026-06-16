/* eslint-disable @next/next/no-img-element -- friend avatars are arbitrary remote URLs and should remain plain img elements */
import Head from 'next/head';
import type { GetStaticPaths, GetStaticProps } from 'next';
import { useTranslations } from 'next-intl';
import SectionPageLayout from '../../components/layout/SectionPageLayout';
import HreflangLinks from '../../components/shared/HreflangLinks';
import styles from '../../styles/Home.module.scss';
import { loadFriendLinks, loadServices, loadMessages } from '../../lib/i18n-data';
import { locales, type Locale } from '../../i18n/config';
import type { FriendLink, ServiceCredit } from '../../types';

interface FriendsPageProps {
  locale: Locale;
  messages: Record<string, unknown>;
  friends: FriendLink[];
  services?: { items: ServiceCredit[] };
  pageTitle: string;
  pageDescription: string;
}

export default function FriendsPage({
  friends,
  services,
  pageTitle,
  pageDescription,
}: FriendsPageProps) {
  const t = useTranslations('pages.friends');
  return (
    <>
      <Head>
        <title>{pageTitle || t('title')}</title>
        <meta name="description" content={pageDescription || t('description')} />
        <meta property="og:type" content="website" />
        <HreflangLinks basePath="/friends" />
      </Head>
      <SectionPageLayout>
        <div className={styles.friendLinkSection}>
          <h2>{t('heading')}</h2>
          <div className={styles.friendLinkGrid}>
            {friends.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.friendLinkCard}
                data-cursor-label="VISIT"
              >
                <div className={styles.friendLinkAvatar}>
                  <img src={link.avatar} alt={link.name} />
                </div>
                <div className={styles.friendLinkInfo}>
                  <h3>{link.name}</h3>
                  <p>{link.description}</p>
                </div>
              </a>
            ))}
          </div>

          {services && services.items.length > 0 && (
            <>
              <h2 className={styles.friendLinkServicesHeading}>{t('servicesHeading')}</h2>
              <div className={styles.friendLinkGrid}>
                {services.items.map((svc) => (
                  <a
                    key={svc.url}
                    href={svc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.friendLinkCard}
                    data-cursor-label="VISIT"
                  >
                    <div className={styles.friendLinkAvatar}>
                      <img src={svc.avatar} alt={svc.name} />
                    </div>
                    <div className={styles.friendLinkInfo}>
                      <h3>{svc.name}</h3>
                      <p>{svc.description}</p>
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      </SectionPageLayout>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: locales.map((locale) => ({ params: { locale } })),
  fallback: false,
});

export const getStaticProps: GetStaticProps<FriendsPageProps> = async ({ params }) => {
  const locale = params!.locale as Locale;
  const messages = await loadMessages(locale);
  const friends = loadFriendLinks(locale).friendLinksData;
  const services = loadServices();

  const friendsPage = (messages.pages as Record<string, { title?: string; description?: string }>)?.friends ?? {};
  return {
    props: {
      locale,
      messages,
      friends,
      services,
      pageTitle: friendsPage.title ?? 'FRIENDS',
      pageDescription: friendsPage.description ?? '',
    },
  };
};
