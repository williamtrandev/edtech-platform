import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CourseCreateStepDefinition, CourseCreateStepId } from "../lib/course-create-wizard";
import { useI18n } from "../i18n";

type CourseCreateStepperProps = {
  steps: CourseCreateStepDefinition[];
  currentStep: CourseCreateStepId;
  maxReachedIndex: number;
  onStepSelect: (stepId: CourseCreateStepId) => void;
};

function StepConnector({ complete }: { complete: boolean }) {
  return (
    <div
      className={cn("hidden h-px min-w-6 flex-1 sm:block lg:min-w-10", complete ? "bg-foreground/35" : "bg-border")}
      aria-hidden
    />
  );
}

export function CourseCreateStepper({ steps, currentStep, maxReachedIndex, onStepSelect }: CourseCreateStepperProps) {
  const { t } = useI18n();
  const currentIndex = Math.max(0, steps.findIndex((step) => step.id === currentStep));
  const currentStepDef = steps[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <nav aria-label={t("courseStudio.wizardProgress")} className="rounded-xl border border-border/80 bg-card px-4 py-4 shadow-none sm:px-5">
      <div className="flex flex-wrap items-end justify-between gap-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{t("courseStudio.wizardProgress")}</p>
          <p className="mt-1 truncate text-base font-semibold tracking-tight text-foreground">
            {currentStepDef ? t(currentStepDef.labelKey) : ""}
          </p>
        </div>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          <span className="font-medium text-foreground">{currentIndex + 1}</span>
          <span aria-hidden> / </span>
          <span>{steps.length}</span>
        </p>
      </div>

      <div className="mt-4 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-out"
          style={{ width: `${progressPercent}%` }}
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("courseStudio.wizardProgress")}
        />
      </div>

      <ol className="mt-5 flex min-w-0 items-start gap-0 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((step, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = step.id === currentStep;
          const isReachable = index <= maxReachedIndex;
          const isUpcoming = !isComplete && !isCurrent;

          return (
            <li key={step.id} className="flex min-w-[4.5rem] flex-1 items-start sm:min-w-0">
              <button
                type="button"
                disabled={!isReachable}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex w-full min-w-0 flex-col items-center gap-2 rounded-lg px-1 py-1 text-center transition-colors",
                  isReachable ? "cursor-pointer" : "cursor-not-allowed",
                  isReachable && !isCurrent && "hover:bg-muted/60",
                  isCurrent && "bg-muted/50"
                )}
                onClick={() => {
                  if (isReachable) {
                    onStepSelect(step.id);
                  }
                }}
              >
                <span
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full text-xs font-semibold tabular-nums transition-all",
                    isComplete && "bg-foreground text-background",
                    isCurrent && "bg-foreground text-background ring-2 ring-foreground/20 ring-offset-2 ring-offset-card",
                    isUpcoming && isReachable && "bg-background text-foreground ring-1 ring-border",
                    isUpcoming && !isReachable && "bg-muted/50 text-muted-foreground/70 ring-1 ring-border/60"
                  )}
                  aria-hidden
                >
                  {isComplete ? <Check className="size-4 stroke-[2.5]" /> : index + 1}
                </span>
                <span className="flex w-full min-w-0 flex-col items-center gap-0.5 px-0.5">
                  <span
                    className={cn(
                      "line-clamp-2 w-full text-center text-[11px] leading-tight sm:text-xs",
                      isCurrent ? "font-semibold text-foreground" : "font-medium text-muted-foreground",
                      isComplete && "text-foreground/80"
                    )}
                  >
                    {t(step.labelKey)}
                  </span>
                  {step.optional ? (
                    <span className="rounded-full bg-muted px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("courseStudio.stepOptional")}
                    </span>
                  ) : null}
                </span>
              </button>
              {index < steps.length - 1 ? <StepConnector complete={index < currentIndex} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
