import { useCallback, useMemo, useState } from 'react';
import type { Locale } from '../i18n/config';

interface NavLink {
  label: string;
  hash: string;
  group: 'content' | 'standalone';
}

const commonLabelFallbacks: Record<Locale, Record<'openMenu' | 'closeMenu', string>> = {
  'zh-CN': {
    openMenu: '打开菜单',
    closeMenu: '关闭菜单',
  },
  'zh-TW': {
    openMenu: '開啟選單',
    closeMenu: '關閉選單',
  },
  en: {
    openMenu: 'Open Menu',
    closeMenu: 'Close Menu',
  },
};

interface UseDrawerNavigationOptions {
  locale: Locale;
  tNav: (key: string) => string;
  tCommon: (key: string) => string;
}

export default function useDrawerNavigation({
  locale,
  tNav,
  tCommon,
}: UseDrawerNavigationOptions) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleDrawer = useCallback(() => {
    setDrawerOpen((previous) => !previous);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  const navLinks = useMemo<NavLink[]>(() => ([
    { label: tNav('works'), hash: 'works', group: 'content' },
    { label: tNav('experience'), hash: 'experience', group: 'content' },
    { label: tNav('blog'), hash: 'blog', group: 'content' },
    { label: tNav('life'), hash: 'life', group: 'content' },
    { label: tNav('contact'), hash: 'contact', group: 'content' },
    { label: tNav('tweets'), hash: 'tweets', group: 'standalone' },
    { label: tNav('about'), hash: 'about', group: 'standalone' },
    { label: tNav('friends'), hash: 'friends', group: 'standalone' },
  ]), [tNav]);

  const resolveCommonLabel = useCallback((key: 'openMenu' | 'closeMenu') => {
    const translated = tCommon(key);
    return translated === key ? commonLabelFallbacks[locale][key] : translated;
  }, [locale, tCommon]);

  return {
    drawerOpen,
    navLinks,
    drawerToggleLabel: drawerOpen ? resolveCommonLabel('closeMenu') : resolveCommonLabel('openMenu'),
    toggleDrawer,
    closeDrawer,
  };
}
