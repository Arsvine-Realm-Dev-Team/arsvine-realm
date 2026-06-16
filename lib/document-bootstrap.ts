import { BILIBILI_FRIENDLY_COUNTRIES, HIDE_X_COUNTRIES } from './region-visibility';

export const POWER_SYSTEM_STORAGE_KEY = 'arsvine:power-system';
export const THEME_MODE_STORAGE_KEY = 'arsvine:theme-mode';

/**
 * 同步内联脚本 —— 在 hydration / CSS 应用之前跑：
 *   1. 从 sessionStorage / localStorage 恢复 power-system 与 theme-mode（避免反转模式闪烁）；
 *   2. 从 GEO_COUNTRY cookie 读 country，写到 <html data-country / data-x-blocked / data-bilibili-blocked>。
 *
 * 这是 SSR 不再注入 country 后的唯一来源，目的是消除 SSG/ISR 产物被 CDN 共享缓存
 * 时的 country 污染（不同地区访客拿到同一份静态产物）。脚本是同步执行，CSS 命中前完成，
 * 不会出现"先显示再隐藏"的首屏闪烁。
 *
 * 集合常量（HIDE_X_COUNTRIES / BILIBILI_FRIENDLY_COUNTRIES）从 region-visibility 模块导出，
 * 单一真相；这里序列化进 inline script。
 */
export function buildDocumentBootstrapScript() {
  const xBlockedCountries = JSON.stringify(Array.from(HIDE_X_COUNTRIES));
  const bilibiliFriendlyCountries = JSON.stringify(Array.from(BILIBILI_FRIENDLY_COUNTRIES));

  return `(() => {
    try {
      const html = document.documentElement;
      const powerRaw = sessionStorage.getItem('${POWER_SYSTEM_STORAGE_KEY}') || localStorage.getItem('${POWER_SYSTEM_STORAGE_KEY}');
      if (powerRaw) {
        const power = JSON.parse(powerRaw);
        if (power && power.powerLevel === 100 && power.isDischarging === false) {
          html.setAttribute('data-theme-mode', 'inverted');
        } else if (html.getAttribute('data-theme-mode') === 'inverted') {
          html.setAttribute('data-theme-mode', 'default');
        }
      }

      const themeMode = sessionStorage.getItem('${THEME_MODE_STORAGE_KEY}') || localStorage.getItem('${THEME_MODE_STORAGE_KEY}');
      if (themeMode === 'inverted') {
        html.setAttribute('data-theme-mode', 'inverted');
      } else if (themeMode === 'default' && html.getAttribute('data-theme-mode') === 'inverted') {
        html.setAttribute('data-theme-mode', 'default');
      }

      const match = document.cookie.match(/(?:^|;\\s*)GEO_COUNTRY=([^;]+)/);
      const country = match ? decodeURIComponent(match[1]).toUpperCase() : '';
      if (country) {
        html.setAttribute('data-country', country);
      } else {
        html.removeAttribute('data-country');
      }

      const xBlockedCountries = ${xBlockedCountries};
      const bilibiliFriendlyCountries = ${bilibiliFriendlyCountries};
      const xBlocked = country !== '' && xBlockedCountries.includes(country);
      const bilibiliBlocked = country !== '' && !bilibiliFriendlyCountries.includes(country);

      if (xBlocked) {
        html.setAttribute('data-x-blocked', 'true');
      } else {
        html.removeAttribute('data-x-blocked');
      }

      if (bilibiliBlocked) {
        html.setAttribute('data-bilibili-blocked', 'true');
      } else {
        html.removeAttribute('data-bilibili-blocked');
      }
    } catch (error) {
      console.error('[document-bootstrap] failed to restore client state', error);
    }
  })();`;
}
