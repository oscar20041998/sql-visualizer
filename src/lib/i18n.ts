import en from '../locales/en';
import vi from '../locales/vi';

export type Locale = 'en' | 'vi';

type TranslationSchema = {
  [K in keyof typeof en]: string;
};

export const translations = {
  en,
  vi,
} satisfies Record<Locale, TranslationSchema>;

export type TranslationKey = keyof typeof translations.en;
export type Translations = TranslationSchema;

export function getT(locale: Locale): Translations {
  return translations[locale];
}
