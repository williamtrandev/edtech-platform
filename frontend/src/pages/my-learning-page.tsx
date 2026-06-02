import { BookOpen, Compass, GraduationCap, Layers3, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { EmptyState } from "../components/empty-state";
import { MetricCard } from "../components/metric-card";
import { MyCoursePurchasesPanel } from "../components/my-course-purchases-panel";
import { UpcomingLiveSessionsPanel } from "../components/upcoming-live-sessions-panel";
import { MyLearningCourseCard } from "../components/my-learning-course-card";
import { MetricCardSkeleton } from "../components/skeleton";
import { useDropEnrollment, useMyEnrollments } from "../hooks/use-enrollments";
import { useI18n } from "../i18n";
import { STUDIO_FORM_SHELL, STUDIO_STAT } from "../lib/studio-ui";
import { cn } from "@/lib/utils";
import type { Enrollment } from "../services/enrollment.service";

export function MyLearningPage() {
  const { data, isLoading, isError } = useMyEnrollments();
  const dropEnrollmentMutation = useDropEnrollment();
  const [enrollmentPendingDrop, setEnrollmentPendingDrop] = useState<Enrollment | null>(null);
  const { t, formatError } = useI18n();

  const stats = useMemo(() => {
    const enrollments = data ?? [];
    const inProgress = enrollments.filter(
      (enrollment) => enrollment.progress && enrollment.progress.percentage > 0 && enrollment.progress.percentage < 100
    ).length;
    const completed = enrollments.filter(
      (enrollment) =>
        enrollment.progress && enrollment.progress.totalLessons > 0 && enrollment.progress.percentage >= 100
    ).length;

    return {
      total: enrollments.length,
      inProgress,
      completed
    };
  }, [data]);

  const confirmDropEnrollment = async () => {
    if (!enrollmentPendingDrop) {
      return;
    }

    try {
      await dropEnrollmentMutation.mutateAsync(enrollmentPendingDrop.id);
      setEnrollmentPendingDrop(null);
      toast.success(t("myLearning.dropEnrollmentSuccess"));
    } catch (e) {
      toast.error(formatError(e, "myLearning.dropEnrollmentFailed"));
    }
  };

  return (
    <AppShell
      title={t("myLearning.title")}
      subtitle={t("myLearning.subtitle")}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5 shadow-sm">
            <Link to="/learning-paths">
              <Layers3 className="size-4" aria-hidden />
              {t("nav.learningPaths")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="rounded-lg gap-1.5 shadow-sm">
            <Link to="/explore">
              <Compass className="size-4" aria-hidden />
              {t("myLearning.exploreCatalog")}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {isLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                icon={BookOpen}
                label={t("myLearning.enrolledCourses")}
                value={stats.total}
                hint={t("myLearning.enrolledCoursesHint")}
              />
              <MetricCard
                icon={TrendingUp}
                label={t("myLearning.inProgress")}
                value={stats.inProgress}
                hint={t("myLearning.inProgressHint")}
              />
              <MetricCard
                icon={GraduationCap}
                label={t("myLearning.completedCourses")}
                value={stats.completed}
                hint={t("myLearning.completedCoursesHint")}
              />
            </>
          )}
        </section>

        <UpcomingLiveSessionsPanel enabled={!isLoading && !isError} />

        <MyCoursePurchasesPanel enabled={!isLoading && !isError} />

        <section className={cn(STUDIO_FORM_SHELL, "space-y-5")}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-foreground">{t("myLearning.courseListTitle")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("myLearning.courseListDescription")}</p>
            </div>
            {!isLoading && !isError && data?.length ? (
              <div className={cn(STUDIO_STAT, "px-3 py-2 text-xs font-medium text-muted-foreground")}>
                {data.length} {t("myLearning.enrolledCount")}
              </div>
            ) : null}
          </div>

          <div className="grid auto-rows-fr gap-6 md:grid-cols-2 xl:grid-cols-3">
            {isLoading ? (
              <div className="contents">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[22rem] animate-pulse rounded-xl bg-muted/40 ring-1 ring-foreground/10"
                    aria-hidden
                  />
                ))}
              </div>
            ) : null}

            {isError ? (
              <div className="md:col-span-2 xl:col-span-3">
                <div className="rounded-xl bg-destructive/5 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20">
                  {t("myLearning.loadFailed")}
                </div>
              </div>
            ) : null}

            {!isLoading && !isError && data?.length
              ? data.map((enrollment) => (
                  <MyLearningCourseCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    continueLabel={t("myLearning.continue")}
                    viewProgressLabel={t("myLearning.viewProgress")}
                    dropLabel={t("myLearning.dropEnrollment")}
                    enrolledOnLabel={t("myLearning.enrolledOn")}
                    lessonsProgressLabel={t("myLearning.lessonsProgress")}
                    completeLabel={t("myLearning.progressComplete")}
                    dropDisabled={dropEnrollmentMutation.isPending}
                    onDrop={() => setEnrollmentPendingDrop(enrollment)}
                  />
                ))
              : null}

            {!isLoading && !isError && !data?.length ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  icon={BookOpen}
                  title={t("myLearning.emptyTitle")}
                  description={t("myLearning.emptyDescription")}
                  action={
                    <Button asChild className="rounded-lg" size="sm">
                      <Link to="/explore">{t("myLearning.browseCourses")}</Link>
                    </Button>
                  }
                />
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <AlertDialog open={Boolean(enrollmentPendingDrop)} onOpenChange={(open) => !open && setEnrollmentPendingDrop(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("myLearning.dropEnrollmentConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("myLearning.dropEnrollmentConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction disabled={dropEnrollmentMutation.isPending} onClick={() => void confirmDropEnrollment()}>
              {dropEnrollmentMutation.isPending ? t("myLearning.droppingEnrollment") : t("myLearning.dropEnrollment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}
