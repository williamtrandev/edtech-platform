export const THEME_MODE = {
  light: "light",
  dark: "dark",
  system: "system"
} as const;

export type ThemeMode = (typeof THEME_MODE)[keyof typeof THEME_MODE];

export const LANGUAGE = {
  en: "en",
  vi: "vi"
} as const;

export type Language = (typeof LANGUAGE)[keyof typeof LANGUAGE];

export const PREFERENCE_STORAGE_KEY = {
  theme: "edtech.theme",
  language: "edtech.language"
} as const;

export const THEME_LABEL = {
  [THEME_MODE.light]: "Light",
  [THEME_MODE.dark]: "Dark",
  [THEME_MODE.system]: "System"
} as const;

export const LANGUAGE_LABEL = {
  [LANGUAGE.en]: "English",
  [LANGUAGE.vi]: "Tiếng Việt"
} as const;
