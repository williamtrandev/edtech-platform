import { AlertTriangle, Clock3, History, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { I18nKey } from "../i18n";
import { useI18n } from "../i18n";
import type { CourseAnalytics, CourseCertificateHistoryEvent, CourseLearnerInsight } from "../services/course.service";

type CourseAnalyticsInsightsProps = {
  analytics: CourseAnalytics | undefined;
  isLoading: boolean;
};

function withCount(template: string, count: number) {
  return template.replace("{{count}}", String(count));
}

function withParams(template: string, params: Record<string, number>) {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{{${key}}}`, String(value)),
    template
  );
}

function insightBadgeVariant(status: CourseLearnerInsight["status"]) {
  if (status === "INACTIVE") {
    return "destructive" as const;
  }
  if (status === "STALLED") {
    return "secondary" as const;
  }
  return "outline" as const;
}

function formatDate(value: string | null) {
  if (!value) {
    return "—";
  }
  return new Date(value).toLocaleDateString();
}

function historyLabelKey(type: CourseCertificateHistoryEvent["type"]): I18nKey {
  if (type === "ISSUED") {
    return "courseDetail.certificateHistoryIssued";
  }
  if (type === "REVOKED") {
    return "courseDetail.certificateHistoryRevoked";
  }
  return "courseDetail.certificateHistoryRestored";
}

export function CourseAnalyticsInsights({ analytics, isLoading }: CourseAnalyticsInsightsProps) {
  const { t } = useI18n();
  const insights = analytics?.learnerInsights;
  const history = analytics?.certificateHistory ?? [];
  const criteria = analytics?.completionCriteria;

  return (
    <div className="mt-6 grid gap-4">
      {criteria ? (
        <div className="rounded-lg border border-border/70 bg-background px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("courseDetail.completionCriteriaTitle")}</p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {criteria.type === "FULL_COURSE_REQUIREMENTS"
              ? withParams(t("courseDetail.completionCriteriaFullRequirements"), {
                  lessons: criteria.lessonCount,
                  exams: criteria.examCount,
                  assignments: criteria.assignmentCount
                })
              : withCount(t("courseDetail.completionCriteriaAllLessons"), criteria.lessonCount)}
          </p>
        </div>
      ) : null}

      <section className="rounded-lg border border-border/70 bg-background px-4 py-4" aria-labelledby="learner-insights-heading">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="learner-insights-heading" className="text-sm font-semibold text-foreground">
              {t("courseDetail.learnerInsightsTitle")}
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("courseDetail.learnerInsightsDescription")}</p>
          </div>
          {!isLoading && insights ? (
            <div className="flex flex-wrap gap-2">
              <Badge variant="destructive" className="rounded-md">
                {withCount(t("courseDetail.learnerInsightsInactive"), insights.inactiveCount)}
              </Badge>
              <Badge variant="secondary" className="rounded-md">
                {withCount(t("courseDetail.learnerInsightsStalled"), insights.stalledCount)}
              </Badge>
              <Badge variant="outline" className="rounded-md">
                {withCount(t("courseDetail.learnerInsightsLowProgress"), insights.lowProgressCount)}
              </Badge>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : insights?.items.length ? (
          <ul className="mt-4 divide-y divide-border/70">
            {insights.items.map((item) => (
              <li key={item.userId} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <p className="truncate text-sm font-medium text-foreground">{item.email}</p>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("courseDetail.learnerInsightsEnrolled")} {formatDate(item.enrolledAt)}
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium tabular-nums text-foreground">
                    {item.progressPercent}% ({item.completedLessons}/{item.totalLessons})
                  </p>
                  <p className="mt-1 flex items-center gap-1 text-xs">
                    <Clock3 className="size-3.5 shrink-0" aria-hidden />
                    {t("courseDetail.learnerInsightsLastActivity")} {formatDate(item.lastActivityAt)}
                  </p>
                </div>
                <Badge variant={insightBadgeVariant(item.status)} className="w-fit rounded-md">
                  {t(`courseDetail.learnerInsightStatus.${item.status}` as I18nKey)}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t("courseDetail.learnerInsightsEmpty")}
          </p>
        )}
      </section>

      <section className="rounded-lg border border-border/70 bg-background px-4 py-4" aria-labelledby="certificate-history-heading">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" aria-hidden />
          <h3 id="certificate-history-heading" className="text-sm font-semibold text-foreground">
            {t("courseDetail.certificateHistoryTitle")}
          </h3>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("courseDetail.certificateHistoryDescription")}</p>

        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : history.length ? (
          <ol className="mt-4 space-y-3">
            {history.map((event) => (
              <li key={event.id} className="rounded-lg bg-muted/30 px-3 py-3 ring-1 ring-foreground/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{t(historyLabelKey(event.type))}</p>
                  <time className="text-xs text-muted-foreground" dateTime={event.occurredAt}>
                    {new Date(event.occurredAt).toLocaleString()}
                  </time>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{event.learnerEmail}</p>
                {event.actorEmail ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("courseDetail.certificateHistoryActor")} {event.actorEmail}
                  </p>
                ) : null}
                {event.verificationCode ? (
                  <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{event.verificationCode}</p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">{t("courseDetail.certificateHistoryEmpty")}</p>
        )}
      </section>
    </div>
  );
}
