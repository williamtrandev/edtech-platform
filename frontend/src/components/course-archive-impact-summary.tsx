import { cn } from "@/lib/utils";
import { type I18nKey, useI18n } from "../i18n";
import type { CourseArchiveImpact } from "../services/course.service";

type CourseArchiveImpactSummaryProps = {
  impact: CourseArchiveImpact["impact"];
  className?: string;
};

type ImpactRow = {
  key: I18nKey;
  value: number;
};

export function CourseArchiveImpactSummary({ impact, className }: CourseArchiveImpactSummaryProps) {
  const { t } = useI18n();

  const rows: ImpactRow[] = [
    { key: "courseDetail.archiveImpactEnrollments", value: impact.enrollments },
    { key: "courseDetail.archiveImpactLessons", value: impact.lessons },
    { key: "courseDetail.archiveImpactPublishedExams", value: impact.publishedExams },
    { key: "courseDetail.archiveImpactPublishedAssignments", value: impact.publishedAssignments },
    { key: "courseDetail.archiveImpactActiveCertificates", value: impact.activeCertificates },
    { key: "courseDetail.archiveImpactInProgressExamAttempts", value: impact.inProgressExamAttempts },
    { key: "courseDetail.archiveImpactSubmittedAssignments", value: impact.submittedAssignmentSubmissions }
  ];

  const hasRisk =
    impact.enrollments > 0 ||
    impact.inProgressExamAttempts > 0 ||
    impact.submittedAssignmentSubmissions > 0;

  return (
    <div className={cn("grid gap-3", className)}>
      <p className="text-sm text-muted-foreground">{t("courseDetail.archiveImpactIntro")}</p>
      <ul className="grid gap-2 rounded-lg bg-muted/30 p-3 ring-1 ring-foreground/10">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t(row.key)}</span>
            <span className="shrink-0 font-medium tabular-nums text-foreground">{row.value}</span>
          </li>
        ))}
      </ul>
      {hasRisk ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">{t("courseDetail.archiveImpactWarning")}</p>
      ) : (
        <p className="text-sm text-muted-foreground">{t("courseDetail.archiveImpactLowRisk")}</p>
      )}
    </div>
  );
}
