import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { PREFERENCE_STORAGE_KEY, THEME_MODE, type ThemeMode } from "../../constants/preferences";

type EffectiveTheme = "light" | "dark";

type ThemeContextValue = {
  theme: ThemeMode;
  effectiveTheme: EffectiveTheme;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function isThemeMode(value: unknown): value is ThemeMode {
  return value === THEME_MODE.light || value === THEME_MODE.dark || value === THEME_MODE.system;
}

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(PREFERENCE_STORAGE_KEY.theme);
  return isThemeMode(stored) ? stored : THEME_MODE.system;
}

function getSystemTheme(): EffectiveTheme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? THEME_MODE.dark : THEME_MODE.light;
}

function resolveTheme(theme: ThemeMode): EffectiveTheme {
  return theme === THEME_MODE.system ? getSystemTheme() : theme;
}

function applyTheme(theme: EffectiveTheme) {
  document.documentElement.classList.toggle("dark", theme === THEME_MODE.dark);
  document.documentElement.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<EffectiveTheme>(() => resolveTheme(getStoredTheme()));

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const syncTheme = () => {
      const next = resolveTheme(theme);
      setEffectiveTheme(next);
      applyTheme(next);
    };

    syncTheme();

    if (theme !== THEME_MODE.system) {
      return undefined;
    }

    mediaQuery.addEventListener("change", syncTheme);
    return () => mediaQuery.removeEventListener("change", syncTheme);
  }, [theme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      effectiveTheme,
      setTheme: (nextTheme) => {
        localStorage.setItem(PREFERENCE_STORAGE_KEY.theme, nextTheme);
        setThemeState(nextTheme);
      }
    }),
    [effectiveTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
