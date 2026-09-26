'use client';

import { Moon, Sun } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { getT } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

const FocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background';

/** Locales the app ships translations for, in the order the switch lists them. */
const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'vi'];

/**
 * Language (EN/VI) and light/dark switches for the public pages that have no sidebar: the home
 * page, the documentation pages (/readme, /confluence) and /login.
 *
 * It writes to the shared app settings, so the choice also drives the theme applied by
 * ThemeProvider and the documentation language variant shown on /confluence.
 */
export default function LanguageThemeSwitch() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const t = getT(settings.locale);

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label={t.language}
        className="flex items-center gap-0.5 rounded-lg border border-border/70 bg-card/60 p-1"
      >
        {SUPPORTED_LOCALES.map((localeOption) => (
          <button
            key={`locale-${localeOption}`}
            type="button"
            onClick={() => updateSettings({ locale: localeOption })}
            aria-pressed={settings.locale === localeOption}
            aria-label={localeOption === 'en' ? t.languageEnglish : t.languageVietnamese}
            className={`rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors ${
              settings.locale === localeOption
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            } ${FocusRing}`}
          >
            {localeOption}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
        aria-label={settings.theme === 'dark' ? t.lightMode : t.darkMode}
        title={settings.theme === 'dark' ? t.lightMode : t.darkMode}
        className={`rounded-lg border border-border/70 bg-card/60 p-2 text-muted-foreground transition-colors hover:text-foreground ${FocusRing}`}
      >
        {settings.theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
    </div>
  );
}
