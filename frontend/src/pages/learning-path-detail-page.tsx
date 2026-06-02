import { ArrowUpRight, BookOpen, Loader2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppShell } from "../components/app-shell";
import { CourseEnrollButton } from "../components/course-enroll-button";
import { EmptyState } from "../components/empty-state";
import { useAuth } from "../hooks/use-auth";
import { useLearningPath } from "../hooks/use-learning-paths";
import { useI18n } from "../i18n";
import { getCourseLearnPath } from "../lib/course-learn-path";
import { formatMoney, isPaidCourse } from "../lib/course-pricing";
import { toMediaUrl } from "../lib/media-url";
import { STUDIO_FORM_SHELL } from "../lib/studio-ui";

export function LearningPathDetailPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const { t, formatError } = useI18n();
  const { isAuthenticated } = useAuth();
  const pathQuery = useLearningPath(pathId);

  return (
    <AppShell
      title={pathQuery.data?.title ?? t("learningPaths.detailTitle")}
      subtitle={t("learningPaths.detailSubtitle")}
      actions={
        <Button asChild size="sm" variant="outline" className="rounded-lg shadow-none">
          <Link to="/learning-paths">{t("learningPaths.backToList")}</Link>
        </Button>
      }
    >
      {pathQuery.isLoading ? (
        <div className="flex min-h-40 items-center justify-center text-muted-foreground">
          <Loader2 className="size-5 animate-spin" aria-hidden />
          <span className="sr-only">{t("common.loading")}</span>
        </div>
      ) : null}

      {pathQuery.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {formatError(pathQuery.error, "errors.unexpected")}
        </div>
      ) : null}

      {pathQuery.data ? (
        <div className="space-y-8">
          <section className={STUDIO_FORM_SHELL}>
            {pathQuery.data.coverImageUrl ? (
              <div className="mb-5 overflow-hidden rounded-xl border border-border/70">
                <img
                  src={toMediaUrl(pathQuery.data.coverImageUrl)}
                  alt=""
                  className="aspect-[21/9] w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            ) : null}

            {pathQuery.data.description ? (
              <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{pathQuery.data.description}</p>
            ) : null}

            {isAuthenticated ? (
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10">
                  <p className="text-xs font-medium text-muted-foreground">{t("learningPaths.statsCourses")}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{pathQuery.data.courseCount}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10">
                  <p className="text-xs font-medium text-muted-foreground">{t("learningPaths.statsEnrolled")}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{pathQuery.data.enrolledCourseCount}</p>
                </div>
                <div className="rounded-lg bg-muted/40 px-4 py-3 ring-1 ring-foreground/10">
                  <p className="text-xs font-medium text-muted-foreground">{t("learningPaths.statsProgress")}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{pathQuery.data.averageProgress}%</p>
                </div>
              </div>
            ) : null}
          </section>

          <section className={STUDIO_FORM_SHELL}>
            <h2 className="text-base font-semibold tracking-tight text-foreground">{t("learningPaths.coursesInPath")}</h2>

            {!pathQuery.data.courses.length ? (
              <EmptyState icon={BookOpen} title={t("learningPaths.noCoursesTitle")} description={t("learningPaths.noCoursesDescription")} />
            ) : (
              <div className="mt-4 grid gap-4">
                {pathQuery.data.courses.map((entry, index) => {
                  const course = entry.course;
                  const paid = isPaidCourse(course.priceCents);

                  return (
                    <article
                      key={course.id}
                      className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/10 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-4">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background text-xs font-semibold text-muted-foreground ring-1 ring-foreground/10">
                          {index + 1}
                        </span>
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-foreground">{course.title}</h3>
                            {paid ? (
                              <span className="rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/10">
                                {formatMoney(course.priceCents, course.currency)}
                              </span>
                            ) : (
                              <span className="rounded-md bg-background px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-300">
                                {t("learningPaths.freeCourse")}
                              </span>
                            )}
                          </div>
                          {entry.isEnrolled ? (
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-muted-foreground">
                                {t("learningPaths.courseProgress").replace("{{percent}}", String(entry.progressPercent))}
                              </p>
                              <div
                                className="h-2 overflow-hidden rounded-full bg-muted ring-1 ring-foreground/10"
                                role="progressbar"
                                aria-valuenow={entry.progressPercent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                              >
                                <div
                                  className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                                  style={{ width: `${Math.min(100, Math.max(0, entry.progressPercent))}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">{t("learningPaths.notEnrolledYet")}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 md:justify-end">
                        <Button asChild size="sm" variant="outline" className="h-9 rounded-lg shadow-none">
                          <Link to={`/courses/${course.id}`}>{t("learningPaths.viewCourse")}</Link>
                        </Button>
                        {entry.isEnrolled ? (
                          <Button asChild size="sm" className="h-9 rounded-lg shadow-none">
                            <Link to={getCourseLearnPath(course.id)}>
                              {t("learningPaths.continueCourse")}
                              <ArrowUpRight className="ml-1 size-4" aria-hidden />
                            </Link>
                          </Button>
                        ) : isAuthenticated ? (
                          <CourseEnrollButton
                            courseId={course.id}
                            priceCents={course.priceCents}
                            currency={course.currency}
                            className="h-9 rounded-lg shadow-none"
                          />
                        ) : (
                          <Button asChild size="sm" className="h-9 rounded-lg shadow-none">
                            <Link to="/login">{t("courseDetail.signInToEnroll")}</Link>
                          </Button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
