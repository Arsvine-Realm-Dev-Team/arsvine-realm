import { NextResponse, type NextRequest } from 'next/server';
import { geolocation } from '@vercel/functions';
import { locales, defaultLocale, isLocale, type Locale } from './i18n/config';

// 客户端通过该 cookie 读取访客国家二字码（例如 'CN'）。仅供 UI 微调使用，
// 不参与权限/安全决策。Vercel 之外的环境会拿不到 country，按未知处理。
const GEO_COOKIE = 'GEO_COUNTRY';
const GEO_COOKIE_MAX_AGE = 60 * 60 * 12; // 12h
// 客户端可用 ?_geo=US 临时覆盖 country（dev 调试 / 用户验证开了 VPN 后效果），
// ?_geo= 清空覆盖。覆盖也会写进 GEO_COUNTRY cookie，下次 SSR 立即反映。
const GEO_OVERRIDE_PARAM = '_geo';
// middleware → page handler 单跳同步：把 country 透传到下游请求 header，
// _document.getInitialProps 优先读这个 header，确保"同一次刷新就能反映最新 geo"
// （否则需要等浏览器写入 cookie + 第二次刷新，VPN 切换体验 = 12h 滞后）。
const GEO_HEADER = 'x-geo-country';

// 这些 path 前缀完全跳过 proxy，避免 favicon/API/asset 被 i18n 路由污染
const BYPASS_PREFIXES = [
  '/api',
  '/_next',
  '/_vercel',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/icons',
  '/fonts',
  '/images',
  '/decor',
  '/music',
  '/robots.txt',
  '/sitemap.xml',
  '/rss.xml',
];

function shouldBypass(pathname: string): boolean {
  if (BYPASS_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  // 任何带文件扩展名的路径都视为静态资源，bypass
  // （pages/[locale] 路由不会以 .xxx 结尾）
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return true;
  }
  return false;
}

// 形似 BCP-47 短 locale 的正则：两位语言码，可选两~四位脚本/区域后缀。
// 用于识别 /fr/web/1、/ja/about 这类"未支持的 locale 候选"段，
// 避免被当成裸业务路径再前置 locale（旧 bug：/fr/web/1 → /en/fr/web/1）。
const LOOKS_LIKE_LOCALE = /^[a-z]{2}(-[A-Za-z]{2,4})?$/;

function pickLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return defaultLocale;
  // 简单实现：按权重排序，挑第一个能匹配到的 locale
  const tags = acceptLanguage
    .split(',')
    .map((part) => {
      const [tag, qStr] = part.trim().split(';q=');
      return { tag: tag.toLowerCase(), q: qStr ? Number(qStr) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of tags) {
    if (tag.startsWith('en')) return 'en';
    if (tag === 'zh-tw' || tag === 'zh-hk' || tag === 'zh-hant' || tag.startsWith('zh-hant')) return 'zh-TW';
    if (tag === 'zh' || tag.startsWith('zh-cn') || tag.startsWith('zh-hans') || tag.startsWith('zh')) return 'zh-CN';
  }
  return defaultLocale;
}

/**
 * 解析当前请求的"有效 country"，优先级：
 *   1. URL ?_geo=XX 显式覆盖（dev 调试 / 用户切换 VPN 后强制刷新）
 *      - 空值 ?_geo= 表示清除覆盖
 *      - 非两位字母按未知处理，但仍会清除 cookie，避免被旧值卡住
 *   2. Vercel 边缘 geolocation() 实时探测
 *   3. 已有的 GEO_COUNTRY cookie（最后兜底）
 *
 * 返回的 country 永远是大写两位码或空串。
 */
function resolveCountry(request: NextRequest): { country: string; overrideAction: 'set' | 'clear' | 'none' } {
  const overrideRaw = request.nextUrl.searchParams.get(GEO_OVERRIDE_PARAM);
  if (overrideRaw !== null) {
    const trimmed = overrideRaw.trim().toUpperCase();
    if (trimmed === '') return { country: '', overrideAction: 'clear' };
    if (/^[A-Z]{2}$/.test(trimmed)) return { country: trimmed, overrideAction: 'set' };
    // 无效值：忽略，按未覆盖处理
  }
  const geo = geolocation(request).country?.toUpperCase() ?? '';
  if (geo) return { country: geo, overrideAction: 'none' };
  const cookie = request.cookies.get(GEO_COOKIE)?.value?.toUpperCase() ?? '';
  return { country: cookie, overrideAction: 'none' };
}

/**
 * 同步 cookie + 透传 header 给下游 page handler。
 *
 * 关键不变量："同一次 HTTP 响应"就要让 SSR 拿到最新 country —— 因为 cookie
 * 是写在响应上的，下游 SSR 仍然读到旧 cookie。所以这里在转发请求时往
 * 请求 header 里塞 country，_document.getInitialProps 优先读它。
 */
function attachGeo(
  response: NextResponse,
  request: NextRequest,
  country: string,
  overrideAction: 'set' | 'clear' | 'none',
): NextResponse {
  const existingCookie = request.cookies.get(GEO_COOKIE)?.value ?? '';
  if (overrideAction === 'clear') {
    if (existingCookie) {
      response.cookies.set(GEO_COOKIE, '', { path: '/', maxAge: 0, sameSite: 'lax' });
    }
  } else if (country && country !== existingCookie) {
    response.cookies.set(GEO_COOKIE, country, {
      path: '/',
      maxAge: GEO_COOKIE_MAX_AGE,
      sameSite: 'lax',
    });
  }
  return response;
}

/**
 * 用 next() 转发请求时，需要给请求 header 注入 country —— 浏览器后续刷新前
 * cookie 已生效，所以只在"放行"路径（pathname 已带 locale）需要做。
 */
function nextWithGeoHeader(request: NextRequest, country: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  if (country) {
    requestHeaders.set(GEO_HEADER, country);
  } else {
    requestHeaders.delete(GEO_HEADER);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (shouldBypass(pathname)) {
    return NextResponse.next();
  }

  const { country, overrideAction } = resolveCountry(request);

  // 判断 pathname 第一段是否已经是 locale
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && isLocale(firstSegment)) {
    // 已是合法 locale 路径：直接放行，但要把 country 注入下游请求 header，
    // 让本次 SSR 立即拿到（不依赖浏览器先吃下 Set-Cookie 再刷新）。
    const passthrough = nextWithGeoHeader(request, country);
    return attachGeo(passthrough, request, country, overrideAction);
  }

  // 裸路径：根据 cookie / Accept-Language 决定目标 locale 并 301
  const cookieLocale = request.cookies.get('NEXT_LOCALE')?.value;
  const targetLocale: Locale = (cookieLocale && isLocale(cookieLocale))
    ? cookieLocale
    : pickLocaleFromHeader(request.headers.get('accept-language'));

  // 若第一段长得像 locale 但不在受支持列表（如 /fr/web/1），剥掉它再前置目标 locale，
  // 避免拼出 /en/fr/web/1 这种 404 路径。
  const rest = firstSegment && LOOKS_LIKE_LOCALE.test(firstSegment)
    ? '/' + segments.slice(1).join('/')
    : pathname;

  const url = request.nextUrl.clone();
  url.pathname = `/${targetLocale}${rest === '/' ? '' : rest}`;
  // 保留覆盖参数（?_geo=...），让 redirect 之后的 SSR 也走同一套覆盖逻辑
  return attachGeo(NextResponse.redirect(url, 308), request, country, overrideAction);
}

export const config = {
  // 匹配除 _next、API、静态文件以外的所有路径。文件级 bypass 在
  // shouldBypass 中按扩展名兜底，这里只排除常见前缀以减少 proxy 调用。
  matcher: ['/((?!_next|_vercel|api|.*\\.[a-z0-9]+$).*)'],
};

// 静默引用 locales 让 tree-shake 不去掉它
void locales;
