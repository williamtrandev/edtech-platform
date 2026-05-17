import { ArrowUpRight, BookOpen, FileText, GraduationCap, Layers, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppShell } from "../components/app-shell";
import { CourseStatusBadge } from "../components/course-status-badge";
import { EmptyState } from "../components/empty-state";
import { CourseListSkeleton } from "../components/skeleton";
import { COURSE_STATUS, USER_ROLE } from "../constants/business";
import { useAuth } from "../features/auth/auth-context";
import { useCourses } from "../features/course/hooks/use-courses";
import { useEnrollCourse } from "../features/enrollment/hooks/use-enrollments";
import { useCurrentUser } from "../features/user/hooks/use-current-user";
import { toMediaUrl } from "../lib/media-url";
import { type I18nKey, useI18n } from "../i18n";

export function CoursesPage() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const meQuery = useCurrentUser(isAuthenticated && !isBootstrapping);
  const { data, isLoading, isError, error } = useCourses();
  const enrollMutation = useEnrollCourse();
  const { t } = useI18n();

  const canCreateCourse = meQuery.data?.role === USER_ROLE.instructor || meQuery.data?.role === USER_ROLE.admin;
  const courses = data?.items ?? [];
  const publishedCount = courses.filter((course) => course.status === COURSE_STATUS.published).length;
  const draftCount = courses.filter((course) => course.status === COURSE_STATUS.draft).length;
  const stats = [
    { icon: Layers, label: t("courseStudio.total"), value: courses.length },
    { icon: GraduationCap, label: t("courseStudio.published"), value: publishedCount },
    { icon: FileText, label: t("courseStudio.drafts"), value: draftCount }
  ];

  return (
    <AppShell
      title={t("courseStudio.title")}
      subtitle={t("courseStudio.subtitle")}
      actions={
        canCreateCourse ? (
          <Button asChild size="sm" className="h-9 rounded-lg gap-1.5 px-3 shadow-none">
            <Link to="/courses/new">
              <Plus className="size-4" aria-hidden />
              {t("courseStudio.createCourse")}
            </Link>
          </Button>
        ) : null
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-3" aria-label="Course summary">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex items-center gap-3 rounded-lg border border-border/70 bg-card px-4 py-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-foreground">{isLoading ? "..." : item.value}</p>
                </div>
              </div>
            );
          })}
        </section>

        <section className="grid gap-6">
          <Card className="rounded-lg border-border/70 shadow-none">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="text-base">{t("courseStudio.courses")}</CardTitle>
                <CardDescription>{canCreateCourse ? t("courseStudio.manageDescription") : t("courseStudio.catalogDescription")}</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-9 rounded-lg px-3">
                <Link to="/explore">{t("courseStudio.viewCatalog")}</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? <CourseListSkeleton rows={5} /> : null}
              {isError ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {(error as Error).message}
                </div>
              ) : null}

              {!isLoading && !isError ? (
                courses.length ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {courses.map((course) => (
                      <article key={course.id} className="overflow-hidden rounded-lg border border-border/70 bg-card transition-colors hover:border-border">
                        <div className="relative aspect-video bg-muted/30">
                          {course.coverImageUrl ? (
                            <img src={toMediaUrl(course.coverImageUrl)} alt="" className="size-full object-cover" />
                          ) : (
                            <div className="grid size-full place-items-center text-muted-foreground">
                              <BookOpen className="size-7" aria-hidden />
                            </div>
                          )}
                          <div className="absolute left-3 top-3">
                            <CourseStatusBadge status={course.status} label={t(`courseStatus.${course.status}` as I18nKey)} />
                          </div>
                        </div>
                        <div className="grid min-h-44 gap-4 p-4">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-base font-semibold leading-6 text-foreground">{course.title}</h3>
                            <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                              {course.description || `${t("courseStudio.id")} ${course.id.slice(0, 8)}`}
                            </p>
                          </div>
                          <div className="mt-auto flex items-center justify-between gap-2">
                            {!canCreateCourse ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-md px-3"
                                disabled={enrollMutation.isPending || course.status !== COURSE_STATUS.published}
                                onClick={() => void enrollMutation.mutateAsync(course.id)}
                                type="button"
                              >
                                {t("courseStudio.enroll")}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">{t("courseStudio.id")} {course.id.slice(0, 8)}</span>
                            )}
                            <Button asChild size="sm" className="h-9 rounded-md gap-1.5 px-3">
                              <Link to={`/courses/${course.id}`}>
                                {t("courseStudio.open")}
                                <ArrowUpRight className="size-4" aria-hidden />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={BookOpen}
                    title={t("courseStudio.noCourses")}
                    description={canCreateCourse ? t("courseStudio.noCoursesCreate") : t("courseStudio.noCoursesBrowse")}
                  />
                )
              ) : null}
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
