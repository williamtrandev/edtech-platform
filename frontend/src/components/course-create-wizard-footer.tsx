import { Button } from "@/components/ui/button";
import { useI18n } from "../i18n";

type CourseCreateWizardFooterProps = {
  showBack: boolean;
  continueLabel: string;
  continueDisabled?: boolean;
  continueLoading?: boolean;
  onBack: () => void;
  onContinue: () => void;
};

export function CourseCreateWizardFooter({
  showBack,
  continueLabel,
  continueDisabled,
  continueLoading,
  onBack,
  onContinue
}: CourseCreateWizardFooterProps) {
  const { t } = useI18n();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
      {showBack ? (
        <Button type="button" variant="outline" className="h-10 rounded-md shadow-none" onClick={onBack}>
          {t("courseStudio.wizardBack")}
        </Button>
      ) : (
        <span />
      )}
      <Button
        type="button"
        className="h-10 rounded-md font-medium shadow-none"
        disabled={continueDisabled || continueLoading}
        onClick={onContinue}
      >
        {continueLoading ? t("common.loading") : continueLabel}
      </Button>
    </div>
  );
}
