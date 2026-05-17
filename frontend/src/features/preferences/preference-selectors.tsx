import { Languages, Monitor, Moon, Sun } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LANGUAGE, THEME_MODE, type Language, type ThemeMode } from "../../constants/preferences";
import { useI18n } from "../../i18n";
import { useLanguage } from "./language-context";
import { useTheme } from "./theme-context";

type PreferenceSelectProps = {
  labelId?: string;
  className?: string;
  variant?: "default" | "icon";
};

function ThemeIcon({ value }: { value: ThemeMode }) {
  if (value === THEME_MODE.light) {
    return <Sun className="size-4" aria-hidden />;
  }
  if (value === THEME_MODE.dark) {
    return <Moon className="size-4" aria-hidden />;
  }
  return <Monitor className="size-4" aria-hidden />;
}

function NextThemeIcon({ value }: { value: "light" | "dark" }) {
  return value === THEME_MODE.dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />;
}

export function ThemeSelect({ labelId, className, variant = "default" }: PreferenceSelectProps) {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const { t } = useI18n();
  const label = t(`theme.${theme}`);

  if (variant === "icon") {
    const nextTheme = effectiveTheme === THEME_MODE.dark ? THEME_MODE.light : THEME_MODE.dark;
    const nextThemeLabel = t(`theme.${nextTheme}`);
    return (
      <button
        type="button"
        aria-label={`${t("settings.themeLabel")}: ${label}. ${nextThemeLabel}`}
        aria-labelledby={labelId}
        title={nextThemeLabel}
        className={cn(
          "inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border/70 bg-background/95 text-foreground transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        onClick={() => setTheme(nextTheme)}
      >
        <NextThemeIcon value={effectiveTheme} />
      </button>
    );
  }

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
      <SelectTrigger
        aria-label={labelId ? undefined : label}
        aria-labelledby={labelId}
        className={cn("w-full sm:w-48", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={THEME_MODE.light}>
          <Sun className="size-4" aria-hidden />
          {t("theme.light")}
        </SelectItem>
        <SelectItem value={THEME_MODE.dark}>
          <Moon className="size-4" aria-hidden />
          {t("theme.dark")}
        </SelectItem>
        <SelectItem value={THEME_MODE.system}>
          <Monitor className="size-4" aria-hidden />
          {t("theme.system")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LanguageSelect({ labelId, className, variant = "default" }: PreferenceSelectProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useI18n();
  const label = t(`language.${language}`);
  const nextLanguage = language === LANGUAGE.en ? LANGUAGE.vi : LANGUAGE.en;

  if (variant === "icon") {
    return (
      <button
        type="button"
        aria-label={`${t("settings.languageLabel")}: ${label}. ${t(`language.${nextLanguage}`)}`}
        aria-labelledby={labelId}
        title={`${t("settings.languageLabel")}: ${label}`}
        className={cn(
          "inline-flex h-9 min-w-12 shrink-0 cursor-pointer items-center justify-center gap-1 rounded-lg border border-border/70 bg-background/95 px-2 text-foreground transition-colors hover:border-border hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        onClick={() => setLanguage(nextLanguage)}
      >
        <Languages className="size-3.5" aria-hidden />
        <span className="text-[10px] font-semibold uppercase leading-none">{language}</span>
      </button>
    );
  }

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger
        aria-label={labelId ? undefined : label}
        aria-labelledby={labelId}
        className={cn("w-full sm:w-48", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={LANGUAGE.en}>
          <span className="font-mono text-xs">EN</span>
          {t("language.en")}
        </SelectItem>
        <SelectItem value={LANGUAGE.vi}>
          <span className="font-mono text-xs">VI</span>
          {t("language.vi")}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
