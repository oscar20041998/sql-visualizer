'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';

const COLOR_PRESETS: Record<string, { dark: string; light: string }> = {
  '#6ee7f7': { dark: '#6ee7f7', light: '#0969da' }, // cyan -> blue
  '#a78bfa': { dark: '#a78bfa', light: '#8250df' }, // purple -> purple
  '#34d399': { dark: '#34d399', light: '#059669' }, // emerald -> green
  '#fb923c': { dark: '#fb923c', light: '#ea580c' }, // orange -> orange
  '#f472b6': { dark: '#f472b6', light: '#c5192d' }, // pink -> red
};

/**
 * Applies the stored theme (and accent color) to <html> for the public pages that are not wrapped
 * in AppLayout — currently the home page and the /confluence documentation page.
 *
 * It renders no markup of its own, so it can be placed anywhere in those pages' trees; it mirrors
 * the effect AppLayout runs for post-login pages (see specs/006-login-ui-redesign, R2).
 */
export default function ThemeProvider({ children }: { children?: React.ReactNode }) {
  const { settings } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    const isDark = settings.theme === 'dark';
    const selectedColor = settings.accentColor || '#6ee7f7';
    const colorMap = COLOR_PRESETS[selectedColor] || COLOR_PRESETS['#6ee7f7'];
    const primaryColor = isDark ? colorMap.dark : colorMap.light;

    // Apply theme class. Both classes are set explicitly because Tailwind uses `darkMode: 'class'`:
    // without the `dark` class the `dark:` utilities stay inactive, and without `light` the
    // light tokens never override the dark ones declared on `:root`.
    if (isDark) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Apply primary color
    root.style.setProperty('--primary', primaryColor);

    // Update primary-foreground based on theme
    root.style.setProperty('--primary-foreground', isDark ? '#0d1117' : '#ffffff');
  }, [settings.theme, settings.accentColor]);

  return <>{children}</>;
}
