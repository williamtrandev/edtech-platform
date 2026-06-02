import { ClipboardCheck, History, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLearnerCourseAnalytics } from "../hooks/use-learner-course-analytics";
import { useI18n } from "../i18n";
import { cn } from "@/lib/utils";
import type { LearnerGradeHistoryItem } from "../services/learner-analytics.service";

function formatScore(score: number, maxScore: number | null) {
  if (maxScore !== null && maxScore > 0) {
    return `${score}/${maxScore}`;
  }

  return String(score);
}

function GradeRow({ item }: { item: LearnerGradeHistoryItem }) {
  const { t } = useI18n();
  const typeLabel = item.type === "EXAM" ? t("progress.gradeTypeExam") : t("progress.gradeTypeAssignment");

  return (
    <li className="relative pl-4">
      <span className="absolute left-0 top-2 size-1.5 rounded-full bg-border" aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-foreground">{item.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="h-5 rounded px-1 text-[10px] font-medium">
              {typeLabel}
            </Badge>
            {item.passed === true ? (
              <span className="text-[10px] font-medium text-primary">{t("progress.passed")}</span>
            ) : null}
            {item.passed === false ? (
              <span className="text-[10px] font-medium text-destructive">{t("progress.notPassed")}</span>
            ) : null}
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">{new Date(item.occurredAt).toLocaleDateString()}</p>
        </div>
        <p className="shrink-0 font-mono text-xs font-semibold tabular-nums text-foreground">
          {formatScore(item.score, item.maxScore)}
        </p>
      </div>
    </li>
  );
}

type CourseGradeTimelineProps = {
  courseId: string;
  enabled?: boolean;
  className?: string;
};

export function CourseGradeTimeline({ courseId, enabled = true, className }: CourseGradeTimelineProps) {
  const { t } = useI18n();
  const { data, isLoading, isError } = useLearnerCourseAnalytics(courseId, enabled);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 px-2 py-3 text-xs text-muted-foreground", className)}>
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        {t("courseLearn.gradesLoading")}
      </div>
    );
  }

  if (isError || !data) {
    return <p className={cn("px-2 py-3 text-xs text-muted-foreground", className)}>{t("courseLearn.gradesLoadFailed")}</p>;
  }

  const pendingTotal = data.assessments.exams.pendingGrades + data.assessments.assignments.pendingGrades;

  return (
    <section className={cn("space-y-3 border-t border-border/60 px-2 py-3", className)} aria-label={t("courseLearn.gradeTimeline")}>
      <div className="flex items-center gap-2">
        <History className="size-3.5 text-muted-foreground" aria-hidden />
        <h2 className="text-xs font-semibold text-foreground">{t("courseLearn.gradeTimeline")}</h2>
      </div>

      {pendingTotal > 0 ? (
        <p className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2 py-1.5 text-[11px] text-muted-foreground">
          <ClipboardCheck className="mt-0.5 size-3 shrink-0" aria-hidden />
          {t("courseLearn.pendingGrades").replace("{count}", String(pendingTotal))}
        </p>
      ) : null}

      {data.gradeHistory.length ? (
        <ol className="space-y-3">
          {data.gradeHistory.map((item) => (
            <GradeRow key={`${item.type}-${item.id}`} item={item} />
          ))}
        </ol>
      ) : (
        <p className="text-[11px] text-muted-foreground">{t("courseLearn.noGradesYet")}</p>
      )}
    </section>
  );
}
