/**
 * HreflangLinks — 在 <Head> 中输出三语 + x-default 的 hreflang 交叉引用，
 * 方便搜索引擎理解站点 i18n 结构并按访客语言推荐正确版本。
 *
 * basePath 不含 locale 前缀，例如：'/' 或 '/blog/init'。
 */
import { locales, defaultLocale } from '@/shared/contracts/locale';
import { getSiteUrl } from '@/shared/config/site';

interface Props {
  basePath: string;
}

export default function HreflangLinks({ basePath }: Props) {
  const siteUrl = getSiteUrl();
  const path = basePath === '/' ? '' : basePath;
  return (
    <>
      {locales.map((loc) => (
        <link
          key={loc}
          rel="alternate"
          hrefLang={loc === 'zh-CN' ? 'zh-Hans' : loc === 'zh-TW' ? 'zh-Hant' : 'en'}
          href={`${siteUrl}/${loc}${path}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${siteUrl}/${defaultLocale}${path}`}
      />
    </>
  );
}
