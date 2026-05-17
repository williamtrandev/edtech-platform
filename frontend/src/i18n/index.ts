import { type Language } from "../constants/preferences";
import { useLanguage } from "../features/preferences/language-context";
import enAuth from "./locales/en/auth.json";
import enHome from "./locales/en/home.json";
import enProfile from "./locales/en/profile.json";
import viAuth from "./locales/vi/auth.json";
import viHome from "./locales/vi/home.json";
import viProfile from "./locales/vi/profile.json";

const en = {
  ...enHome,
  ...enAuth,
  ...enProfile
} as const;

const vi = {
  ...viHome,
  ...viAuth,
  ...viProfile
} as const;

const dictionaries: Record<Language, Record<string, string>> = {
  en: en,
  vi: vi
};

export type I18nKey = keyof typeof en;

export function isI18nKey(value: string): value is I18nKey {
  return value in en;
}

export function translate(language: Language, key: I18nKey): string {
  return dictionaries[language][key] ?? dictionaries.en[key] ?? key;
}

export function getLocalizedErrorMessage(error: unknown, fallbackKey: I18nKey, t: (key: I18nKey) => string): string {
  if (!(error instanceof Error)) {
    return t(fallbackKey);
  }

  const message = error.message.trim();
  if (!message) {
    return t(fallbackKey);
  }

  return isI18nKey(message) ? t(message) : message;
}

export function useI18n() {
  const { language } = useLanguage();

  return {
    language,
    t: (key: I18nKey) => translate(language, key)
  };
}
