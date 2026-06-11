import Head from 'next/head';
import SectionPageLayout from '../components/layout/SectionPageLayout';
import styles from '../styles/Home.module.scss';
import { friendLinksData } from '../data/friendLinks';
import { siteConfig } from '../data/site';

export default function FriendsPage() {
  return (
    <>
      <Head>
        <title>{siteConfig.pages.friends.title}</title>
        <meta name="description" content={siteConfig.pages.friends.description} />
        <meta property="og:type" content="website" />
      </Head>
      <SectionPageLayout>
        <div className={styles.friendLinkSection}>
          <h2>{siteConfig.pages.friends.heading}</h2>
          <div className={styles.friendLinkGrid}>
            {friendLinksData.map((link) => (
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
        </div>
      </SectionPageLayout>
    </>
  );
}
