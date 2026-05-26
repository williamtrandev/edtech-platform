import { type Language } from "../constants/preferences";
import { resolveErrorMessage } from "../lib/api-error";
import { useLanguage } from "../hooks/use-language";
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

const ERROR_CODE_ALIASES: Partial<Record<string, I18nKey>> = {
  NETWORK_ERROR: "errors.network",
  TIMEOUT: "errors.timeout",
  HTTP_ERROR: "errors.unexpected"
};

export function getLocalizedErrorMessage(error: unknown, fallbackKey: I18nKey, t: (key: I18nKey) => string): string {
  if (error instanceof Error) {
    const messageKey = error.message.trim();
    if (isI18nKey(messageKey)) {
      return t(messageKey);
    }
  }

  return resolveErrorMessage(error, t(fallbackKey), (code, statusCode) => {
    const alias = ERROR_CODE_ALIASES[code];
    if (alias) {
      return t(alias);
    }

    const apiKey = `errors.api.${code}` as I18nKey;
    if (isI18nKey(apiKey)) {
      return t(apiKey);
    }

    if (statusCode) {
      const statusKey = `errors.http.${statusCode}` as I18nKey;
      if (isI18nKey(statusKey)) {
        return t(statusKey);
      }
    }

    return null;
  });
}

export function getErrorMessage(error: unknown, fallbackKey: I18nKey, language: Language): string {
  return getLocalizedErrorMessage(error, fallbackKey, (key) => translate(language, key));
}

export function useI18n() {
  const { language } = useLanguage();

  return {
    language,
    t: (key: I18nKey) => translate(language, key),
    formatError: (error: unknown, fallbackKey: I18nKey) =>
      getLocalizedErrorMessage(error, fallbackKey, (key) => translate(language, key))
  };
}
