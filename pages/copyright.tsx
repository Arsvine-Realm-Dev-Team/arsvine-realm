import Head from 'next/head';
import SectionPageLayout from '../components/layout/SectionPageLayout';
import styles from '../styles/Home.module.scss';
import { siteConfig } from '../data/site';

const MIT_URL = 'https://opensource.org/license/mit/';
const CC_URL = 'https://creativecommons.org/licenses/by-nc-nd/4.0/';

export default function CopyrightPage() {
  const currentYear = new Date().getFullYear();
  const yearRange =
    currentYear > siteConfig.copyrightYearStart
      ? `${siteConfig.copyrightYearStart}–${currentYear}`
      : `${siteConfig.copyrightYearStart}`;

  return (
    <>
      <Head>
        <title>{siteConfig.pages.copyright.title}</title>
        <meta name="description" content={siteConfig.pages.copyright.description} />
        <meta property="og:type" content="website" />
      </Head>
      <SectionPageLayout>
        <div className={`${styles.friendLinkSection} ${styles.copyrightSection}`}>
          <h2>Copyright &amp; License</h2>

          <article className={styles.copyrightArticle} lang="en">
            <p>
              Unless otherwise stated, the source code of this website is licensed under the{' '}
              <a href={MIT_URL} target="_blank" rel="noopener noreferrer">MIT License</a>.
            </p>
            <p>
              Unless otherwise stated, all original content published on this website, including
              but not limited to articles, images, notes, designs, fictional settings, and other
              creative works, is licensed under the{' '}
              <a href={CC_URL} target="_blank" rel="noopener noreferrer">
                Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License
                (CC BY-NC-ND 4.0)
              </a>.
            </p>
            <p>You may share and redistribute the original content in any medium or format, provided that:</p>
            <ol>
              <li>proper credit is given to {siteConfig.author};</li>
              <li>a link to the original source is provided;</li>
              <li>the use is non-commercial;</li>
              <li>the content is shared in its original, unmodified form;</li>
              <li>no additional restrictions are applied to prevent others from exercising the rights granted by the license.</li>
            </ol>
            <p>
              Without explicit permission, you may not use the original content for commercial
              purposes, commercial promotion, paid publications, paywalled content, dataset
              collection, model training, translation, adaptation, remixing, rewriting,
              excerpt-based republication, or any other form of distributing modified or derivative
              works.
            </p>
            <p>
              Reasonable quotation for commentary, research, education, or reference is allowed,
              provided that attribution and the original link are included, and that the quotation
              does not misrepresent the original context or meaning.
            </p>
            <p>
              Content that is not created by the site owner, such as third-party images, quoted
              materials, trademarks, game assets, or externally sourced media, remains subject to
              the rights and licenses of its respective owners.
            </p>
            <p>
              For commercial use, translation, adaptation, archival use, dataset use, model
              training, or any other special use case, please contact the author in advance:{' '}
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
            </p>
          </article>

          <hr className={styles.copyrightDivider} aria-hidden="true" />

          <article className={styles.copyrightArticle} lang="zh-CN">
            <h3>版权与许可</h3>
            <p>
              除特别声明外，本站源代码采用{' '}
              <a href={MIT_URL} target="_blank" rel="noopener noreferrer">MIT License</a> 许可。
            </p>
            <p>
              除特别声明外，本站原创内容，包括但不限于文章、图片、笔记、设计作品、架空设定及其他创作内容，采用{' '}
              <a href={CC_URL} target="_blank" rel="noopener noreferrer">
                Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License
                （CC BY-NC-ND 4.0，署名—非商业性使用—禁止演绎）
              </a>
              许可协议发布。
            </p>
            <p>您可以在遵守以下条件的前提下，以任何媒介或格式分享、转载本站原创内容：</p>
            <ol>
              <li>保留作者署名：{siteConfig.author}；</li>
              <li>保留原文链接；</li>
              <li>仅用于非商业目的；</li>
              <li>以原始、未修改的形式分享；</li>
              <li>不得添加额外限制，阻止他人行使本许可协议允许的权利。</li>
            </ol>
            <p>
              未经作者明确许可，您不得将本站原创内容用于商业用途、商业推广、付费出版、付费墙内容、
              数据集收录、模型训练、翻译、改编、混剪、重写、摘编式再发布，或以其他形式发布修改后、
              演绎后、重组后的作品。
            </p>
            <p>
              出于评论、研究、教育或参考目的的合理引用是允许的，但应保留作者署名与原文链接，
              且不得歪曲、割裂或误导性呈现原文语境与含义。
            </p>
            <p>
              非本站作者创作的内容，例如第三方图片、引用材料、商标、游戏素材或外部媒体，
              仍归其原权利人所有，并受其各自许可协议或权利声明约束。
            </p>
            <p>
              如需商业使用、翻译、改编、归档、数据集收录、模型训练或其他特殊用途，请提前联系作者获得授权：{' '}
              <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>。
            </p>
          </article>

          <p className={styles.copyrightStamp}>
            © {yearRange} {siteConfig.author}
          </p>
        </div>
      </SectionPageLayout>
    </>
  );
}
