import { useEffect, useState } from 'react';

/**
 * 从 proxy.ts 写入的 `GEO_COUNTRY` cookie 读取访客所在国家二字码（如 'CN'）。
 *
 * - SSR / 首次 hydration 阶段返回 `null`（未知），保持与服务端 HTML 一致。
 * - 客户端 mount 后读取 cookie；Vercel 之外的环境拿不到，照样返回 `null`。
 * - 仅用于 UI 层面的微调（例如对大陆访客隐藏 X 图标），
 *   不做安全/权限判断，也不强制阻断 —— 未知一律按"显示"处理。
 *
 * 注意：主要的 X 图标显隐由 _document 注入到 <html data-x-blocked> + globals.scss
 * 的 CSS 规则处理，hydration 前就生效，无闪烁。这个 hook 留作其他需要按 country
 * 做逻辑判断（非纯样式）的场景使用。
 */
export default function useVisitorCountry(): string | null {
  const [country, setCountry] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    // 先看 <html data-country>（_document 已写入），再退到 cookie 解析。
    const attr = document.documentElement.getAttribute('data-country');
    if (attr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- DOM 属性是浏览器端才能读到的副作用源，必须在 mount 后同步
      setCountry(attr.toUpperCase());
      return;
    }
    const match = document.cookie.match(/(?:^|;\s*)GEO_COUNTRY=([^;]+)/);
    if (match) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cookie 是浏览器端才能读到的副作用源，必须在 mount 后同步
      setCountry(decodeURIComponent(match[1]).toUpperCase());
    }
  }, []);

  return country;
}
