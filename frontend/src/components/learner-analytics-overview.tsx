import { Link } from "react-router-dom";
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Flame,
  GraduationCap,
  History,
  Trophy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "./metric-card";
import { MetricCardSkeleton } from "./skeleton";
import { useLearnerAnalytics } from "../hooks/use-learner-analytics";
import { useI18n } from "../i18n";
import { getCourseLearnPath } from "../lib/course-learn-path";
import { STUDIO_FORM_SHELL, STUDIO_ROW } from "../lib/studio-ui";
import { cn } from "@/lib/utils";
import type { I18nKey } from "../i18n";
import type { LearnerActivityItem, LearnerActivityType, LearnerGradeHistoryItem } from "../services/learner-analytics.service";

const ACTIVITY_LABEL_KEYS: Record<LearnerActivityType, I18nKey> = {
  ENROLLMENT: "progress.activity.ENROLLMENT",
  LESSON_COMPLETED: "progress.activity.LESSON_COMPLETED",
  EXAM_SUBMITTED: "progress.activity.EXAM_SUBMITTED",
  EXAM_GRADED: "progress.activity.EXAM_GRADED",
  ASSIGNMENT_SUBMITTED: "progress.activity.ASSIGNMENT_SUBMITTED",
  ASSIGNMENT_GRADED: "progress.activity.ASSIGNMENT_GRADED"
};

function withScore(template: string, score: number) {
  return template.replace("{score}", String(score));
}

function formatScore(score: number, maxScore: number | null) {
  if (maxScore !== null && maxScore > 0) {
    return `${score}/${maxScore}`;
  }

  return String(score);
}

function ActivityTypeBadge({ type }: { type: LearnerActivityItem["type"] }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className="rounded-md font-medium">
      {t(ACTIVITY_LABEL_KEYS[type])}
    </Badge>
  );
}

function GradeHistoryRow({ item }: { item: LearnerGradeHistoryItem }) {
  const { t } = useI18n();
  const typeLabel = item.type === "EXAM" ? t("progress.gradeTypeExam") : t("progress.gradeTypeAssignment");

  return (
    <li className={cn(STUDIO_ROW, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
          <Badge variant="secondary" className="rounded-md">
            {typeLabel}
          </Badge>
          {item.passed === true ? (
            <Badge className="rounded-md bg-emerald-600/90 text-white hover:bg-emerald-600/90">{t("progress.passed")}</Badge>
          ) : null}
          {item.passed === false ? (
            <Badge variant="destructive" className="rounded-md">
              {t("progress.notPassed")}
            </Badge>
          ) : null}
        </div>
        <p className="text-xs text-muted-foreground">
          {item.courseTitle} · {new Date(item.occurredAt).toLocaleDateString()}
        </p>
      </div>
      <p className="shrink-0 font-mono text-sm font-semibold tabular-nums text-foreground">
        {formatScore(item.score, item.maxScore)}
      </p>
    </li>
  );
}

export function LearnerAnalyticsOverview() {
  const { data, isLoading, isError } = useLearnerAnalytics();
  const { t } = useI18n();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </section>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </section>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20">
        {t("progress.analyticsLoadFailed")}
      </div>
    );
  }

  const pendingGrades = data.assessments.exams.pendingGrades + data.assessments.assignments.pendingGrades;
  const examAvg = data.assessments.exams.averageScore;
  const assignmentAvg = data.assessments.assignments.averageScore;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={BookOpen}
          label={t("progress.lessonsCompleted")}
          value={data.summary.lessonsCompleted}
          hint={t("progress.lessonsCompletedHint")}
        />
        <MetricCard
          icon={GraduationCap}
          label={t("progress.coursesInProgress")}
          value={data.summary.coursesInProgress}
          hint={t("progress.coursesInProgressHint")}
        />
        <MetricCard
          icon={Trophy}
          label={t("progress.coursesCompleted")}
          value={data.summary.coursesCompleted}
          hint={t("progress.coursesCompletedHint")}
        />
        <MetricCard icon={Flame} label={t("progress.studyStreak")} value={data.summary.studyStreakDays} hint={t("progress.studyStreakHint")} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={ClipboardCheck}
          label={t("progress.examsPassed")}
          value={`${data.assessments.exams.passed}/${data.assessments.exams.totalPublished}`}
          hint={examAvg !== null ? withScore(t("progress.examAverageHint"), examAvg) : t("progress.examsPassedHint")}
        />
        <MetricCard
          icon={Activity}
          label={t("progress.pendingGrades")}
          value={pendingGrades}
          hint={t("progress.pendingGradesHint")}
        />
        <MetricCard
          icon={History}
          label={t("progress.assignmentsGraded")}
          value={data.assessments.assignments.graded}
          hint={
            assignmentAvg !== null
              ? withScore(t("progress.assignmentAverageHint"), assignmentAvg)
              : t("progress.assignmentsGradedHint")
          }
        />
        <MetricCard
          icon={Trophy}
          label={t("progress.certificates")}
          value={data.summary.certificates}
          hint={t("progress.certificatesHint")}
        />
      </section>

      <section className={cn(STUDIO_FORM_SHELL, "space-y-5")}>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t("progress.gradeHistory")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("progress.gradeHistoryDescription")}</p>
        </div>
        {data.gradeHistory.length ? (
          <ul className="space-y-3">
            {data.gradeHistory.map((item) => (
              <GradeHistoryRow key={`${item.type}-${item.id}`} item={item} />
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("progress.noGradeHistory")}</p>
        )}
      </section>

      <section className={cn(STUDIO_FORM_SHELL, "space-y-5")}>
        <div>
          <h2 className="text-base font-semibold tracking-tight text-foreground">{t("progress.recentActivity")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("progress.recentActivityDescription")}</p>
        </div>
        {data.recentActivity.length ? (
          <ul className="space-y-3">
            {data.recentActivity.map((item) => (
              <li key={item.id} className={cn(STUDIO_ROW, "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between")}>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                    <ActivityTypeBadge type={item.type} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.courseTitle} · {new Date(item.occurredAt).toLocaleString()}
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="h-9 shrink-0 rounded-md shadow-none">
                  <Link to={getCourseLearnPath(item.courseId)}>{t("progress.continue")}</Link>
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("progress.noRecentActivity")}</p>
        )}
      </section>
    </div>
  );
}
