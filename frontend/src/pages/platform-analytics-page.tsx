import { Activity, Award, BarChart3, Bell, BookOpen, ClipboardCheck, FileCheck2, GraduationCap, Layers3, RefreshCw, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { MetricCard } from "../components/metric-card";
import { MetricCardSkeleton, Skeleton } from "../components/skeleton";
import { usePlatformAnalytics } from "../hooks/use-platform-analytics";
import { useI18n } from "../i18n";

type BreakdownItem = {
  label: string;
  value: number;
};

function BreakdownCard({ items, title, totalLabel }: { title: string; totalLabel: string; items: BreakdownItem[] }) {
  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="rounded-lg border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {total} {totalLabel}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-muted-foreground">{item.label}</span>
                <span className="font-medium tabular-nums text-foreground">{item.value}</span>
              </div>
              <progress
                value={percent}
                max={100}
                aria-label={`${item.label} ${percent}%`}
                className="h-2 w-full overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-foreground [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-foreground"
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function BreakdownSkeleton() {
  return (
    <Card className="rounded-lg border-border/70 shadow-none">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-20" />
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function PlatformAnalyticsPage() {
  const { t, formatError } = useI18n();
  const [forceRefreshTick, setForceRefreshTick] = useState(0);
  const analyticsQuery = usePlatformAnalytics(forceRefreshTick);
  const data = analyticsQuery.data?.overview;
  const snapshotTime = useMemo(
    () => (analyticsQuery.data?.generatedAt ? new Date(analyticsQuery.data.generatedAt) : null),
    [analyticsQuery.data?.generatedAt]
  );
  const source = analyticsQuery.data?.source;

  return (
    <AppShell
      title={t("analytics.title")}
      subtitle={t("analytics.subtitle")}
      actions={
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => setForceRefreshTick((value) => value + 1)}
          disabled={analyticsQuery.isFetching}
        >
          <RefreshCw className={analyticsQuery.isFetching ? "size-4 animate-spin" : "size-4"} aria-hidden />
          {analyticsQuery.isFetching ? t("analytics.refreshing") : t("analytics.refresh")}
        </Button>
      }
    >
      <div className="space-y-5">
        {analyticsQuery.isError ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {formatError(analyticsQuery.error, "analytics.loadFailed")}
          </div>
        ) : null}

        {!analyticsQuery.isLoading && data && source ? (
          <section className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card px-4 py-3">
            <Badge variant={source === "live" ? "secondary" : "outline"} className="rounded-md">
              {source === "live" ? t("analytics.sourceLive") : t("analytics.sourceCache")}
            </Badge>
            {snapshotTime ? (
              <span className="text-sm text-muted-foreground">
                {t("analytics.lastUpdated")}{" "}
                <span className="font-medium text-foreground">
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  }).format(snapshotTime)}
                </span>
              </span>
            ) : null}
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("analytics.overview")}>
          {analyticsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <MetricCardSkeleton key={index} />)
          ) : (
            <>
              <MetricCard icon={Users} label={t("analytics.users")} value={data?.users.total ?? 0} hint={t("analytics.usersHint")} />
              <MetricCard icon={Layers3} label={t("analytics.courses")} value={data?.courses.total ?? 0} hint={t("analytics.coursesHint")} />
              <MetricCard icon={GraduationCap} label={t("analytics.enrollments")} value={data?.learning.enrollments ?? 0} hint={t("analytics.enrollmentsHint")} />
              <MetricCard icon={Award} label={t("analytics.certificates")} value={data?.certificates.total ?? 0} hint={t("analytics.certificatesHint")} />
            </>
          )}
        </section>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={t("analytics.learningSignals")}>
          {analyticsQuery.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => <MetricCardSkeleton key={index} />)
          ) : (
            <>
              <MetricCard icon={BookOpen} label={t("analytics.lessons")} value={data?.learning.lessons ?? 0} hint={`${data?.learning.completedLessons ?? 0} ${t("analytics.completedLessons")}`} />
              <MetricCard icon={Activity} label={t("analytics.completionSignal")} value={`${data?.learning.completionSignal ?? 0}%`} hint={t("analytics.completionSignalHint")} />
              <MetricCard icon={ClipboardCheck} label={t("analytics.examAttempts")} value={data?.assessments.examAttempts ?? 0} hint={t("analytics.examAttemptsHint")} />
              <MetricCard icon={FileCheck2} label={t("analytics.assignmentSubmissions")} value={data?.assessments.assignmentSubmissions ?? 0} hint={`${data?.assessments.lateAssignmentSubmissions ?? 0} ${t("analytics.lateSubmissions")}`} />
            </>
          )}
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label={t("analytics.breakdowns")}>
          {analyticsQuery.isLoading ? (
            <>
              <BreakdownSkeleton />
              <BreakdownSkeleton />
              <BreakdownSkeleton />
              <BreakdownSkeleton />
            </>
          ) : data ? (
            <>
              <BreakdownCard
                title={t("analytics.userRoles")}
                totalLabel={t("analytics.total")}
                items={[
                  { label: t("role.USER"), value: data.users.byRole.USER },
                  { label: t("role.INSTRUCTOR"), value: data.users.byRole.INSTRUCTOR },
                  { label: t("role.ADMIN"), value: data.users.byRole.ADMIN }
                ]}
              />
              <BreakdownCard
                title={t("analytics.courseStatuses")}
                totalLabel={t("analytics.total")}
                items={[
                  { label: t("courseStatus.DRAFT"), value: data.courses.byStatus.DRAFT },
                  { label: t("courseStatus.PUBLISHED"), value: data.courses.byStatus.PUBLISHED },
                  { label: t("courseStatus.ARCHIVED"), value: data.courses.byStatus.ARCHIVED },
                  { label: t("courseStatus.LOCKED"), value: data.courses.byStatus.LOCKED }
                ]}
              />
              <BreakdownCard
                title={t("analytics.assessmentStates")}
                totalLabel={t("analytics.total")}
                items={[
                  { label: t("examAttemptStatus.IN_PROGRESS"), value: data.assessments.examAttemptsByStatus.IN_PROGRESS },
                  { label: t("examAttemptStatus.SUBMITTED"), value: data.assessments.examAttemptsByStatus.SUBMITTED },
                  { label: t("examAttemptStatus.GRADED"), value: data.assessments.examAttemptsByStatus.GRADED }
                ]}
              />
              <BreakdownCard
                title={t("analytics.assignmentStates")}
                totalLabel={t("analytics.total")}
                items={[
                  { label: t("assignmentSubmissionStatus.SUBMITTED"), value: data.assessments.assignmentSubmissionsByStatus.SUBMITTED },
                  { label: t("assignmentSubmissionStatus.GRADED"), value: data.assessments.assignmentSubmissionsByStatus.GRADED }
                ]}
              />
            </>
          ) : null}
        </section>

        {!analyticsQuery.isLoading && data ? (
          <section className="grid gap-3 lg:grid-cols-2">
            <Card className="rounded-lg border-border/70 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Bell className="size-4" aria-hidden />
                  {t("analytics.operations")}
                </CardTitle>
                <CardDescription>{t("analytics.operationsDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-md px-2.5 py-1">
                  {data.operations.unreadNotifications} {t("analytics.unreadNotifications")}
                </Badge>
                <Badge variant="outline" className="rounded-md px-2.5 py-1">
                  {data.operations.auditLogs} {t("analytics.auditLogs")}
                </Badge>
              </CardContent>
            </Card>
            <Card className="rounded-lg border-border/70 shadow-none">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="size-4" aria-hidden />
                  {t("analytics.certificateStates")}
                </CardTitle>
                <CardDescription>{t("analytics.certificateStatesDescription")}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-md px-2.5 py-1">
                  {data.certificates.byStatus.ACTIVE} {t("certificateStatus.ACTIVE")}
                </Badge>
                <Badge variant="outline" className="rounded-md px-2.5 py-1">
                  {data.certificates.byStatus.REVOKED} {t("certificateStatus.REVOKED")}
                </Badge>
              </CardContent>
            </Card>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
