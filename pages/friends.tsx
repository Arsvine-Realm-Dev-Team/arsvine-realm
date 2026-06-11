import Head from 'next/head';
import SectionPageLayout from '../components/layout/SectionPageLayout';
import styles from '../styles/Home.module.scss';
import { friendLinksData } from '../data/friendLinks';
import { siteConfig } from '../data/site';

export default function FriendsPage() {
  const services = siteConfig.pages.friends.services;
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

          {services && services.items.length > 0 && (
            <>
              {/* 致谢区：使用了对方服务（非朋友关系）。视觉上复用 friendLinkCard，
                  语义上用独立标题分隔，避免和上方两列友链混淆。 */}
              <h2 className={styles.friendLinkServicesHeading}>{services.heading}</h2>
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
