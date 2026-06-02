import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { AssignmentRubricCriterionInput } from "../lib/assignment-rubric";
import { sumRubricMaxPoints } from "../lib/assignment-rubric";
import { useI18n } from "../i18n";
import { FormField } from "./form-field";

type AssignmentRubricEditorProps = {
  criteria: AssignmentRubricCriterionInput[];
  onChange: (criteria: AssignmentRubricCriterionInput[]) => void;
  disabled?: boolean;
  className?: string;
};

const emptyCriterion = (): AssignmentRubricCriterionInput => ({
  title: "",
  description: null,
  maxPoints: 10
});

export function AssignmentRubricEditor({ criteria, onChange, disabled = false, className }: AssignmentRubricEditorProps) {
  const { t } = useI18n();
  const totalPoints = sumRubricMaxPoints(criteria);

  const updateCriterion = (index: number, patch: Partial<AssignmentRubricCriterionInput>) => {
    onChange(criteria.map((criterion, criterionIndex) => (criterionIndex === index ? { ...criterion, ...patch } : criterion)));
  };

  const removeCriterion = (index: number) => {
    onChange(criteria.filter((_, criterionIndex) => criterionIndex !== index));
  };

  return (
    <div className={cn("grid gap-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{t("courseDetail.rubric")}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{t("courseDetail.rubricDescription")}</p>
        </div>
        {criteria.length > 0 ? (
          <span className="rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {t("courseDetail.rubricTotalPoints").replace("{{total}}", String(totalPoints))}
          </span>
        ) : null}
      </div>

      {criteria.length === 0 ? (
        <p className="rounded-lg bg-muted/30 px-3 py-3 text-sm text-muted-foreground">{t("courseDetail.rubricEmpty")}</p>
      ) : (
        <div className="grid gap-3">
          {criteria.map((criterion, index) => (
            <div key={`rubric-${index}`} className="grid gap-3 rounded-lg bg-muted/20 p-4 ring-1 ring-foreground/10">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("courseDetail.rubricCriterionLabel").replace("{{index}}", String(index + 1))}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md text-destructive hover:text-destructive"
                  disabled={disabled}
                  onClick={() => removeCriterion(index)}
                  aria-label={t("courseDetail.removeRubricCriterion")}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              <FormField id={`rubric-title-${index}`} label={t("courseDetail.rubricCriterionTitle")}>
                <Input
                  id={`rubric-title-${index}`}
                  value={criterion.title}
                  disabled={disabled}
                  placeholder={t("courseDetail.rubricCriterionTitlePlaceholder")}
                  onChange={(event) => updateCriterion(index, { title: event.target.value })}
                />
              </FormField>
              <FormField id={`rubric-max-${index}`} label={t("courseDetail.rubricCriterionMaxPoints")}>
                <Input
                  id={`rubric-max-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  value={criterion.maxPoints}
                  disabled={disabled}
                  onChange={(event) => updateCriterion(index, { maxPoints: Number(event.target.value) || 0 })}
                />
              </FormField>
            </div>
          ))}
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="h-10 w-full rounded-md shadow-none sm:w-auto"
        disabled={disabled || criteria.length >= 20}
        onClick={() => onChange([...criteria, emptyCriterion()])}
      >
        <Plus className="mr-2 size-4" aria-hidden />
        {t("courseDetail.addRubricCriterion")}
      </Button>
    </div>
  );
}

type AssignmentRubricBreakdownProps = {
  scores: Array<{ criterionId: string; points: number; criterion: { title: string; maxPoints: number } }>;
  className?: string;
};

export function AssignmentRubricBreakdown({ scores, className }: AssignmentRubricBreakdownProps) {
  const { t } = useI18n();

  if (!scores.length) {
    return null;
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("courseDetail.rubricBreakdown")}</p>
      <ul className="grid gap-2">
        {scores.map((score) => (
          <li key={score.criterionId} className="flex items-center justify-between gap-3 rounded-md bg-background/70 px-3 py-2 text-sm ring-1 ring-foreground/10">
            <span className="min-w-0 truncate font-medium">{score.criterion.title}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {score.points} / {score.criterion.maxPoints}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
