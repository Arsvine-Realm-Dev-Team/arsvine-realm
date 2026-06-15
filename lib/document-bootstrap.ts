import { isBilibiliBlockedRegion, isXBlockedRegion } from './region-visibility';

export const POWER_SYSTEM_STORAGE_KEY = 'arsvine:power-system';
export const THEME_MODE_STORAGE_KEY = 'arsvine:theme-mode';

export function buildDocumentBootstrapScript() {
  const xBlockedCountries = JSON.stringify(Array.from(new Set(['CN', 'IR', 'KP', 'TM'])));
  const bilibiliFriendlyCountries = JSON.stringify(Array.from(new Set(['CN', 'HK', 'MO', 'TW'])));

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
      if (country && html.getAttribute('data-country') !== country) {
        html.setAttribute('data-country', country);
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

export function resolveRegionAttributes(country: string) {
  return {
    xBlocked: isXBlockedRegion(country),
    bilibiliBlocked: isBilibiliBlockedRegion(country),
  };
}
