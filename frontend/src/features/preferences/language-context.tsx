import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { LANGUAGE, PREFERENCE_STORAGE_KEY, type Language } from "../../constants/preferences";

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

function isLanguage(value: unknown): value is Language {
  return value === LANGUAGE.en || value === LANGUAGE.vi;
}

function getStoredLanguage(): Language {
  const stored = localStorage.getItem(PREFERENCE_STORAGE_KEY.language);
  return isLanguage(stored) ? stored : LANGUAGE.en;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getStoredLanguage());

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (nextLanguage) => {
        localStorage.setItem(PREFERENCE_STORAGE_KEY.language, nextLanguage);
        setLanguageState(nextLanguage);
      }
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }

  return context;
}
