import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LANGUAGE, THEME_MODE, type Language, type ThemeMode } from "../../constants/preferences";
import { useI18n } from "../../i18n";
import { useLanguage } from "./language-context";
import { useTheme } from "./theme-context";

type PreferenceSelectProps = {
  labelId?: string;
  className?: string;
};

export function ThemeSelect({ labelId, className }: PreferenceSelectProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <Select value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
      <SelectTrigger aria-labelledby={labelId} className={cn("w-full sm:w-48", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={THEME_MODE.light}>{t("theme.light")}</SelectItem>
        <SelectItem value={THEME_MODE.dark}>{t("theme.dark")}</SelectItem>
        <SelectItem value={THEME_MODE.system}>{t("theme.system")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function LanguageSelect({ labelId, className }: PreferenceSelectProps) {
  const { language, setLanguage } = useLanguage();
  const { t } = useI18n();

  return (
    <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
      <SelectTrigger aria-labelledby={labelId} className={cn("w-full sm:w-48", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={LANGUAGE.en}>{t("language.en")}</SelectItem>
        <SelectItem value={LANGUAGE.vi}>{t("language.vi")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
