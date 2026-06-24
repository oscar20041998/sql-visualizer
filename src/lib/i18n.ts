import en from '../locales/en';
import vi from '../locales/vi';

export type Locale = 'en' | 'vi';

export const translations = {
  en,
  vi,
} as const;

export type TranslationKey = keyof typeof translations.en;
export type Translations = typeof translations.en;

export function getT(locale: Locale): Translations {
  return translations[locale];
}
